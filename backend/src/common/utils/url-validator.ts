const ALLOWED_PROTOCOLS = ['http:', 'https:'];
const BLOCKED_TLDS = ['.local', '.internal', '.corp', '.home', '.lan'];
const BLOCKED_HOSTNAMES = ['metadata.google.internal', '169.254.169.254', 'metadata.internal'];
const BLOCKED_DOMAINS = [
  'devguardia.cloud',
  'www.devguardia.cloud',
  'app.devguardia.cloud',
];

export function isValidScanUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
      return false;
    }

    // Block credentials in URL
    if (parsed.username || parsed.password) {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();

    if (BLOCKED_TLDS.some((tld) => hostname.endsWith(tld))) {
      return false;
    }

    if (BLOCKED_HOSTNAMES.includes(hostname)) {
      return false;
    }

    // Bloquear domínios relacionados ao próprio SaaS
    if (BLOCKED_DOMAINS.includes(hostname) || hostname.endsWith('.devguardia.cloud')) {
      return false;
    }

    if (hostname === 'localhost') return false;
    if (!hostname.includes('.') && !/^\[/.test(hostname)) return false;

    // Block numeric IPs (IPv4)
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
      return false;
    }

    // Block IPv6
    if (/^\[/.test(hostname)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
