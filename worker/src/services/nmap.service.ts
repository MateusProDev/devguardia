import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

interface VulnRaw {
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  description: string;
  solution: string;
}

export type ScanMode = 'BASIC' | 'AGGRESSIVE';

const SCAN_PROFILES: Record<ScanMode, { flags: string[]; ports: string; timeout: number }> = {
  BASIC: {
    flags: ['--unprivileged', '-sT', '--open', '-T4', '--host-timeout', '10s', '--max-retries', '1'],
    ports: '21,22,80,443,3306,5432,6379,8080,8443,27017',
    timeout: 20000,
  },
  AGGRESSIVE: {
    flags: ['--unprivileged', '-sT', '-sV', '--open', '-T4', '--host-timeout', '30s', '--max-retries', '2'],
    ports: '1-1024,3306,5432,6379,8080,8443,9200,27017,11211',
    timeout: 60000,
  },
};

export class NmapService {
  async scan(hostname: string, mode: ScanMode = 'BASIC'): Promise<VulnRaw[]> {
    const sanitizedHost = this.sanitizeHostname(hostname);
    if (!sanitizedHost) {
      console.warn(`[NMAP] Invalid hostname rejected: ${hostname}`);
      return [];
    }

    const profile = SCAN_PROFILES[mode] || SCAN_PROFILES.BASIC;
    const nmapArgs = [...profile.flags, '-p', profile.ports];

    try {
      console.log(`[NMAP] Starting ${mode} scan for ${sanitizedHost} ports=${profile.ports}`);
      const { stdout, stderr } = await execFileAsync('nmap', [
        ...nmapArgs,
        sanitizedHost,
        '-oX', '-',
      ], { timeout: profile.timeout });

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
      '9200': {
        title: 'Elasticsearch exposto publicamente',
        severity: 'CRITICAL',
        solution: 'Restrinja Elasticsearch a conexões internas. Use autenticação X-Pack.',
      },
      '11211': {
        title: 'Memcached exposto publicamente',
        severity: 'HIGH',
        solution: 'Restrinja Memcached a localhost. Nunca exponha na internet.',
      },
      '23': {
        title: 'Telnet porta aberta (inseguro)',
        severity: 'CRITICAL',
        solution: 'Desabilite Telnet imediatamente. Use SSH para acesso remoto.',
      },
      '3389': {
        title: 'RDP (Remote Desktop) exposto',
        severity: 'HIGH',
        solution: 'Restrinja RDP por VPN ou firewall. Habilite NLA.',
      },
      '445': {
        title: 'SMB exposto publicamente',
        severity: 'HIGH',
        solution: 'Bloqueie porta SMB (445) no firewall externo.',
      },
      '25': {
        title: 'SMTP aberto (possível relay)',
        severity: 'MEDIUM',
        solution: 'Configure autenticação SMTP. Restrinja relay.',
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
