import { Router } from 'express';
import { accept, profile, queue, updateAvailability, updateLocation } from '../controllers/responderController.js';
import { getResponderIncident, setIncidentStatus } from '../controllers/incidentController.js';
import { requireAuth, useWorkspaceRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, useWorkspaceRole('responder'));
router.get('/me', profile);
router.patch('/me/location', updateLocation);
router.patch('/me/availability', updateAvailability);
router.get('/incidents', queue);
router.get('/incidents/:number', getResponderIncident);
router.post('/incidents/:number/accept', accept);
router.patch('/incidents/:number/status', setIncidentStatus);
export default router;
