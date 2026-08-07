import { Router } from 'express';
import { SafetyController } from './safety.controller.js';
import { authenticate } from '../../common/middleware/auth.js';

const router = Router();

// Existing Routes
router.get('/crisis-resources', authenticate, SafetyController.getCrisisResources);

// Trusted Contacts Routes
router.get('/trusted-contacts', authenticate, SafetyController.getTrustedContacts);
router.post('/trusted-contacts', authenticate, SafetyController.addTrustedContact);
router.delete('/trusted-contacts/:id', authenticate, SafetyController.deleteTrustedContact);
router.put('/trusted-contacts/:id/emergencies', authenticate, SafetyController.updateContactEmergencies);

// SOS Routes
router.post('/sos/trigger', authenticate, SafetyController.triggerSos);
router.post('/sos/:id/cancel', authenticate, SafetyController.cancelSos);
router.post('/sos/:id/resolve', authenticate, SafetyController.resolveSos);
router.post('/sos/:id/location', authenticate, SafetyController.updateLocation);

export default router;
