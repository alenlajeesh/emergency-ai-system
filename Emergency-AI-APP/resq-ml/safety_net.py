"""
Shared safety-net logic used by both serve.py (the real API) and
try_it.py (manual testing), so the two can never silently drift apart
the way they did before (each had its own copy-pasted regex list).

This module owns:

- CRITICAL_RE: keyword patterns that force severity to "critical"
  regardless of what the ML model predicts. Escalate-only, by design:
  a false "this is more urgent than the model thinks" costs a
  dispatcher a few seconds of double-checking; a false "this is less
  urgent than it is" can cost a life. So the net only ever raises
  severity, never lowers it.

- REQUIRED_SERVICES: a static category -> services-to-dispatch table.
  This is a policy decision, not something the model infers, and
  should be reviewed/approved by actual emergency-dispatch staff, not
  just left as a developer's best guess.

- LOW_CONFIDENCE widening: if the model isn't confident about the
  category, don't trust a narrow single-category service list — widen
  the net to also include medical + security.
"""
import re
from typing import List, Tuple

CRITICAL_PATTERNS = [
    r"\bnot\s*breath\w*", r"\bno\s*pulse\b", r"\bunconscious\w*", r"\bunresponsive\b",
    r"\bwon'?t\s*wake\s*up\b", r"\bcardiac\s*arrest\b", r"\bstopped\s*breath\w*",
    r"\bdying\b", r"\bdead\b", r"\bcollapsed?\b",
    r"\bgas\s*leak\b", r"\bexplosion\b", r"\btrapped\b", r"\bstuck\b.*\bcan'?t\s*get\s*out\b",
    r"\bgun\b", r"\bweapon\b", r"\bstabb\w*", r"\bshoot\w*", r"\bshot\b", r"\bhostage\b",
    r"\bdrown\w*", r"\boverdose\b", r"\bseizure\b", r"\bstroke\b",
    r"\bsevere\s*bleed\w*", r"\bheavy\s*bleed\w*", r"\bbleed\w*\s*(a\s*lot|badly|heavily)\b",
    r"\bchest\s*pain\b", r"\bthroat\s*swell\w*", r"\bcan'?t\s*breath\w*", r"\bcannot\s*breath\w*",
    r"\bflames\b", r"\bburning\b", r"\bfire\b",
    r"\bbuilding\s*collapse\w*", r"\bpeople\s*trapped\b",
    r"\bemergency\s*emergency\b", r"\bsend\s*help\s*now\b", r"\bhurry\b.*\bhurt\b",
]
CRITICAL_RE = re.compile("|".join(CRITICAL_PATTERNS), re.IGNORECASE)

REQUIRED_SERVICES = {
    "medical": ["medical"],
    "accident": ["medical", "security"],
    "fire": ["fire", "medical"],
    "security": ["security"],
    "disaster": ["fire", "medical", "security"],
    "missing": ["security"],
    "other": ["security"],
}

LOW_CONFIDENCE = 0.5


def apply_safety_net(
    text: str,
    category: str,
    category_confidence: float,
    second_category: str,
    severity: str,
) -> Tuple[str, List[str], bool]:
    """
    Returns (final_severity, required_services, was_forced).

    `second_category` is the model's second-choice category — pass the
    same value as `category` if you don't have one, that's a no-op.
    """
    forced = False
    if CRITICAL_RE.search(text.lower()) and severity != "critical":
        severity, forced = "critical", True

    if category_confidence < LOW_CONFIDENCE:
        required = sorted(
            {
                s
                for c in (category, second_category)
                for s in REQUIRED_SERVICES.get(c, ["security"])
            }
            | {"medical", "security"}
        )
    else:
        required = REQUIRED_SERVICES.get(category, ["security"])

    return severity, required, forced