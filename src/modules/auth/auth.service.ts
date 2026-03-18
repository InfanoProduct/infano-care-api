import { prisma } from "../../db/client.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { AppError } from "../../common/middleware/errorHandler.js";

export class AuthService {
  static async register(data: any) {
    const { email, password, role } = data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new AppError("Email already in use", 400);
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: role || "TEEN",
      },
    });

    const token = this.generateToken(user.id);

    return { user, token };
  }

  static async login(data: any) {
    const { email, password } = data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError("Invalid email or password", 401);
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new AppError("Invalid email or password", 401);
    }

    const token = this.generateToken(user.id);

    return { user, token };
  }

  private static generateToken(userId: string) {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET || "default_secret", {
      expiresIn: "30d",
    });
  }
}
