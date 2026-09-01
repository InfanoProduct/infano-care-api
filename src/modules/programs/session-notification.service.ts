import { prisma } from "../../db/client.js";
import { logger } from "../../config/logger.js";
import { FirebaseService } from "../../common/services/firebase.service.js";
import { sendProgramSessionEmail, sendProgramEnrolledEmail } from "../../common/services/email.service.js";
import { ProgramsService } from "./programs.service.js";

function formatSessionDateTime(date: Date) {
  const dt = new Date(date);
  
  // E.g. "Friday, 21 Aug 2026"
  const formattedDate = dt.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata"
  });

  // E.g. "04:30 PM IST"
  const formattedTime = dt.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata"
  }) + " IST";

  return { formattedDate, formattedTime };
}

export class SessionNotificationService {
  /**
   * Dispatches Multi-channel (In-app, Mobile Push, Email) notifications
   * whenever a session is scheduled or rescheduled by Admin or Expert.
   */
  static async notifySessionScheduled(sessionId: string, eventType: "scheduled" | "rescheduled" = "scheduled") {
    try {
      const session = await prisma.expertSessionSchedule.findUnique({
        where: { id: sessionId },
        include: {
          expert: {
            select: {
              id: true,
              username: true,
              email: true,
              fcmToken: true,
              profile: {
                select: {
                  displayName: true,
                  specialisation: true
                }
              }
            }
          },
          program: {
            select: {
              id: true,
              title: true,
              tagline: true,
              curriculum: true,
              consultations: true
            }
          },
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              phone: true,
              fcmToken: true,
              parentEmail: true,
              profile: {
                select: { displayName: true }
              }
            }
          },
          batch: {
            include: {
              enrollments: {
                where: {
                  status: { not: "CANCELLED" }
                },
                include: {
                  user: {
                    select: {
                      id: true,
                      username: true,
                      email: true,
                      phone: true,
                      fcmToken: true,
                      parentEmail: true,
                      profile: {
                        select: { displayName: true }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!session) {
        logger.warn({ sessionId }, "Session not found for dispatching notifications");
        return;
      }

      const isRescheduled = eventType === "rescheduled";
      const programTitle = session.program?.title || "Infano Care Program";
      const batchName = session.batch?.name;
      const expertName = session.expert?.profile?.displayName || session.expert?.username || "Infano Expert Mentor";
      const meetLink = session.meetLink || "";
      const { formattedDate, formattedTime } = formatSessionDateTime(session.scheduledAt);
      const formattedDateTime = `${formattedDate} at ${formattedTime}`;

      // Resolve Session Title
      let sessionTitle = `Session ${session.sessionNumber || 1}`;
      if (session.sessionNumber && session.sessionNumber > 0) {
        const curriculum: any[] = (Array.isArray(session.program?.curriculum) && session.program.curriculum.length > 0)
          ? (session.program.curriculum as any[])
          : (ProgramsService.getMockSessionsForProgram(programTitle) || []);
        const item = curriculum && curriculum.length >= session.sessionNumber ? curriculum[session.sessionNumber - 1] : null;
        if (item?.title) {
          sessionTitle = `Session ${session.sessionNumber}: ${item.title}`;
        }
      } else if (session.sessionNumber && session.sessionNumber < 0) {
        const idx = Math.abs(session.sessionNumber) - 1;
        const consultations = (session.program?.consultations as any[]) || [];
        const item = consultations[idx];
        sessionTitle = item?.title ? `Free Consultation: ${item.title}` : "Free Consultation Session";
      }

      const notificationType = isRescheduled ? "sessionRescheduled" : "sessionScheduled";
      const deepLink = `infano://programs/sessions`;

      // 1. Gather all student & parent targets
      interface TargetRecipient {
        userId?: string;
        name: string;
        email?: string | null;
        fcmToken?: string | null;
        isParent?: boolean;
        studentName?: string;
      }

      const recipients: TargetRecipient[] = [];

      if (session.batch && session.batch.enrollments.length > 0) {
        // Multi-student batch session
        for (const enr of session.batch.enrollments) {
          const studentName = enr.guestName || enr.user?.profile?.displayName || enr.user?.username || "Student";
          
          if (enr.user) {
            recipients.push({
              userId: enr.user.id,
              name: studentName,
              email: enr.user.email,
              fcmToken: enr.user.fcmToken,
              isParent: false
            });

            if (enr.user.parentEmail) {
              recipients.push({
                name: `Parent of ${studentName}`,
                email: enr.user.parentEmail,
                isParent: true,
                studentName
              });
            }

            // Check if linked to parent account
            const links = await prisma.parentLink.findMany({
              where: {
                teenId: enr.user.id,
                status: "LINKED"
              },
              include: {
                parent: {
                  select: { id: true, email: true, fcmToken: true, profile: { select: { displayName: true } } }
                }
              }
            });

            for (const link of links) {
              if (link.parent) {
                recipients.push({
                  userId: link.parent.id,
                  name: link.parent.profile?.displayName || "Parent",
                  email: link.parent.email,
                  fcmToken: link.parent.fcmToken,
                  isParent: true,
                  studentName
                });
              }
            }
          } else if (enr.guestEmail) {
            recipients.push({
              name: studentName,
              email: enr.guestEmail,
              isParent: false
            });
          }
        }
      } else if (session.user) {
        // 1-on-1 session
        const studentName = session.user.profile?.displayName || session.user.username || "Student";
        recipients.push({
          userId: session.user.id,
          name: studentName,
          email: session.user.email,
          fcmToken: session.user.fcmToken,
          isParent: false
        });

        if (session.user.parentEmail) {
          recipients.push({
            name: `Parent of ${studentName}`,
            email: session.user.parentEmail,
            isParent: true,
            studentName
          });
        }

        // Linked parent
        const link = await prisma.parentLink.findFirst({
          where: {
            OR: [
              { teenId: session.user.id },
              { parentId: session.user.id }
            ],
            status: "LINKED"
          },
          include: {
            parent: {
              select: { id: true, email: true, fcmToken: true, profile: { select: { displayName: true } } }
            },
            teen: {
              select: { id: true, email: true, fcmToken: true, profile: { select: { displayName: true } } }
            }
          }
        });

        if (link) {
          const partnerUser = session.user.id === link.teenId ? link.parent : link.teen;
          if (partnerUser) {
            recipients.push({
              userId: partnerUser.id,
              name: partnerUser.profile?.displayName || "Family Member",
              email: partnerUser.email,
              fcmToken: partnerUser.fcmToken,
              isParent: true,
              studentName
            });
          }
        }
      }

      // Deduplicate recipients by (userId or email)
      const uniqueRecipients: TargetRecipient[] = [];
      const seenKeys = new Set<string>();

      for (const r of recipients) {
        const key = r.userId ? `user_${r.userId}` : `email_${r.email?.toLowerCase()}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          uniqueRecipients.push(r);
        }
      }

      // 2. Dispatch notifications to all students & parents
      for (const target of uniqueRecipients) {
        const title = isRescheduled
          ? `Session Rescheduled: ${programTitle}`
          : `Live Session Scheduled: ${programTitle}`;

        const body = target.isParent && target.studentName
          ? (isRescheduled
              ? `Session for ${target.studentName} in "${programTitle}" with ${expertName} has been rescheduled to ${formattedDateTime}.`
              : `Session for ${target.studentName} in "${programTitle}" with ${expertName} is scheduled for ${formattedDateTime}.`)
          : (isRescheduled
              ? `Your ${sessionTitle} for "${programTitle}" with ${expertName} has been rescheduled to ${formattedDateTime}.`
              : `Your ${sessionTitle} for "${programTitle}" with ${expertName} is scheduled for ${formattedDateTime}.`);

        // A. In-App Notification (Web & Mobile Notification Center)
        if (target.userId) {
          try {
            await prisma.notificationHistory.create({
              data: {
                userId: target.userId,
                type: notificationType,
                title,
                body,
                deepLink,
                payload: {
                  sessionId: session.id,
                  programId: session.programId,
                  batchId: session.batchId,
                  scheduledAt: session.scheduledAt,
                  meetLink
                },
                sentAt: new Date()
              }
            });
          } catch (err) {
            logger.error({ err, userId: target.userId }, "Failed to create in-app notification record");
          }
        }

        // B. Mobile Push Notification via Firebase
        if (target.fcmToken) {
          try {
            await FirebaseService.sendPushNotification(target.fcmToken, {
              title,
              body,
              deepLink,
              data: {
                notificationType,
                sessionId: session.id,
                programId: session.programId || ""
              }
            });
          } catch (err) {
            logger.error({ err, fcmToken: target.fcmToken }, "Failed to send FCM push notification");
          }
        }

        // C. Email Notification
        if (target.email) {
          try {
            await sendProgramSessionEmail(target.email, {
              recipient_name: target.name,
              program_title: programTitle,
              session_title: sessionTitle,
              batch_name: batchName,
              formatted_date: formattedDate,
              formatted_time: formattedTime,
              expert_name: expertName,
              meet_link: meetLink || undefined,
              is_rescheduled: isRescheduled
            });
            logger.info({ email: target.email, sessionId: session.id }, "Session email notification dispatched successfully");
          } catch (emailErr) {
            logger.error({ emailErr, email: target.email }, "Failed to send session email notification");
          }
        }
      }

      // 3. Dispatch Notification to Expert Mentor
      if (session.expert) {
        const expertTitle = isRescheduled
          ? `Live Session Rescheduled: ${programTitle}`
          : `New Live Session Assigned: ${programTitle}`;

        const expertBody = isRescheduled
          ? `Your session in "${programTitle}"${batchName ? ` (Batch: ${batchName})` : ""} has been rescheduled to ${formattedDateTime}.`
          : `You have an assigned live session in "${programTitle}"${batchName ? ` (Batch: ${batchName})` : ""} scheduled for ${formattedDateTime}.`;

        // Expert In-App Notification
        if (session.expertId) {
          try {
            await prisma.notificationHistory.create({
              data: {
                userId: session.expertId,
                type: notificationType,
                title: expertTitle,
                body: expertBody,
                deepLink: `infano://expert/sessions`,
                payload: {
                  sessionId: session.id,
                  programId: session.programId,
                  batchId: session.batchId,
                  scheduledAt: session.scheduledAt,
                  meetLink
                },
                sentAt: new Date()
              }
            });
          } catch (err) {
            logger.error({ err, expertId: session.expertId }, "Failed to create expert in-app notification");
          }
        }

        // Expert Push Notification
        if (session.expert.fcmToken) {
          try {
            await FirebaseService.sendPushNotification(session.expert.fcmToken, {
              title: expertTitle,
              body: expertBody,
              deepLink: `infano://expert/sessions`,
              data: {
                notificationType,
                sessionId: session.id,
                programId: session.programId || ""
              }
            });
          } catch (err) {
            logger.error({ err, fcmToken: session.expert.fcmToken }, "Failed to send FCM push to expert");
          }
        }

        // Expert Email Notification
        if (session.expert.email) {
          try {
            await sendProgramSessionEmail(session.expert.email, {
              recipient_name: expertName,
              program_title: programTitle,
              session_title: sessionTitle,
              batch_name: batchName,
              formatted_date: formattedDate,
              formatted_time: formattedTime,
              expert_name: "You",
              meet_link: meetLink || undefined,
              is_rescheduled: isRescheduled
            });
            logger.info({ email: session.expert.email, sessionId: session.id }, "Session email dispatched to expert mentor");
          } catch (emailErr) {
            logger.error({ emailErr, email: session.expert.email }, "Failed to send session email to expert");
          }
        }
      }

      logger.info({ sessionId, recipientsCount: uniqueRecipients.length, eventType }, "Completed session notification dispatch across all channels");
    } catch (err) {
      logger.error({ err, sessionId }, "Failed to process session notifications");
    }
  }

  /**
   * Dispatches Multi-channel (In-app, Mobile Push, Email) notifications
   * when a user is enrolled into a learning program.
   */
  static async notifyProgramEnrollment(enrollmentId: string) {
    try {
      const enrollment = await prisma.programEnrollment.findUnique({
        where: { id: enrollmentId },
        include: {
          program: true,
          batch: true,
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              phone: true,
              fcmToken: true,
              parentEmail: true,
              profile: {
                select: { displayName: true }
              }
            }
          }
        }
      });

      if (!enrollment) {
        logger.warn({ enrollmentId }, "Enrollment not found for dispatching enrollment notifications");
        return;
      }

      const programTitle = enrollment.program.title;
      const programTagline = enrollment.program.tagline;
      const duration = enrollment.program.duration;
      const batchName = enrollment.batch?.name;
      const studentName = enrollment.guestName || enrollment.user?.profile?.displayName || enrollment.user?.username || "Student";
      const deepLink = `infano://programs/sessions`;

      // 1. Gather all student & parent targets
      interface TargetRecipient {
        userId?: string;
        name: string;
        email?: string | null;
        fcmToken?: string | null;
        isParent?: boolean;
      }

      const targets: TargetRecipient[] = [];

      if (enrollment.user) {
        targets.push({
          userId: enrollment.user.id,
          name: studentName,
          email: enrollment.user.email,
          fcmToken: enrollment.user.fcmToken,
          isParent: false
        });

        if (enrollment.user.parentEmail) {
          targets.push({
            name: `Parent of ${studentName}`,
            email: enrollment.user.parentEmail,
            isParent: true
          });
        }

        // Linked parents
        const links = await prisma.parentLink.findMany({
          where: {
            teenId: enrollment.user.id,
            status: "LINKED"
          },
          include: {
            parent: {
              select: { id: true, email: true, fcmToken: true, profile: { select: { displayName: true } } }
            }
          }
        });

        for (const link of links) {
          if (link.parent) {
            targets.push({
              userId: link.parent.id,
              name: link.parent.profile?.displayName || "Parent",
              email: link.parent.email,
              fcmToken: link.parent.fcmToken,
              isParent: true
            });
          }
        }
      } else if (enrollment.guestEmail) {
        targets.push({
          name: studentName,
          email: enrollment.guestEmail,
          isParent: false
        });
      }

      // Deduplicate targets
      const uniqueTargets: TargetRecipient[] = [];
      const seenKeys = new Set<string>();

      for (const t of targets) {
        const key = t.userId ? `user_${t.userId}` : `email_${t.email?.toLowerCase()}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          uniqueTargets.push(t);
        }
      }

      for (const target of uniqueTargets) {
        const title = `Welcome to ${programTitle}! 🎉`;
        const body = target.isParent
          ? `${studentName} is successfully enrolled in "${programTitle}". Curriculum access is now active.`
          : `You are officially enrolled in "${programTitle}". Access your curriculum and batch sessions in your dashboard.`;

        // A. In-App Notification (Web & Mobile Notification Center)
        if (target.userId) {
          try {
            await prisma.notificationHistory.create({
              data: {
                userId: target.userId,
                type: "programEnrolled",
                title,
                body,
                deepLink,
                payload: {
                  enrollmentId: enrollment.id,
                  programId: enrollment.programId,
                  batchId: enrollment.batchId
                },
                sentAt: new Date()
              }
            });
          } catch (err) {
            logger.error({ err, userId: target.userId }, "Failed to create program enrollment in-app notification");
          }
        }

        // B. Mobile Push Notification via Firebase
        if (target.fcmToken) {
          try {
            await FirebaseService.sendPushNotification(target.fcmToken, {
              title,
              body,
              deepLink,
              data: {
                notificationType: "programEnrolled",
                enrollmentId: enrollment.id,
                programId: enrollment.programId
              }
            });
          } catch (err) {
            logger.error({ err, fcmToken: target.fcmToken }, "Failed to send program enrollment FCM push");
          }
        }

        // C. Welcome Email
        if (target.email) {
          try {
            await sendProgramEnrolledEmail(target.email, {
              recipient_name: target.name,
              program_title: programTitle,
              program_tagline: programTagline || undefined,
              duration: duration || undefined,
              batch_name: batchName || undefined
            });
            logger.info({ email: target.email, enrollmentId: enrollment.id }, "Program enrollment email dispatched");
          } catch (emailErr) {
            logger.error({ emailErr, email: target.email }, "Failed to send program enrollment email");
          }
        }
      }

      logger.info({ enrollmentId, recipientsCount: uniqueTargets.length }, "Completed program enrollment notifications across all channels");
    } catch (err) {
      logger.error({ err, enrollmentId }, "Failed to process program enrollment notifications");
    }
  }

  /**
   * Dispatches In-App & Mobile Push notifications when a Demo Session is booked.
   */
  static async notifyDemoSessionBooked(demoId: string) {
    try {
      const demo = await prisma.demoSession.findUnique({
        where: { id: demoId }
      });

      if (!demo) return;

      const { normalizePhone } = await import("../../common/utils/phone.js");
      const normalizedPhone = normalizePhone(demo.phone);
      const rawPhone = demo.phone.replace(/[^\d]/g, '');
      const last10Digits = rawPhone.length >= 10 ? rawPhone.slice(-10) : rawPhone;

      // Find user associated with this phone or email
      const users = await prisma.user.findMany({
        where: {
          OR: [
            { phone: normalizedPhone },
            { phone: demo.phone },
            { phone: { endsWith: last10Digits } },
            ...(demo.email ? [{ email: demo.email }] : [])
          ]
        },
        select: {
          id: true,
          fcmToken: true,
          profile: { select: { displayName: true } }
        }
      });

      if (users.length === 0) return;

      const dateStr = demo.slotDate || "Upcoming Date";
      const timeStr = demo.slotTime || "";
      const title = "Demo Session Confirmed 🌟";
      const body = `Your interactive demo session is booked for ${dateStr}${timeStr ? ` at ${timeStr}` : ""} (Paid ₹${demo.amount || 9}). An expert mentor will connect with you soon!`;
      const deepLink = `infano://programs/demos`;

      for (const user of users) {
        // In-App Notification
        try {
          await prisma.notificationHistory.create({
            data: {
              userId: user.id,
              type: "demoSessionBooked",
              title,
              body,
              deepLink,
              payload: {
                demoId: demo.id,
                slotDate: demo.slotDate,
                slotTime: demo.slotTime,
                amount: demo.amount || 9,
                paymentStatus: demo.paymentStatus
              },
              sentAt: new Date()
            }
          });
        } catch (err) {
          logger.error({ err, userId: user.id }, "Failed to create demo session in-app notification");
        }

        // Mobile Push Notification
        if (user.fcmToken) {
          try {
            await FirebaseService.sendPushNotification(user.fcmToken, {
              title,
              body,
              deepLink,
              data: {
                notificationType: "demoSessionBooked",
                demoId: demo.id,
                amount: String(demo.amount || 9)
              }
            });
          } catch (err) {
            logger.error({ err, fcmToken: user.fcmToken }, "Failed to send demo session FCM push");
          }
        }
      }
    } catch (err) {
      logger.error({ err, demoId }, "Failed to dispatch demo session booking in-app/push notifications");
    }
  }
}

