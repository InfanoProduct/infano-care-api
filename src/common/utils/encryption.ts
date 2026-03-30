import crypto from "crypto";
import { env } from "../../config/env.js";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypts sensitive health notes using AES-256-GCM.
 * Note: Encryption key should ideally be managed via KMS/Sealed Secrets.
 */
export function encryptNote(text: string): { ciphertext: string; iv: string } {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = Buffer.from(env.CRYPTO_KEY, "hex"); // 64-char hex string (32 bytes)
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const authTag = cipher.getAuthTag();
  
  // Combine ciphertext and authTag for storage
  return {
    ciphertext: encrypted + authTag.toString("hex"),
    iv: iv.toString("hex"),
  };
}

/**
 * Decrypts sensitive health notes.
 */
export function decryptNote(ciphertext: string, ivHex: string): string {
  const key = Buffer.from(env.CRYPTO_KEY, "hex");
  const iv  = Buffer.from(ivHex, "hex");
  
  const authTagByteIndex = ciphertext.length - (AUTH_TAG_LENGTH * 2);
  const authTag = Buffer.from(ciphertext.substring(authTagByteIndex), "hex");
  const actualCiphertext = ciphertext.substring(0, authTagByteIndex);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(actualCiphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");
  
  return decrypted;
}
