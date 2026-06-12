import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { Injectable } from "@nestjs/common";

@Injectable()
export class CryptoService {
  private readonly algorithm = "aes-256-gcm";

  encrypt(value: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv(this.algorithm, this.key(), iv);
    const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [iv, tag, encrypted].map((part) => part.toString("base64")).join(".");
  }

  decrypt(value: string): string {
    const [iv, tag, encrypted] = value.split(".").map((part) => Buffer.from(part, "base64"));
    const decipher = createDecipheriv(this.algorithm, this.key(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  }

  private key(): Buffer {
    return createHash("sha256").update(process.env.ENCRYPTION_KEY ?? "development-only-secret").digest();
  }
}
