import { Router } from 'express';
import { dashboard, incidents, responders } from '../controllers/adminController.js';
import { setIncidentStatus } from '../controllers/incidentController.js';
import { requireAuth, useWorkspaceRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, useWorkspaceRole('admin'));
router.get('/dashboard', dashboard);
router.get('/incidents', incidents);
router.get('/responders', responders);
router.patch('/incidents/:number/status', setIncidentStatus);
export default router;
