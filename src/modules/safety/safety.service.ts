import { prisma } from '../../db/client.js';
import { smsProvider } from '../auth/sms.service.js';
import { logger } from '../../config/logger.js';
import { FirebaseService } from '../../common/services/firebase.service.js';
import { normalizePhone } from '../../common/utils/phone.js';

const EMERGENCY_TYPE_LABELS: Record<string, string> = {
  physical_threat: 'Physical Threat / Harassment',
  medical_emergency: 'Medical Emergency',
  mental_distress: 'Mental / Emotional Crisis',
  safe_walk: 'Safe Walk Check-In',
};

export class SafetyService {
  async getCrisisResources(locale: string = 'en-IN') {
    if (locale === 'en-IN') {
      return {
        helplines: [
          {
            id: 'vandrevala',
            name: 'Vandrevala Foundation',
            phone: '9999666555',
            sms: '9999666555',
            hours: '24/7',
            description: 'Free counseling via phone and chat.',
            url: 'https://www.vandrevalafoundation.com/'
          },
          {
            id: 'iCall',
            name: 'iCall',
            phone: '9152987821',
            hours: 'Mon–Sat 8am–10pm',
            description: 'Free, confidential, professional counseling.',
            url: 'https://icallhelpline.org/'
          }
        ]
      };
    }
    return {
      helplines: [
        {
          id: 'vandrevala',
          name: 'Vandrevala Foundation',
          phone: '9999666555',
          hours: '24/7',
          url: 'https://www.vandrevalafoundation.com/'
        }
      ]
    };
  }

  // ─── Trusted Contacts ────────────────────────────────────────────────────────

  async getTrustedContacts(userId: string) {
    return prisma.trustedContact.findMany({
      where: { userId }
    });
  }

  async addTrustedContact(userId: string, data: { name: string, phone: string, relation?: string }) {
    const existingCount = await prisma.trustedContact.count({ where: { userId } });
    if (existingCount >= 5) {
      throw new Error("You can only add up to 5 trusted contacts.");
    }

    const contact = await prisma.trustedContact.create({
      data: {
        userId,
        name: data.name,
        phone: data.phone,
        relation: data.relation,
        consentSentAt: new Date(),
      }
    });

    // Notify the contact via SMS
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
    const userName = user?.profile?.displayName || 'Someone';
    const notifyMessage = `Hi! ${userName} has added you as a trusted emergency contact on Infano Care. If they ever need urgent help, you'll receive an instant alert with their location. No action needed — you're already set up to help. 💙`;
    try {
      await smsProvider.sendAlert(data.phone, notifyMessage);
      await prisma.trustedContact.update({
        where: { id: contact.id },
        data: { consentSentAt: new Date() }
      });
    } catch (e: any) {
      logger.error(`Failed to send contact notification SMS to ${data.phone}: ${e.message}`);
    }

    return contact;
  }

  async deleteTrustedContact(userId: string, contactId: string) {
    return prisma.trustedContact.deleteMany({
      where: {
        id: contactId,
        userId: userId,
      }
    });
  }

  async updateContactEmergencies(userId: string, contactId: string, emergencyTypes: string[]) {
    return prisma.trustedContact.update({
      where: { id: contactId },
      data: { emergencyTypes }
    });
  }

  // ─── User SOS Preferences ────────────────────────────────────────────────────

  async getPreferences(userId: string) {
    const pref = await prisma.userSosPreference.findUnique({ where: { userId } });
    if (!pref) {
      // Return defaults if not set yet
      return {
        userId,
        defaultEmergencyType: 'physical_threat',
        locationEnabled: false,
        setupCompleted: false,
        setupCompletedAt: null,
        lastTestedAt: null,
      };
    }
    return pref;
  }

  async savePreferences(userId: string, data: {
    defaultEmergencyType?: string;
    locationEnabled?: boolean;
    setupCompleted?: boolean;
  }) {
    return prisma.userSosPreference.upsert({
      where: { userId },
      update: {
        ...data,
        ...(data.setupCompleted ? { setupCompletedAt: new Date() } : {}),
      },
      create: {
        userId,
        defaultEmergencyType: data.defaultEmergencyType ?? 'physical_threat',
        locationEnabled: data.locationEnabled ?? false,
        setupCompleted: data.setupCompleted ?? false,
        setupCompletedAt: data.setupCompleted ? new Date() : null,
      },
    });
  }

  // ─── SOS Trigger ─────────────────────────────────────────────────────────────

  async triggerSos(userId: string, lat?: number, lng?: number, emergencyType?: string, isTest: boolean = false) {
    // 1. Create Incident with correct emergencyType field
    const incident = await prisma.sosIncident.create({
      data: {
        userId,
        status: 'ACTIVE',
        emergencyType: emergencyType ?? null,
        isTest,
        lat,
        lng,
        events: {
          create: {
            type: 'TRIGGERED',
            lat,
            lng,
          }
        }
      }
    });

    // 2. Fetch User
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
    const userName = user?.profile?.displayName || 'A user';

    // 3. Filter contacts based on emergencyType if provided
    let contacts = await prisma.trustedContact.findMany({
      where: {
        userId,
        ...(emergencyType ? {
          emergencyTypes: { has: emergencyType }
        } : {}),
      }
    });

    // Fallback: if no contacts match the type, notify all contacts
    if (contacts.length === 0) {
      contacts = await prisma.trustedContact.findMany({ where: { userId } });
    }

    // 4. Build human-readable message
    const hasLocation = lat != null && lng != null && !(lat === 0 && lng === 0);
    const locationStr = hasLocation ? `https://maps.google.com/?q=${lat},${lng}` : 'Location unavailable';
    const emergencyLabel = emergencyType ? EMERGENCY_TYPE_LABELS[emergencyType] ?? emergencyType : 'Emergency';
    const testPrefix = isTest ? '[TEST ALERT - No action needed] ' : '';
    const message = `${testPrefix}🚨 SOS Alert from ${userName}: ${emergencyLabel}. They may need immediate help. Live location: ${locationStr}. Sent at: ${new Date().toLocaleTimeString('en-IN')}. Please contact them or call emergency services (112).`;

    // 5. Notify contacts
    for (const contact of contacts) {
      try {
        await smsProvider.sendAlert(contact.phone, message);
      } catch (e: any) {
        logger.error(`Failed to send SOS SMS to ${contact.phone}: ${e.message}`);
      }

      // In-app notification if contact is a registered user
      try {
        const normalizedPhone = normalizePhone(contact.phone);
        const contactUser = await prisma.user.findUnique({ where: { phone: normalizedPhone } });
        if (contactUser) {
          if (contactUser.fcmToken) {
            await FirebaseService.sendPushNotification(contactUser.fcmToken, {
              title: `🚨 SOS Alert: ${userName} needs help`,
              body: message,
              deepLink: 'infano://safety/sos',
              data: { notificationType: 'SOS_ALERT', incidentId: incident.id }
            });
          }
          await prisma.notificationHistory.create({
            data: {
              userId: contactUser.id,
              type: 'SOS_ALERT',
              title: `🚨 SOS Alert: ${userName} needs help`,
              body: message,
              deepLink: 'infano://safety/sos',
              payload: { incidentId: incident.id, lat, lng, emergencyType, isTest }
            }
          });
        }
      } catch (e: any) {
        logger.error(`Failed to send SOS in-app notification to ${contact.phone}: ${e.message}`);
      }
    }

    // 6. If this was a test, update lastTestedAt in preferences
    if (isTest) {
      await prisma.userSosPreference.upsert({
        where: { userId },
        update: { lastTestedAt: new Date() },
        create: {
          userId,
          lastTestedAt: new Date(),
        },
      });
    }

    return incident;
  }

  // ─── Active Incident ──────────────────────────────────────────────────────────

  async getActiveIncident(userId: string) {
    const incident = await prisma.sosIncident.findFirst({
      where: { userId, status: 'ACTIVE', isTest: false },
      orderBy: { startedAt: 'desc' },
    });
    return incident;
  }

  // ─── Location Update ──────────────────────────────────────────────────────────

  async updateSosLocation(userId: string, incidentId: string, lat: number, lng: number) {
    const incident = await prisma.sosIncident.update({
      where: { id: incidentId, userId },
      data: { lat, lng }
    });

    await prisma.sosIncidentEvent.create({
      data: {
        incidentId,
        type: 'LOCATION_UPDATE',
        lat,
        lng
      }
    });

    // If initial notification had "Location unavailable", update notification text with the fresh Google Maps URL
    try {
      const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
      const notifications = await prisma.notificationHistory.findMany({
        where: {
          type: 'SOS_ALERT',
        }
      });

      for (const notif of notifications) {
        const payload = notif.payload as any;
        if (payload?.incidentId === incidentId && notif.body.includes('Location unavailable')) {
          const updatedBody = notif.body.replace('Location unavailable', mapsUrl);
          await prisma.notificationHistory.update({
            where: { id: notif.id },
            data: {
              body: updatedBody,
              payload: {
                ...(typeof payload === 'object' && payload !== null ? payload : {}),
                lat,
                lng,
                mapsUrl
              }
            }
          });
        }
      }
    } catch (e: any) {
      logger.error(`Failed to update notification history location: ${e.message}`);
    }

    return incident;
  }

  // ─── Cancel / Resolve ────────────────────────────────────────────────────────

  async cancelSos(userId: string, incidentId: string) {
    return prisma.sosIncident.update({
      where: { id: incidentId, userId },
      data: {
        status: 'CANCELLED',
        resolvedAt: new Date(),
        events: {
          create: { type: 'CANCELLED' }
        }
      }
    });
  }

  async resolveSos(userId: string, incidentId: string) {
    const incident = await prisma.sosIncident.update({
      where: { id: incidentId, userId },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        events: {
          create: { type: 'RESOLVED' }
        }
      }
    });

    // Notify all contacts that user is safe
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
    const contacts = await prisma.trustedContact.findMany({ where: { userId } });
    const userName = user?.profile?.displayName || 'The user';
    const message = `✅ ${userName} has marked themselves as safe. The SOS alert has been resolved. Thank you for being there. 💙`;

    for (const contact of contacts) {
      try {
        await smsProvider.sendAlert(contact.phone, message);
      } catch (e: any) {
        logger.error(`Failed to send resolve SMS to ${contact.phone}: ${e.message}`);
      }

      try {
        const normalizedPhone = normalizePhone(contact.phone);
        const contactUser = await prisma.user.findUnique({ where: { phone: normalizedPhone } });
        if (contactUser) {
          if (contactUser.fcmToken) {
            await FirebaseService.sendPushNotification(contactUser.fcmToken, {
              title: `✅ SOS Resolved: ${userName} is safe`,
              body: message,
              deepLink: 'infano://safety/sos',
              data: { notificationType: 'SOS_RESOLVED', incidentId: incident.id }
            });
          }
          await prisma.notificationHistory.create({
            data: {
              userId: contactUser.id,
              type: 'SOS_RESOLVED',
              title: `✅ SOS Resolved: ${userName} is safe`,
              body: message,
              deepLink: 'infano://safety/sos',
              payload: { incidentId: incident.id }
            }
          });
        }
      } catch (e: any) {
        logger.error(`Failed to send resolve in-app notification to ${contact.phone}: ${e.message}`);
      }
    }

    return incident;
  }
}
