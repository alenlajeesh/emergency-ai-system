import Incident from '../models/Incident.js';
import Responder from '../models/Responder.js';
import User from '../models/User.js';
import { incidentDto } from '../utils/incidentDto.js';

const populateIncident = (query) => query.populate({ path: 'assignedResponders', populate: { path: 'user', select: 'name' } });

export async function incidents(req, res) {
  const filter = {}; if (req.query.status) filter.status = req.query.status;
  const items = await populateIncident(Incident.find(filter).sort('-createdAt'));
  return res.json(items.map(incidentDto));
}

export async function responders(req, res) {
  const units = await Responder.find().populate('user', 'name email').sort('service code');
  return res.json(units.map((unit) => ({
    id: String(unit._id), code: unit.code, service: unit.service, availability: unit.availability,
    name: unit.user?.name || unit.code, email: unit.user?.email, location: unit.location?.coordinates ? { lng: unit.location.coordinates[0], lat: unit.location.coordinates[1] } : null,
    locationUpdatedAt: unit.locationUpdatedAt,
  })));
}

export async function dashboard(req, res) {
  const [total, active, critical, citizens, responders, byCategory, hotspots] = await Promise.all([
    Incident.countDocuments(), Incident.countDocuments({ status: { $ne: 'resolved' } }), Incident.countDocuments({ severity: 'critical', status: { $ne: 'resolved' } }),
    User.countDocuments({ $or: [{ roles: 'citizen' }, { roles: { $exists: false }, role: 'citizen' }] }), Responder.countDocuments(),
    Incident.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
    Incident.aggregate([{ $group: { _id: '$location.label', incidents: { $sum: 1 }, critical: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } } } }, { $sort: { incidents: -1 } }, { $limit: 5 }]),
  ]);
  return res.json({ total, active, critical, citizens, responders, byCategory, hotspots });
}
