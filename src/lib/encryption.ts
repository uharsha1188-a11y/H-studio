import CryptoJS from 'crypto-js';

/**
 * Simple encryption helper for local history.
 * Uses the room code as a passphrase.
 */
export const encryptLocalData = (data: string, secretKey: string): string => {
  try {
    return CryptoJS.AES.encrypt(data, secretKey).toString();
  } catch (error) {
    console.error('Encryption failed', error);
    return '';
  }
};

export const decryptLocalData = (ciphertext: string | undefined | null, secretKey: string): string => {
  if (!ciphertext) return '';
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, secretKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Decryption failed', error);
    return '';
  }
};
