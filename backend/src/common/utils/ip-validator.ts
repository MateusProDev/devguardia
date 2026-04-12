import * as dns from 'dns/promises';
import * as net from 'net';

const PRIVATE_RANGES = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2[0-9]|3[01])\./,
  /^169\.254\./,
  /^::1$/,
  /^fc[0-9a-f]{2}:/i,
  /^fd[0-9a-f]{2}:/i,
  /^fe80:/i,
  /^localhost$/i,
];

function isPrivateIPAddress(ip: string): boolean {
  return PRIVATE_RANGES.some((r) => r.test(ip));
}

export async function isPrivateIP(hostname: string): Promise<boolean> {
  if (net.isIP(hostname)) {
    return isPrivateIPAddress(hostname);
  }

  try {
    const { address } = await dns.lookup(hostname);
    return isPrivateIPAddress(address);
  } catch {
    return false;
  }
}
