import { prisma } from "../../db/client.js";
import { AppError } from "../../common/middleware/errorHandler.js";
import { ProgramsService } from "./programs.service.js";
import { SessionNotificationService } from "./session-notification.service.js";

export class BatchService {
  /**
   * Create a new batch for a program
   */
  static async createBatch(programId: string, data: {
    name: string;
    description?: string;
    maxCapacity?: number;
    startDate?: string;
    endDate?: string;
    expertId?: string;
  }) {
    if (!data.name || !data.name.trim()) {
      throw new AppError("Batch name is required", 400);
    }

    const program = await prisma.program.findUnique({
      where: { id: programId }
    });

    if (!program) {
      throw new AppError("Program not found", 404);
    }

    const batch = await prisma.programBatch.create({
      data: {
        programId,
        name: data.name.trim(),
        description: data.description || "",
        maxCapacity: data.maxCapacity && data.maxCapacity > 0 ? Number(data.maxCapacity) : 20,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        expertId: data.expertId || null,
        status: "UPCOMING"
      },
      include: {
        expert: {
          select: {
            id: true,
            username: true,
            email: true,
            profile: {
              select: {
                displayName: true,
                avatarUrl: true
              }
            }
          }
        },
        _count: {
          select: {
            enrollments: true
          }
        }
      }
    });

    return batch;
  }

  /**
   * List all batches for a specific program
   */
  static async getBatchesByProgram(programId: string) {
    const batches = await prisma.programBatch.findMany({
      where: { programId },
      include: {
        expert: {
          select: {
            id: true,
            username: true,
            email: true,
            profile: {
              select: {
                displayName: true,
                avatarUrl: true
              }
            }
          }
        },
        _count: {
          select: {
            enrollments: true
          }
        }
      },
      orderBy: { createdAt: "asc" }
    });

    return batches;
  }

  /**
   * Get single batch details by ID
   */
  static async getBatchById(batchId: string) {
    const batch = await prisma.programBatch.findUnique({
      where: { id: batchId },
      include: {
        program: {
          select: {
            id: true,
            title: true,
            tagline: true,
            description: true,
            duration: true,
            topics: true,
            curriculum: true,
            price: true,
            isActive: true
          }
        },
        expert: {
          select: {
            id: true,
            username: true,
            email: true,
            phone: true,
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
                specialisation: true,
                bio: true,
                consultationPrice: true
              }
            }
          }
        },
        enrollments: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                phone: true,
                role: true,
                parentEmail: true,
                profile: {
                  select: {
                    displayName: true,
                    avatarUrl: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: "desc" }
        },
        expertSessions: {
          include: {
            expert: {
              select: {
                id: true,
                username: true,
                profile: {
                  select: {
                    displayName: true,
                    avatarUrl: true
                  }
                }
              }
            }
          },
          orderBy: { scheduledAt: "asc" }
        },
        _count: {
          select: {
            enrollments: true
          }
        }
      }
    });

    if (!batch) {
      throw new AppError("Batch not found", 404);
    }

    const curriculum = (batch.program.curriculum && Array.isArray(batch.program.curriculum) && batch.program.curriculum.length > 0)
      ? (batch.program.curriculum as any[])
      : ProgramsService.getMockSessionsForProgram(batch.program.title);

    return {
      ...batch,
      program: {
        ...batch.program,
        curriculum
      }
    };
  }

  /**
   * Schedule a new live/curriculum session for this batch
   */
  static async scheduleBatchSession(batchId: string, data: {
    scheduledAt: string;
    sessionNumber?: number;
    meetLink?: string;
    expertId?: string;
  }) {
    const batch = await prisma.programBatch.findUnique({ where: { id: batchId } });
    if (!batch) throw new AppError("Batch not found", 404);

    const expertId = data.expertId || batch.expertId;
    if (!expertId) {
      throw new AppError("An expert mentor is required to schedule a session", 400);
    }

    const session = await prisma.expertSessionSchedule.create({
      data: {
        batchId,
        programId: batch.programId,
        expertId,
        scheduledAt: new Date(data.scheduledAt),
        sessionNumber: data.sessionNumber !== undefined ? Number(data.sessionNumber) : null,
        meetLink: data.meetLink ? data.meetLink.trim() : null,
        status: "SCHEDULED"
      },
      include: {
        expert: {
          select: {
            id: true,
            username: true,
            profile: {
              select: {
                displayName: true,
                avatarUrl: true
              }
            }
          }
        }
      }
    });

    // Trigger multi-channel notifications (In-app, Push, Email) to enrolled students, parents, and expert mentor
    SessionNotificationService.notifySessionScheduled(session.id, "scheduled").catch(err => {
      console.error("Failed to dispatch notifications for batch session:", err);
    });

    return session;
  }

  /**
   * Update a batch session's schedule, status, or meet link
   */
  static async updateBatchSession(batchId: string, sessionId: string, data: {
    scheduledAt?: string;
    meetLink?: string;
    status?: string;
    sessionNumber?: number;
  }) {
    const session = await prisma.expertSessionSchedule.findFirst({
      where: { id: sessionId, batchId }
    });
    if (!session) throw new AppError("Session not found for this batch", 404);

    const updateData: any = {};
    if (data.scheduledAt) updateData.scheduledAt = new Date(data.scheduledAt);
    if (data.meetLink !== undefined) updateData.meetLink = data.meetLink;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.sessionNumber !== undefined) updateData.sessionNumber = Number(data.sessionNumber);

    const updated = await prisma.expertSessionSchedule.update({
      where: { id: sessionId },
      data: updateData,
      include: {
        expert: {
          select: {
            id: true,
            username: true,
            profile: {
              select: {
                displayName: true,
                avatarUrl: true
              }
            }
          }
        }
      }
    });

    // If date/time or meeting link changed, notify participants of the rescheduled session
    if (data.scheduledAt || (data.meetLink && data.meetLink !== session.meetLink)) {
      SessionNotificationService.notifySessionScheduled(updated.id, "rescheduled").catch(err => {
        console.error("Failed to dispatch reschedule notifications for batch session:", err);
      });
    }

    return updated;
  }

  /**
   * Delete a batch session
   */
  static async deleteBatchSession(batchId: string, sessionId: string) {
    const session = await prisma.expertSessionSchedule.findFirst({
      where: { id: sessionId, batchId }
    });
    if (!session) throw new AppError("Session not found for this batch", 404);

    await prisma.expertSessionSchedule.delete({ where: { id: sessionId } });
    return { success: true, message: "Batch session removed successfully" };
  }

  /**
   * Update batch details
   */
  static async updateBatch(batchId: string, data: {
    name?: string;
    description?: string;
    maxCapacity?: number;
    startDate?: string;
    endDate?: string;
    status?: string;
    expertId?: string | null;
  }) {
    const existing = await prisma.programBatch.findUnique({
      where: { id: batchId }
    });

    if (!existing) {
      throw new AppError("Batch not found", 404);
    }

    const updated = await prisma.programBatch.update({
      where: { id: batchId },
      data: {
        name: data.name !== undefined ? data.name.trim() : existing.name,
        description: data.description !== undefined ? data.description : existing.description,
        maxCapacity: data.maxCapacity !== undefined ? Number(data.maxCapacity) : existing.maxCapacity,
        startDate: data.startDate !== undefined ? (data.startDate ? new Date(data.startDate) : null) : existing.startDate,
        endDate: data.endDate !== undefined ? (data.endDate ? new Date(data.endDate) : null) : existing.endDate,
        status: data.status !== undefined ? data.status : existing.status,
        expertId: data.expertId !== undefined ? data.expertId : existing.expertId,
      },
      include: {
        expert: {
          select: {
            id: true,
            username: true,
            email: true,
            profile: {
              select: {
                displayName: true,
                avatarUrl: true
              }
            }
          }
        },
        _count: {
          select: {
            enrollments: true
          }
        }
      }
    });

    return updated;
  }

  /**
   * Delete batch if no enrollments present
   */
  static async deleteBatch(batchId: string) {
    const batch = await prisma.programBatch.findUnique({
      where: { id: batchId },
      include: {
        _count: {
          select: { enrollments: true }
        }
      }
    });

    if (!batch) {
      throw new AppError("Batch not found", 404);
    }

    if (batch._count.enrollments > 0) {
      throw new AppError(`Cannot delete batch because it has ${batch._count.enrollments} enrolled student(s)`, 400);
    }

    await prisma.programBatch.delete({
      where: { id: batchId }
    });

    return { success: true, message: "Batch deleted successfully" };
  }

  /**
   * Get all batches for admin
   */
  static async getAllBatches() {
    return prisma.programBatch.findMany({
      include: {
        program: {
          select: {
            id: true,
            title: true
          }
        },
        expert: {
          select: {
            id: true,
            username: true,
            email: true,
            profile: {
              select: {
                displayName: true
              }
            }
          }
        },
        _count: {
          select: {
            enrollments: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  }
}
