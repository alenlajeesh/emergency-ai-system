import { Router } from 'express';
import { computeRoute, reverseGeocode } from '../controllers/mapsController.js';
import { allowRoles, requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
router.get('/reverse-geocode', reverseGeocode);
router.post('/route', allowRoles('responder', 'admin'), computeRoute);
export default router;
