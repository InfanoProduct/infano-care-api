import { Router } from 'express';
import { SafetyController } from './safety.controller.js';
import { authenticate } from '../../common/middleware/auth.js';

const router = Router();

// Crisis Resources
router.get('/crisis-resources', authenticate, SafetyController.getCrisisResources);

// Trusted Contacts
router.get('/trusted-contacts', authenticate, SafetyController.getTrustedContacts);
router.post('/trusted-contacts', authenticate, SafetyController.addTrustedContact);
router.delete('/trusted-contacts/:id', authenticate, SafetyController.deleteTrustedContact);
router.put('/trusted-contacts/:id/emergencies', authenticate, SafetyController.updateContactEmergencies);

// SOS Preferences
router.get('/preferences', authenticate, SafetyController.getPreferences);
router.put('/preferences', authenticate, SafetyController.savePreferences);

// SOS Actions
router.get('/sos/active', authenticate, SafetyController.getActiveIncident);
router.post('/sos/trigger', authenticate, SafetyController.triggerSos);
router.post('/sos/test', authenticate, SafetyController.testSos);
router.post('/sos/test-push', authenticate, SafetyController.testPushNotification);
router.post('/sos/:id/cancel', authenticate, SafetyController.cancelSos);
router.post('/sos/:id/resolve', authenticate, SafetyController.resolveSos);
router.post('/sos/:id/location', authenticate, SafetyController.updateLocation);

export default router;
