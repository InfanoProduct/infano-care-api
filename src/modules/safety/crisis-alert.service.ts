import { prisma } from '../../db/client.js';
import { logger } from '../../config/logger.js';
import { FirebaseService } from '../../common/services/firebase.service.js';

export const CRISIS_PATTERNS = [
  /\b(suicide|suicidal)\b/i,
  /\b(kill|killing)\s+(my\s*self|me)\b/i,
  /\b(want\s+to\s+die|wanna\s+die|wish\s+i\s+(were|was)\s+dead)\b/i,
  /\b(end|ending)\s+(my\s+life|it\s+all)\b/i,
  /\b(hurt|hurting|harm|harming)\s+(my\s*self|me)\b/i,
  /\bself[\s-]*(harm|harming|injury|injuring|destructive|destruction)\b/i,
  /\b(cut|cutting|slit|slitting)\s+(my\s*self|my\s+wrist|my\s+wrists|myself)\b/i,
  /\b(take|taking)\s+my\s+(own\s+)?life\b/i,
  /\b(better\s+off\s+dead|no\s+reason\s+to\s+live|don['’]?t\s+want\s+to\s+live)\b/i,
  /\b(overdose|overdosing)\s+(on\s+pills)?\b/i,
  /\b(hang|hanging)\s+myself\b/i,
];

export class CrisisAlertService {
  /**
   * Evaluates if text contains explicit suicide or self-harm distress keywords.
   */
  static isCrisisContent(text: string): boolean {
    if (!text || typeof text !== 'string') return false;
    return CRISIS_PATTERNS.some((pattern) => pattern.test(text));
  }

  /**
   * Extracts clean plain text from any content payload (string, JSON object, array).
   */
  static extractText(content: any): string {
    if (!content) return '';
    if (typeof content === 'string') return content;
    if (typeof content === 'object') {
      try {
        const values: string[] = [];
        const traverse = (obj: any) => {
          if (!obj) return;
          if (typeof obj === 'string') values.push(obj);
          else if (Array.isArray(obj)) obj.forEach(traverse);
          else if (typeof obj === 'object') Object.values(obj).forEach(traverse);
        };
        traverse(content);
        return values.join(' ');
      } catch {
        return JSON.stringify(content);
      }
    }
    return String(content);
  }

  /**
   * Checks content for suicide / self-harm distress and immediately sends notifications
   * to all linked parent devices if the user is a teen.
   */
  static async checkAndNotifyCrisis(
    userId: string,
    rawContent: any,
    source: 'GIGI_CHAT' | 'JOURNAL' | 'ASK_GIGI'
  ): Promise<{ isCrisis: boolean; parentsNotifiedCount: number }> {
    try {
      const text = this.extractText(rawContent);
      if (!this.isCrisisContent(text)) {
        return { isCrisis: false, parentsNotifiedCount: 0 };
      }

      logger.warn({ userId, source }, `[SAFETY CRISIS] Suicide/self-harm distress detected in ${source}`);

      // 1. Fetch all linked parents
      const linkedParents = await prisma.parentLink.findMany({
        where: {
          teenId: userId,
          status: 'LINKED',
        },
        include: {
          parent: {
            include: { profile: true },
          },
          teen: {
            include: { profile: true },
          },
        },
      });

      if (linkedParents.length === 0) {
        logger.info({ userId, source }, '[SAFETY CRISIS] No linked parent found for user in distress');
        return { isCrisis: true, parentsNotifiedCount: 0 };
      }

      let notifiedCount = 0;

      for (const link of linkedParents) {
        if (!link.parent || !link.parentId) continue;

        const teenName = link.teen?.profile?.displayName || link.teen?.username || 'Your daughter';
        const sourceLabel = source === 'JOURNAL' ? 'Journal entry' : (source === 'GIGI_CHAT' ? 'chat with Gigi' : 'learning reflection');

        const title = 'Urgent Safety Alert 🚨';
        const body = `${teenName} expressed thoughts of distress or self-harm in her ${sourceLabel}. Please check in on her with immediate care and support.`;
        const deepLink = 'infano://safety';
        const type = 'CRISIS_ALERT';

        // 2. Create in-app notification record
        try {
          await prisma.notificationHistory.create({
            data: {
              userId: link.parentId,
              type,
              title,
              body,
              deepLink: deepLink ?? undefined,
              payload: {
                teenId: userId,
                source,
                alertType: 'SELF_HARM_DISTRESS',
                detectedAt: new Date().toISOString(),
              },
              sentAt: new Date(),
            },
          });
        } catch (dbErr) {
          logger.error({ err: dbErr, parentId: link.parentId }, 'Failed to save crisis in-app notification');
        }

        // 3. Send Push Notification to Parent's Phone
        const parentFcm = link.parent.fcmToken;
        if (parentFcm && typeof parentFcm === 'string') {
          try {
            await FirebaseService.sendPushNotification(parentFcm, {
              title,
              body,
              deepLink,
              data: {
                notificationType: type,
                teenId: userId,
                source,
              },
            });
            notifiedCount++;
          } catch (fcmErr) {
            logger.error({ err: fcmErr, parentId: link.parentId }, 'Failed to send FCM crisis push notification to parent');
          }
        }
      }

      logger.info({ userId, notifiedCount }, '[SAFETY CRISIS] Successfully notified linked parents');
      return { isCrisis: true, parentsNotifiedCount: notifiedCount };
    } catch (error) {
      logger.error({ err: error, userId, source }, '[SAFETY CRISIS] Error in checkAndNotifyCrisis');
      return { isCrisis: false, parentsNotifiedCount: 0 };
    }
  }
}
