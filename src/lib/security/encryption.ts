import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const KEY = Buffer.from(process.env.ADMIN_ENCRYPTION_KEY!, "hex");

export function encryptPassword(password: string): {
  encrypted: string;
  iv: string;
} {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

  let encrypted = cipher.update(password, "utf8", "hex");
  encrypted += cipher.final("hex");

  return {
    encrypted,
    iv: iv.toString("hex"),
  };
}

export function decryptPassword(encrypted: string, iv: string): string {
  const ivBuffer = Buffer.from(iv, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, ivBuffer);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
