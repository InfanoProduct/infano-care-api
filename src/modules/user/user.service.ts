import { prisma } from "../../db/client.js";
import { AppError } from "../../common/middleware/errorHandler.js";

export class UserService {
  static async completeOnboarding(userId: string, data: any) {
    const { firstName, pronouns, birthMonth, birthYear, parentEmail } = data;

    // Calculate age
    const today = new Date();
    let age = today.getFullYear() - birthYear;
    if (today.getMonth() + 1 < birthMonth) {
      age--;
    }

    const consentStatus = age < 13 ? "PENDING" : "GRANTED";

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        birthMonth,
        birthYear,
        parentEmail,
        consentStatus,
        profile: {
          create: {
            firstName,
            pronouns,
          },
        },
      },
      include: { profile: true },
    });

    return user;
  }

  static async getProfile(userId: string) {
    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: { user: true },
    });

    if (!profile) {
      throw new AppError("Profile not found", 404);
    }

    return profile;
  }
}
