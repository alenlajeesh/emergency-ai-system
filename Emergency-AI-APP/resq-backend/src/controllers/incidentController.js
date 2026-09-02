import Incident from '../models/Incident.js';
import Responder from '../models/Responder.js';
import AuditLog from '../models/AuditLog.js';
import { analyzeText, missingFields, recommendation } from '../utils/analysis.js';
import { nextIncidentNumber } from '../utils/counter.js';
import { incidentDto } from '../utils/incidentDto.js';
import { emit } from '../realtime.js';

const populateIncident = (query) => query.populate({ path: 'assignedResponders', populate: { path: 'user', select: 'name' } });
const locationIsValid = (location) => Number.isFinite(Number(location?.lat)) && Number.isFinite(Number(location?.lng))
  && Math.abs(Number(location.lat)) <= 90 && Math.abs(Number(location.lng)) <= 180;

async function notifyIncident(kind, incident) {
  const dto = incidentDto(incident);
  const reporterIds = [...new Set(incident.reports.map((report) => String(report.reporter)))];
  emit('responders', kind, dto);
  emit('admins', kind, dto);
  reporterIds.forEach((id) => emit(`user:${id}`, kind, dto));
  (incident.assignedResponders || []).forEach((responder) => responder.user && emit(`user:${responder.user._id}`, kind, dto));
}

export async function preview(req, res) {
  const text = req.body.text?.trim();
  if (!text) return res.status(400).json({ error: 'Describe the emergency first' });
  const triage = await analyzeText(text);
  return res.json({
    category: triage.category,
    severity: triage.severity,
    confidence: triage.confidence,
    requiredServices: triage.requiredServices,
    manualVerification: triage.manualVerification,
  });
}

export async function create(req, res) {
  const { text, reportMode = 'text', location, imageUrl } = req.body;
  if (!text?.trim() || !location?.label?.trim() || !locationIsValid(location)) {
    return res.status(400).json({ error: 'A description and a valid current location are required' });
  }

  const point = [Number(location.lng), Number(location.lat)];
  const triage = await analyzeText(text);
  const recentTime = new Date(Date.now() - (10 * 60 * 1000));
  const duplicate = await populateIncident(Incident.findOne({
    'location.point': { $near: { $geometry: { type: 'Point', coordinates: point }, $maxDistance: 200 } },
    createdAt: { $gte: recentTime },
    status: { $ne: 'resolved' },
  }));

  if (duplicate && duplicate.category === triage.category) {
    duplicate.reports.push({ reporter: req.user._id, text: text.trim(), mode: reportMode, imageUrl });
    await duplicate.save();
    await notifyIncident('incident:updated', duplicate);
    return res.status(200).json({ ...incidentDto(duplicate), mergedWithExisting: true });
  }

  const incident = await Incident.create({
    incidentNo: await nextIncidentNumber(),
    reports: [{ reporter: req.user._id, text: text.trim(), mode: reportMode, imageUrl }],
    category: triage.category,
    severity: triage.severity,
    confidence: triage.confidence,
    requiredServices: triage.requiredServices,
    location: { label: location.label.trim(), point: { type: 'Point', coordinates: point } },
    recommendedAction: recommendation[triage.category],
    missingFields: missingFields[triage.category],
    manualVerification: triage.manualVerification,
    statusHistory: [{ status: 'reported', by: req.user._id }],
  });
  // Only notify response services required by this incident. Every responder
  // still receives status updates later if they are assigned to it.
  await AuditLog.create({ actor: req.user._id, action: 'incident.created', target: String(incident._id) });
  const populated = await populateIncident(Incident.findById(incident._id));
  await notifyIncident('incident:created', populated);
  return res.status(201).json(incidentDto(populated));
}

export async function listCitizenIncidents(req, res) {
  const incidents = await populateIncident(Incident.find({ 'reports.reporter': req.user._id }).sort('-createdAt'));
  return res.json(incidents.map(incidentDto));
}

export async function getCitizenIncident(req, res) {
  const incident = await populateIncident(Incident.findOne({ incidentNo: Number(req.params.number), 'reports.reporter': req.user._id }));
  if (!incident) return res.status(404).json({ error: 'Incident not found' });
  return res.json(incidentDto(incident));
}

export async function getResponderIncident(req, res) {
  const responder = await Responder.findOne({ user: req.user._id });
  if (!responder) return res.status(403).json({ error: 'Responder profile not found' });
  const incident = await populateIncident(Incident.findOne({ incidentNo: Number(req.params.number), status: { $ne: 'resolved' } }));
  if (!incident) return res.status(404).json({ error: 'Incident not found' });
  return res.json(incidentDto(incident));
}

async function returnRespondersToAvailable(responderIds) {
  for (const responderId of responderIds) {
    const stillAssigned = await Incident.exists({ assignedResponders: responderId, status: { $ne: 'resolved' } });
    if (!stillAssigned) await Responder.findByIdAndUpdate(responderId, { availability: 'available' });
  }
}

const statusRank = { reported: 0, dispatched: 1, en_route: 2, arrived: 3, resolved: 4 };

export async function setIncidentStatus(req, res) {
  const status = req.body.status;
  const allowed = ['dispatched', 'en_route', 'arrived', 'resolved'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid incident status' });
  const incident = await populateIncident(Incident.findOne({ incidentNo: Number(req.params.number) }));
  if (!incident) return res.status(404).json({ error: 'Incident not found' });
  const responder = req.workspaceRole === 'responder' ? await Responder.findOne({ user: req.user._id }) : null;
  if (responder && !incident.assignedResponders.some((unit) => String(unit._id) === String(responder._id))) {
    return res.status(403).json({ error: 'Only an assigned responder can update this incident' });
  }
  if (statusRank[status] < statusRank[incident.status]) return res.status(409).json({ error: 'Incident status cannot move backward' });
  if (status === incident.status) return res.json(incidentDto(incident));
  incident.status = status;
  incident.statusHistory.push({ status, by: req.user._id });
  await incident.save();
  if (status === 'resolved') await returnRespondersToAvailable(incident.assignedResponders.map((unit) => unit._id));
  const populated = await populateIncident(Incident.findById(incident._id));
  await notifyIncident('incident:updated', populated);
  return res.json(incidentDto(populated));
}
