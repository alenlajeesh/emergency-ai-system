"""
Fixes + expands data/dataset.json -> data/dataset_augmented.json

Problems in the raw data this addresses:
1. A few "other"-category rows are actually fire/medical/disaster
   emergencies (gas leak, arcing power line, chemical exposure, bridge
   failure) which taught the model the wrong category -> wrong dispatch.
2. Every row is a full, clean, grammatical sentence. Real users type
   2-4 word panicked messages ("gas leak", "he's not breathing", "fire
   help"). The model has never seen that shape of input, so it guesses
   badly on it. We add ~90 short realistic phrases.
3. No noise. We generate typo/paraphrase variants of every row so the
   model stops relying on exact wording and starts using word-level
   signal that survives misspellings.
4. Exact-duplicate rows (the raw data repeats several sentences
   verbatim). Left alone, a duplicate can land on both sides of the
   train/test split and inflate the eval score with a leak that looks
   like real accuracy. Deduped before splitting.

Run: python augment.py   (writes dataset_augmented.json +
                           dataset_test_holdout.json into data/)
"""
import json
import random
import re
from pathlib import Path

random.seed(42)
HERE = Path(__file__).parent
DATA_DIR = HERE / "data"

# NOTE: this was "dataset_raw.json" in the original script, which doesn't
# exist in this repo — that mismatch is why running augment.py crashed.
# Point this at whatever file actually holds your hand-labeled source
# data (currently data/dataset.json).
RAW_FILE = DATA_DIR / "dataset.json"

if not RAW_FILE.exists():
    raise FileNotFoundError(
        f"{RAW_FILE} not found. Update RAW_FILE above to match your "
        "actual source-data filename."
    )

with open(RAW_FILE) as f:
    data = json.load(f)

# ---------------------------------------------------------------------------
# 0) Dedupe EXACT duplicate rows before splitting (see docstring above).
# ---------------------------------------------------------------------------
seen = set()
deduped = []
for row in data:
    key = row["text"].strip().lower()
    if key not in seen:
        seen.add(key)
        deduped.append(row)
print(f"deduped {len(data) - len(deduped)} exact-duplicate rows "
      f"({len(data)} -> {len(deduped)})")
data = deduped

# ---------------------------------------------------------------------------
# 1) Split RAW data into train/test BEFORE any augmentation. This is the
#    critical fix: if you augment first and split after, near-duplicate
#    variants of the same sentence land on both sides of the split and the
#    model "generalizes" by recognizing its own sibling — that's why you
#    saw suspiciously perfect scores. It wasn't learning, it was leaking.
#    The test set below is held out untouched (no typos/synonyms/terse
#    additions) so its score reflects real generalization.
# ---------------------------------------------------------------------------
from sklearn.model_selection import train_test_split

cats = [r["category"] for r in data]
train_raw, test_raw = train_test_split(
    data, test_size=0.15, random_state=42, stratify=cats
)
with open(DATA_DIR / "dataset_test_holdout.json", "w") as f:
    json.dump(test_raw, f, indent=2)
print(f"held out {len(test_raw)} untouched rows -> dataset_test_holdout.json")

data = train_raw  # only the training portion gets augmented from here on

# ---------------------------------------------------------------------------
# 2) Fix mislabeled rows (category was "other" but the situation clearly
#    belongs to fire/disaster and needs those services dispatched).
# ---------------------------------------------------------------------------
RELABEL = {
    "Large gas leak with people feeling ill": "fire",
    "Downed live power line is arcing near pedestrians": "fire",
    "Elevator occupants report smoke and difficulty breathing": "fire",
    "Unknown chemical is causing multiple people to collapse": "disaster",
    "Bridge railing failure has left people in immediate danger": "disaster",
    "Strong gas smell outside, source unknown but no symptoms reported": "fire",
}
for row in data:
    if row["text"] in RELABEL:
        row["category"] = RELABEL[row["text"]]

# ---------------------------------------------------------------------------
# 3) Short, terse, real-world-style reports (how people actually type
#    when panicking) — the biggest gap in the original data.
# ---------------------------------------------------------------------------
TERSE = [
    ("gas leak", "fire", "critical"),
    ("gas leak help", "fire", "critical"),
    ("smell gas everywhere", "fire", "critical"),
    ("fire help", "fire", "critical"),
    ("house on fire", "fire", "critical"),
    ("building burning people inside", "fire", "critical"),
    ("smoke everywhere cant see", "fire", "critical"),
    ("he's not breathing", "medical", "critical"),
    ("she is not breathing help", "medical", "critical"),
    ("not breathing please help", "medical", "critical"),
    ("people dying help now", "medical", "critical"),
    ("someone dying please come", "medical", "critical"),
    ("he collapsed not moving", "medical", "critical"),
    ("no pulse cpr", "medical", "critical"),
    ("choking cant breathe", "medical", "critical"),
    ("heart attack help", "medical", "critical"),
    ("baby not breathing", "medical", "critical"),
    ("overdose unconscious", "medical", "critical"),
    ("bleeding a lot help", "medical", "critical"),
    ("stabbed bleeding badly", "security", "critical"),
    ("gun someone shooting", "security", "critical"),
    ("man with knife attacking", "security", "critical"),
    ("hostage situation help", "security", "critical"),
    ("armed robbery happening now", "security", "critical"),
    ("break in happening now", "security", "critical"),
    ("flood water rising fast", "disaster", "critical"),
    ("building collapsed people trapped", "disaster", "critical"),
    ("earthquake building down", "disaster", "critical"),
    ("explosion big fire", "disaster", "critical"),
    ("car crash people trapped", "accident", "critical"),
    ("truck flipped driver stuck", "accident", "critical"),
    ("bike hit by car unconscious", "accident", "critical"),
    ("child missing near river", "missing", "critical"),
    ("kid lost near traffic", "missing", "critical"),
    ("elderly wandered off storm coming", "missing", "critical"),
    ("small cut fine now", "medical", "low"),
    ("minor headache", "medical", "low"),
    ("scraped my knee", "medical", "low"),
    ("fender bender no injuries", "accident", "low"),
    ("flat tire not urgent", "accident", "low"),
    ("smoke smell but no fire", "fire", "low"),
    ("noise complaint next door", "security", "low"),
    ("lost wallet", "other", "low"),
    ("power outage in my street", "other", "low"),
    ("pothole on main road", "other", "low"),
    ("dog stuck in a small hole", "other", "low"),
    ("bruised arm from a fall", "medical", "low"),
    ("car scratched in parking lot", "accident", "low"),
    ("late coming home dont worry", "missing", "low"),
    ("small kitchen fire put out already", "fire", "low"),
    ("minor argument settled now", "security", "low"),
    ("light rain flooding on road", "disaster", "low"),
    ("kid separated from parent found now", "missing", "low"),
    ("broken arm need ambulance", "medical", "medium"),
    ("fell off bike hurt leg", "accident", "medium"),
    ("small fire in bin contained", "fire", "medium"),
    ("someone following me feels unsafe", "security", "medium"),
    ("cracks in wall after tremor", "disaster", "medium"),
    ("grandma not answering phone worried", "missing", "medium"),
    ("high fever wont go down", "medical", "medium"),
    ("two cars collided minor injuries", "accident", "medium"),
    ("smoke from wiring in wall", "fire", "medium"),
    ("stranger trying door handles", "security", "medium"),
    ("street flooding cant drive through", "disaster", "medium"),
    ("teen not home since morning", "missing", "medium"),
    ("dizzy and weak but conscious", "medical", "medium"),
    ("burnt hand from stove", "medical", "medium"),
    ("dog bit someone need treatment", "medical", "medium"),
    ("shed caught fire no one inside", "fire", "medium"),
    ("phone stolen suspect ran off", "security", "medium"),
    ("power line down no one near", "other", "medium"),
    ("water pipe burst flooding street", "other", "medium"),
    ("cat stuck on roof", "other", "low"),
    ("emergency emergency help now", "other", "critical"),
    ("send help now urgent", "other", "critical"),
    ("please hurry someone hurt bad", "medical", "critical"),
    ("cant wake him up", "medical", "critical"),
    ("massive bleeding wont stop", "medical", "critical"),
    ("everyone run fire spreading fast", "fire", "critical"),
    ("trapped inside cant get out fire", "fire", "critical"),
    ("gas smell strong getting worse", "fire", "critical"),
    ("man collapsed on the street", "medical", "critical"),
    ("multiple injured pileup on highway", "accident", "critical"),
    ("shots fired downtown", "security", "critical"),
    ("river rising fast near houses", "disaster", "critical"),
    ("knife to my head", "security", "critical"),
    ("someone holding a knife to my head", "security", "critical"),
    ("he has a gun in his hand", "security", "critical"),
    ("man pointing gun at me", "security", "critical"),
    ("my leg is broken", "medical", "medium"),
    ("leg is broken need help", "medical", "medium"),
    ("arm broken bone sticking out", "medical", "critical"),
    ("think my bone is broken", "medical", "medium"),
    ("fell in a hole cant get out", "accident", "medium"),
    ("stuck in a hole need help", "accident", "medium"),
    ("trapped in a hole after i fell", "accident", "critical"),
]
for text, cat, sev in TERSE:
    data.append({"text": text, "category": cat, "severity": sev})

# ---------------------------------------------------------------------------
# 4) Noise/paraphrase augmentation: typo injection + synonym swap.
#    Roughly triples the dataset so the model relies on scattered keyword
#    signal instead of memorizing exact clean sentences.
# ---------------------------------------------------------------------------
SYNONYMS = {
    "unconscious": ["not responsive", "passed out", "knocked out"],
    "breathing": ["breathin", "breath"],
    "fire": ["flames", "burning"],
    "bleeding": ["blood loss", "losing blood"],
    "help": ["please help", "need help", "assist"],
    "trapped": ["stuck", "can't get out"],
    "weapon": ["gun", "knife"],
    "collapsed": ["fell down", "went down", "dropped"],
    "missing": ["lost", "can't find", "disappeared"],
    "injured": ["hurt", "wounded"],
    "severe": ["serious", "bad", "extreme"],
    "minor": ["small", "slight"],
    "vehicle": ["car", "truck"],
    "person": ["man", "woman", "someone"],
}


def synonym_variant(text):
    words = text.split()
    idxs = [i for i, w in enumerate(words) if w.lower().strip(",.!;") in SYNONYMS]
    if not idxs:
        return None
    i = random.choice(idxs)
    key = words[i].lower().strip(",.!;")
    words[i] = random.choice(SYNONYMS[key])
    return " ".join(words)


def typo_variant(text):
    chars = list(text)
    n_edits = max(1, len(chars) // 25)
    for _ in range(n_edits):
        if len(chars) < 4:
            break
        i = random.randint(1, len(chars) - 2)
        op = random.choice(["swap", "drop", "dup"])
        if op == "swap" and chars[i].isalpha() and chars[i + 1].isalpha():
            chars[i], chars[i + 1] = chars[i + 1], chars[i]
        elif op == "drop":
            chars.pop(i)
        elif op == "dup":
            chars.insert(i, chars[i])
    return "".join(chars)


def lowercase_no_punct(text):
    return re.sub(r"[^\w\s]", "", text.lower())


augmented = list(data)
for row in data:
    text, cat, sev = row["text"], row["category"], row["severity"]

    syn = synonym_variant(text)
    if syn and syn != text:
        augmented.append({"text": syn, "category": cat, "severity": sev})

    augmented.append({"text": typo_variant(text), "category": cat, "severity": sev})
    augmented.append({"text": lowercase_no_punct(text), "category": cat, "severity": sev})

random.shuffle(augmented)
with open(DATA_DIR / "dataset_augmented.json", "w") as f:
    json.dump(augmented, f, indent=2)

print(f"raw (train portion): {len(data)} rows -> augmented: {len(augmented)} rows")