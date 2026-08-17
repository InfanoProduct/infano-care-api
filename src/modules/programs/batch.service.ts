import { prisma } from "../../db/client.js";
import { AppError } from "../../common/middleware/errorHandler.js";

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
            curriculum: true
          }
        },
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
        enrollments: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                phone: true,
                profile: {
                  select: {
                    displayName: true
                  }
                }
              }
            }
          }
        },
        expertSessions: {
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

    return batch;
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
