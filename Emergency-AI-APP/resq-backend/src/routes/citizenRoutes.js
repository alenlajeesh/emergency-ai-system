import { Router } from 'express';
import { create, getCitizenIncident, listCitizenIncidents, preview } from '../controllers/incidentController.js';
import { requireAuth, useWorkspaceRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, useWorkspaceRole('citizen'));
router.post('/triage-preview', preview);
router.get('/incidents', listCitizenIncidents);
router.post('/incidents', create);
router.get('/incidents/:number', getCitizenIncident);
export default router;
