import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

interface VulnRaw {
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  description: string;
  solution: string;
}

const ALLOWED_FLAGS = ['-sT', '--open', '-T4', '--host-timeout', '10s', '--max-retries', '1', '-p', '21,22,80,443,3306,5432,6379,8080,8443,27017'];

export class NmapService {
  async scan(hostname: string): Promise<VulnRaw[]> {
    const sanitizedHost = this.sanitizeHostname(hostname);
    if (!sanitizedHost) {
      console.warn(`[NMAP] Invalid hostname rejected: ${hostname}`);
      return [];
    }

    try {
      console.log(`[NMAP] Starting scan for ${sanitizedHost} with flags: ${ALLOWED_FLAGS.join(' ')}`);
      const { stdout, stderr } = await execFileAsync('nmap', [
        ...ALLOWED_FLAGS,
        sanitizedHost,
        '-oX', '-',
      ], { timeout: 20000 });

      if (stderr) console.warn(`[NMAP] stderr: ${stderr}`);
      console.log(`[NMAP] Raw output length: ${stdout.length} bytes`);
      console.log(`[NMAP] Output preview: ${stdout.substring(0, 500)}`);

      const vulns = this.parseNmapOutput(stdout);
      console.log(`[NMAP] Parsed ${vulns.length} vulnerabilities for ${sanitizedHost}`);
      return vulns;
    } catch (err: any) {
      console.error(`[NMAP] Scan FAILED for ${sanitizedHost}: ${err.message || err}`);
      if (err.stderr) console.error(`[NMAP] stderr: ${err.stderr}`);
      if (err.killed) console.error(`[NMAP] Process was killed (timeout?)`);
      return [];
    }
  }

  private sanitizeHostname(hostname: string): string | null {
    // Allow only valid hostname chars to prevent command injection
    const safe = /^[a-zA-Z0-9.\-]+$/.test(hostname);
    if (!safe) return null;
    if (hostname.length > 253) return null;
    return hostname;
  }

  private parseNmapOutput(xml: string): VulnRaw[] {
    const vulns: VulnRaw[] = [];

    // Check for open dangerous ports
    const dangerousPorts: Record<string, { title: string; severity: VulnRaw['severity']; solution: string }> = {
      '21': {
        title: 'FTP porta aberta',
        severity: 'HIGH',
        solution: 'Desabilite o FTP e use SFTP/FTPS. Adicione autenticação forte.',
      },
      '22': {
        title: 'SSH porta aberta publicamente',
        severity: 'MEDIUM',
        solution: 'Restrinja acesso SSH por IP. Use chaves SSH e desabilite login por senha.',
      },
      '3306': {
        title: 'MySQL exposto publicamente',
        severity: 'CRITICAL',
        solution: 'Nunca exponha bancos de dados na internet. Use firewall/VPC.',
      },
      '5432': {
        title: 'PostgreSQL exposto publicamente',
        severity: 'CRITICAL',
        solution: 'Restrinja PostgreSQL a conexões internas. Configure pg_hba.conf.',
      },
      '6379': {
        title: 'Redis exposto sem autenticação',
        severity: 'CRITICAL',
        solution: 'Habilite requirepass no Redis. Nunca exponha Redis na internet.',
      },
      '27017': {
        title: 'MongoDB exposto publicamente',
        severity: 'CRITICAL',
        solution: 'Configure autenticação no MongoDB. Restrinja acesso por firewall.',
      },
    };

    for (const [port, info] of Object.entries(dangerousPorts)) {
      const portRegex = new RegExp(`portid="${port}"[^>]*state="open"`);
      if (portRegex.test(xml)) {
        vulns.push({
          title: info.title,
          severity: info.severity,
          description: `A porta ${port} está acessível publicamente, o que representa um risco de segurança.`,
          solution: info.solution,
        });
      }
    }

    return vulns;
  }
}
