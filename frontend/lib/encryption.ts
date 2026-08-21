/**
 * Real Client-Side Cryptographic Note Backup & Recovery
 * Standard: AES-GCM 256-bit with PBKDF2 (100,000 iterations) SHA-256 Key Derivation
 */

export interface EncryptedBackupPayload {
  version: "1.0";
  kdf: "PBKDF2";
  cipher: "AES-GCM";
  salt: string;
  iv: string;
  ciphertext: string;
  checksum: string;
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as any,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * Encrypts private note data with a user-supplied password
 */
export async function encryptNoteVault(
  data: any,
  password: string
): Promise<EncryptedBackupPayload> {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);

  const rawData = enc.encode(JSON.stringify(data));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as any },
    key,
    rawData
  );

  // Compute SHA-256 checksum of plaintext for integrity verification
  const hashBuffer = await crypto.subtle.digest("SHA-256", rawData);

  return {
    version: "1.0",
    kdf: "PBKDF2",
    cipher: "AES-GCM",
    salt: bufferToHex(salt.buffer),
    iv: bufferToHex(iv.buffer),
    ciphertext: bufferToHex(encrypted),
    checksum: bufferToHex(hashBuffer),
  };
}

/**
 * Decrypts private note data with the user's password
 */
export async function decryptNoteVault(
  payload: EncryptedBackupPayload,
  password: string
): Promise<any> {
  const salt = hexToBuffer(payload.salt);
  const iv = hexToBuffer(payload.iv);
  const ciphertext = hexToBuffer(payload.ciphertext);

  const key = await deriveKey(password, salt);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as any },
    key,
    ciphertext as any
  );

  const dec = new TextDecoder();
  const plaintext = dec.decode(decrypted);

  // Verify integrity
  const hashBuffer = await crypto.subtle.digest("SHA-256", decrypted);
  const calculatedChecksum = bufferToHex(hashBuffer);

  if (calculatedChecksum !== payload.checksum) {
    throw new Error("Integrity check failed: Checksum mismatch.");
  }

  return JSON.parse(plaintext);
}
