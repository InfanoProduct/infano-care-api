import { prisma } from "../../db/client.js";
import { AppError } from "../../common/middleware/errorHandler.js";

export class UserService {
  static async getProfile(userId: string) {
    const profile = await prisma.profile.findUnique({
      where:   { userId },
      include: { user: true },
    });
    if (!profile) throw new AppError("Profile not found", 404);
    return profile;
  }

  static async updateProfile(userId: string, data: any) {
    return prisma.profile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }
}
