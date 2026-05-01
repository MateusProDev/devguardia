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
    // DNS lookup para verificar IP
    const { address } = await dns.lookup(hostname);
    
    // Proteção contra DNS rebinding: verificar se o hostname resolve para IP privado
    if (isPrivateIPAddress(address)) {
      return true;
    }
    
    // Double-check lookup para prevenir DNS rebinding
    const { address: secondLookup } = await dns.lookup(hostname);
    if (address !== secondLookup) {
      // DNS rebinding detectado - tratar como suspeito
      return true;
    }
    
    return isPrivateIPAddress(address);
  } catch {
    return false;
  }
}
