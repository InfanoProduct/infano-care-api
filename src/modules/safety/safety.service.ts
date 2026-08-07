import { prisma } from '../../db/client.js';
import { smsProvider } from '../auth/sms.service.js';
import { logger } from '../../config/logger.js';
import { FirebaseService } from '../../common/services/firebase.service.js';
import { normalizePhone } from '../../common/utils/phone.js';

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
          }
        ]
      };
    }
    return {
      helplines: [
        {
          id: 'vandrevala',
          name: 'Vandrevala Foundation',
          phone: '9999 666 555',
          hours: '24/7',
          url: 'https://www.vandrevalafoundation.com/'
        }
      ]
    };
  }

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
    return prisma.trustedContact.create({
      data: {
        userId,
        name: data.name,
        phone: data.phone,
        relation: data.relation,
      }
    });
  }

  async deleteTrustedContact(userId: string, contactId: string) {
    return prisma.trustedContact.deleteMany({
      where: {
        id: contactId,
        userId: userId, // Ensure ownership
      }
    });
  }

  async triggerSos(userId: string, lat?: number, lng?: number) {
    // 1. Create Incident
    const incident = await prisma.sosIncident.create({
      data: {
        userId,
        status: 'ACTIVE',
        lat,
        lng,
        events: {
          create: {
            type: 'TRIGGERED',
            lat,
            lng
          }
        }
      }
    });

    // 2. Fetch User and Trusted Contacts
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
    const contacts = await prisma.trustedContact.findMany({ where: { userId } });
    const userName = user?.profile?.displayName || 'A user';

    // 3. Send SMS to all trusted contacts
    const locationStr = (lat && lng) ? `https://maps.google.com/?q=${lat},${lng}` : 'Unknown';
    const message = `SOS from ${userName}. They may need help. Last location: ${locationStr}. Alert time: ${new Date().toLocaleTimeString()}. Please contact them or local emergency services.`;

    for (const contact of contacts) {
      try {
        await smsProvider.sendAlert(contact.phone, message);
      } catch (e: any) {
        logger.error(`Failed to send SOS SMS to ${contact.phone}: ${e.message}`);
      }

      // Send in-app notification if the contact is a registered user
      try {
        const normalizedContactPhone = normalizePhone(contact.phone);
        const contactUser = await prisma.user.findUnique({ where: { phone: normalizedContactPhone } });
        if (contactUser) {
          if (contactUser.fcmToken) {
            await FirebaseService.sendPushNotification(contactUser.fcmToken, {
              title: `🚨 SOS Alert: ${userName} needs help`,
              body: message,
              deepLink: "infano://safety/sos",
              data: { notificationType: "SOS_ALERT", incidentId: incident.id }
            });
          }
          await prisma.notificationHistory.create({
            data: {
              userId: contactUser.id,
              type: "SOS_ALERT",
              title: `🚨 SOS Alert: ${userName} needs help`,
              body: message,
              deepLink: "infano://safety/sos",
              payload: { incidentId: incident.id, lat, lng }
            }
          });
        }
      } catch (e: any) {
        logger.error(`Failed to send SOS in-app notification to ${contact.phone}: ${e.message}`);
      }
    }

    return incident;
  }

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

    return incident;
  }

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

    // Notify contacts that user is safe
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
    const contacts = await prisma.trustedContact.findMany({ where: { userId } });
    const userName = user?.profile?.displayName || 'The user';
    const message = `${userName} has marked themselves as safe. The SOS alert has been resolved.`;

    for (const contact of contacts) {
      try {
        await smsProvider.sendAlert(contact.phone, message);
      } catch (e: any) {
        logger.error(`Failed to send Resolve SMS to ${contact.phone}: ${e.message}`);
      }

      // Send in-app notification if the contact is a registered user
      try {
        const normalizedContactPhone = normalizePhone(contact.phone);
        const contactUser = await prisma.user.findUnique({ where: { phone: normalizedContactPhone } });
        if (contactUser) {
          if (contactUser.fcmToken) {
            await FirebaseService.sendPushNotification(contactUser.fcmToken, {
              title: `✅ SOS Resolved: ${userName} is safe`,
              body: message,
              deepLink: "infano://safety/sos",
              data: { notificationType: "SOS_RESOLVED", incidentId: incident.id }
            });
          }
          await prisma.notificationHistory.create({
            data: {
              userId: contactUser.id,
              type: "SOS_RESOLVED",
              title: `✅ SOS Resolved: ${userName} is safe`,
              body: message,
              deepLink: "infano://safety/sos",
              payload: { incidentId: incident.id }
            }
          });
        }
      } catch (e: any) {
        logger.error(`Failed to send SOS resolve in-app notification to ${contact.phone}: ${e.message}`);
      }
    }

    return incident;
  }
}
