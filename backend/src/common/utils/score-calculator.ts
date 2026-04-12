interface VulnWeight {
  CRITICAL: number;
  HIGH: number;
  MEDIUM: number;
  LOW: number;
  INFO: number;
}

const SEVERITY_DEDUCTIONS: VulnWeight = {
  CRITICAL: 25,
  HIGH: 15,
  MEDIUM: 8,
  LOW: 3,
  INFO: 1,
};

export function calculateScore(vulnerabilities: { severity: keyof VulnWeight }[]): number {
  let score = 100;

  for (const vuln of vulnerabilities) {
    score -= SEVERITY_DEDUCTIONS[vuln.severity] || 0;
  }

  return Math.max(0, Math.min(100, score));
}
