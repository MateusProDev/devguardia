const ALLOWED_PROTOCOLS = ['http:', 'https:'];
const BLOCKED_TLDS = ['.local', '.internal', '.corp', '.home', '.lan'];

export function isValidScanUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();

    if (BLOCKED_TLDS.some((tld) => hostname.endsWith(tld))) {
      return false;
    }

    if (hostname === 'localhost') return false;
    if (!hostname.includes('.') && !/^\[/.test(hostname)) return false;

    return true;
  } catch {
    return false;
  }
}
