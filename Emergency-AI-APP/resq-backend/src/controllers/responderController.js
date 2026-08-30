import Incident from '../models/Incident.js';
import Responder from '../models/Responder.js';
import { incidentDto } from '../utils/incidentDto.js';
import { kmBetween } from '../utils/geo.js';
import { emit } from '../realtime.js';

const populateIncident = (query) => query.populate({ path: 'assignedResponders', populate: { path: 'user', select: 'name' } });
const validCoordinates = ({ lat, lng } = {}) => Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))
  && Math.abs(Number(lat)) <= 90 && Math.abs(Number(lng)) <= 180;

async function currentResponder(userId) {
  return Responder.findOne({ user: userId }).populate('user', 'name email');
}

export async function profile(req, res) {
  const responder = await currentResponder(req.user._id);
  if (!responder) return res.status(404).json({ error: 'Responder profile not found' });
  return res.json({
    id: String(responder._id), code: responder.code, service: responder.service, availability: responder.availability,
    name: responder.user.name, location: responder.location?.coordinates ? { lng: responder.location.coordinates[0], lat: responder.location.coordinates[1] } : null,
    locationUpdatedAt: responder.locationUpdatedAt,
  });
}

export async function updateLocation(req, res) {
  if (!validCoordinates(req.body)) return res.status(400).json({ error: 'Valid latitude and longitude are required' });
  const responder = await Responder.findOneAndUpdate(
    { user: req.user._id },
    { location: { type: 'Point', coordinates: [Number(req.body.lng), Number(req.body.lat)] }, locationUpdatedAt: new Date() },
    { new: true },
  ).populate('user', 'name');
  if (!responder) return res.status(404).json({ error: 'Responder profile not found' });
  const payload = { id: String(responder._id), code: responder.code, name: responder.user.name, service: responder.service, availability: responder.availability, location: { lng: Number(req.body.lng), lat: Number(req.body.lat) } };
  emit('admins', 'responder:location', payload);
  return res.json(payload);
}

export async function updateAvailability(req, res) {
  if (!['available', 'offline'].includes(req.body.availability)) return res.status(400).json({ error: 'Availability must be available or offline' });
  const responder = await Responder.findOne({ user: req.user._id });
  if (!responder) return res.status(404).json({ error: 'Responder profile not found' });
  const activeAssignment = await Incident.exists({ assignedResponders: responder._id, status: { $ne: 'resolved' } });
  if (activeAssignment) return res.status(409).json({ error: 'Resolve or transfer your active incident before changing availability' });
  if (req.body.availability === 'available' && !responder.location?.coordinates?.length) return res.status(400).json({ error: 'Share a live location before becoming available' });
  responder.availability = req.body.availability;
  await responder.save();
  emit('admins', 'responder:updated', { id: String(responder._id), availability: responder.availability });
  return res.json({ availability: responder.availability });
}

export async function queue(req, res) {
  const responder = await currentResponder(req.user._id);
  if (!responder) return res.status(404).json({ error: 'Responder profile not found' });
  // Every responder sees the live open queue. The UI identifies service
  // matches, and `accept` enforces that only a required service can claim it.
  const incidents = await populateIncident(Incident.find({ status: { $ne: 'resolved' } }).sort('-createdAt'));
  const origin = responder.location?.coordinates;
  return res.json(incidents.map((incident) => {
    const target = incident.location.point.coordinates;
    const distanceKm = origin ? kmBetween(origin, target) : null;
    return incidentDto(incident, {
      distanceKm,
      serviceMatch: incident.requiredServices.includes(responder.service),
      assignedToMe: incident.assignedResponders.some((unit) => String(unit._id) === String(responder._id)),
    });
  }));
}

export async function accept(req, res) {
  const responder = await currentResponder(req.user._id);
  if (!responder) return res.status(404).json({ error: 'Responder profile not found' });
  if (responder.availability !== 'available') return res.status(409).json({ error: 'Set your status to available before accepting an incident' });
  const incident = await populateIncident(Incident.findOneAndUpdate(
    {
      incidentNo: Number(req.params.number),
      status: { $in: ['reported', 'dispatched'] },
      requiredServices: responder.service,
      assignedResponders: { $ne: responder._id },
      'assignments.responder': { $ne: responder._id },
      'assignments.service': { $ne: responder.service },
    },
    {
      $addToSet: { assignedResponders: responder._id },
      $set: { status: 'dispatched' },
      $push: { assignments: { responder: responder._id, service: responder.service }, statusHistory: { status: 'dispatched', by: req.user._id } },
    },
    { new: true },
  ));
  if (!incident) {
    const target = await Incident.findOne({ incidentNo: Number(req.params.number) }).select('requiredServices assignments');
    if (!target) return res.status(404).json({ error: 'Incident not found' });
    if (!target.requiredServices.includes(responder.service)) return res.status(403).json({ error: 'Your response service is not required for this incident' });
    if (target.assignments?.some((assignment) => assignment.service === responder.service)) return res.status(409).json({ error: `A ${responder.service} responder has already accepted this incident` });
    return res.status(409).json({ error: 'This incident is no longer available to accept' });
  }
  responder.availability = 'assigned';
  await responder.save();
  const populated = await populateIncident(Incident.findById(incident._id));
  const dto = incidentDto(populated, { assignedToMe: true });
  emit('responders', 'incident:updated', dto); emit('admins', 'incident:updated', dto);
  populated.reports.forEach((report) => emit(`user:${report.reporter}`, 'incident:updated', dto));
  return res.json(dto);
}
