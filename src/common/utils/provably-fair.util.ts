import { createHmac, createHash, randomBytes } from 'crypto';

export class ProvablyFairUtil {
  static generateRandom(
    serverSeed: string,
    clientSeed: string,
    nonce: number,
  ): number {
    const hmac = createHmac('sha256', serverSeed);
    hmac.update(`${clientSeed}:${nonce}`);
    const hash = hmac.digest();

    const value = hash.readBigUInt64BE(0);

    return Number(value) / Math.pow(2, 64);
  }

  static generateServerSeed(): string {
    return randomBytes(32).toString('hex');
  }

  static hashServerSeed(serverSeed: string): string {
    return createHash('sha256').update(serverSeed).digest('hex');
  }
}
