/**
 * DevGuard Nmap Scanner v3.1
 *
 * Filosofia: só reportar portas que são REAIS riscos + relatório DETALHADO.
 *
 * Cada vulnerabilidade inclui:
 *   - Hostname:porta exato detectado
 *   - Versão do serviço (quando disponível via -sV)
 *   - Cenário de ataque concreto
 *   - Comandos exatos para corrigir (iptables, ufw, firewall cloud)
 *   - Como verificar a correção
 *   - Referência (CVE quando aplicável, OWASP)
 */

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

interface DangerousPortInfo {
  service: string;
  title: (host: string, port: string) => string;
  severity: VulnRaw['severity'];
  buildDescription: (host: string, port: string, version: string) => string;
  buildSolution: (port: string) => string;
}

const DANGEROUS_PORTS: Record<string, DangerousPortInfo> = {
  '23': {
    service: 'Telnet',
    title: (h, p) => `Telnet exposto em ${h}:${p}`,
    severity: 'CRITICAL',
    buildDescription: (host, port, version) => [
      `Localização: ${host}:${port}${version ? ` (${version})` : ''}`,
      ``,
      `Telnet transmite TODO o tráfego em texto puro — incluindo usuário e senha do administrador. É protocolo legado dos anos 70, sem criptografia, e nunca deveria estar exposto na internet.`,
      ``,
      `Cenário de ataque: qualquer atacante na rota (rede do datacenter, ISP comprometido) captura credenciais com tcpdump em segundos. Bots automatizados (Mirai e variantes) varrem 23/tcp publicamente e fazem brute force em milhares de IPs/hora — dispositivos IoT são tomados em massa por essa porta.`,
      ``,
      `Referência: CWE-319 | NIST SP 800-114`,
    ].join('\n'),
    buildSolution: (port) => [
      `AÇÃO IMEDIATA:`,
      ``,
      `1) Desabilite o serviço Telnet:`,
      `   # Linux:`,
      `   sudo systemctl stop telnet.socket && sudo systemctl disable telnet.socket`,
      `   sudo apt remove --purge telnetd`,
      ``,
      `2) Bloqueie a porta no firewall:`,
      `   # ufw:`,
      `   sudo ufw deny ${port}/tcp`,
      ``,
      `   # iptables:`,
      `   sudo iptables -A INPUT -p tcp --dport ${port} -j DROP`,
      `   sudo iptables-save > /etc/iptables/rules.v4`,
      ``,
      `   # AWS Security Group: remova qualquer regra inbound em ${port}/tcp`,
      `   # GCP Firewall: gcloud compute firewall-rules delete allow-telnet`,
      ``,
      `3) Substitua por SSH (porta 22) com chaves:`,
      `   ssh-keygen -t ed25519 -C "admin@host"`,
      `   ssh-copy-id -p 22 user@${'host'}`,
      ``,
      `4) Verificar:`,
      `   nmap -p ${port} ${'seu-host'}   # deve mostrar "filtered" ou "closed"`,
    ].join('\n'),
  },
  '445': {
    service: 'SMB/CIFS',
    title: (h, p) => `SMB/CIFS exposto em ${h}:${p}`,
    severity: 'CRITICAL',
    buildDescription: (host, port, version) => [
      `Localização: ${host}:${port}${version ? ` (${version})` : ''}`,
      ``,
      `SMB exposto na internet é vetor histórico dos exploits mais devastadores da década:`,
      `   - EternalBlue (CVE-2017-0144) → WannaCry (2017): infectou 300k+ máquinas em 1 dia`,
      `   - NotPetya (2017): US$10 bilhões em prejuízo global`,
      `   - SMBGhost (CVE-2020-0796): RCE pré-auth em Windows 10`,
      ``,
      `Não há motivo legítimo para expor SMB publicamente. Mesmo com patches, ataques de credential stuffing e null-session ainda funcionam em muitos sistemas.`,
      ``,
      `Cenário de ataque: scanners automatizados (Shodan, Censys) catalogam todo IP com 445/tcp aberto. Botnets fazem RCE com EternalBlue em segundos se o host não tiver MS17-010.`,
      ``,
      `Referência: CWE-284 | MS17-010 | CVE-2020-0796`,
    ].join('\n'),
    buildSolution: (port) => [
      `AÇÃO IMEDIATA:`,
      ``,
      `1) Bloqueie ${port}/tcp no firewall externo IMEDIATAMENTE:`,
      ``,
      `   # Linux:`,
      `   sudo ufw deny ${port}/tcp`,
      `   sudo iptables -A INPUT -p tcp --dport ${port} -j DROP`,
      ``,
      `   # Windows Firewall (PowerShell admin):`,
      `   New-NetFirewallRule -DisplayName "Block SMB Inbound" -Direction Inbound -Protocol TCP -LocalPort ${port} -Action Block`,
      ``,
      `   # AWS Security Group: remova regra de inbound em ${port}/tcp`,
      `   # Azure NSG: remova regra inbound`,
      `   # Cloud firewalls: bloqueie 137-139 e ${port}/tcp do "any" source`,
      ``,
      `2) Aplique patches críticos do Windows (especialmente MS17-010 e CVE-2020-0796).`,
      ``,
      `3) Para acesso SMB legítimo (entre máquinas da empresa):`,
      `   - Use VPN site-to-site ou client VPN (WireGuard, OpenVPN)`,
      `   - Restrinja a IPs internos: source = 10.0.0.0/8 ou subnet privada`,
      ``,
      `4) Se possível, desabilite SMBv1 (vulnerável a EternalBlue):`,
      `   # PowerShell admin:`,
      `   Disable-WindowsOptionalFeature -Online -FeatureName SMB1Protocol`,
      ``,
      `Verificar: nmap -p ${port} seu-host   # deve mostrar filtered/closed`,
    ].join('\n'),
  },
  '3306': {
    service: 'MySQL',
    title: (h, p) => `MySQL exposto em ${h}:${p}`,
    severity: 'CRITICAL',
    buildDescription: (host, port, version) => [
      `Localização: ${host}:${port}${version ? ` (versão detectada: ${version})` : ''}`,
      ``,
      `O servidor MySQL/MariaDB está acessível diretamente da internet. Bancos de dados NUNCA devem ser expostos publicamente.`,
      ``,
      `Cenário de ataque:`,
      `   1. Bots automatizados (Shodan registra todo MySQL público) fazem brute force em root e usuários comuns`,
      `   2. Versões antigas têm CVEs de RCE pré-auth (ex: CVE-2012-2122 — auth bypass com timing)`,
      `   3. Se a auth falhar, dump completo do banco em minutos: mysqldump --all-databases`,
      `   4. Ransomware "MySQL Hijack": bots criptografam dados e deixam recado pedindo bitcoin`,
      ``,
      `Referência: CWE-284 | OWASP — Database Security`,
    ].join('\n'),
    buildSolution: (port) => [
      `AÇÃO IMEDIATA:`,
      ``,
      `1) Restrinja MySQL para localhost OU rede interna no my.cnf:`,
      `   [mysqld]`,
      `   bind-address = 127.0.0.1                # só localhost`,
      `   # OU: bind-address = 10.0.0.5           # IP da rede interna`,
      ``,
      `   sudo systemctl restart mysql`,
      ``,
      `2) Bloqueie ${port}/tcp no firewall externo:`,
      `   sudo ufw deny ${port}/tcp`,
      `   sudo iptables -A INPUT -p tcp --dport ${port} ! -s 10.0.0.0/8 -j DROP`,
      `   # AWS SG / Azure NSG: remova qualquer inbound público em ${port}`,
      ``,
      `3) Para apps que precisam de acesso remoto, use SSH tunnel:`,
      `   ssh -L 3307:localhost:${port} user@db-host`,
      `   # Conecta no localhost:3307 e o tráfego vai criptografado pelo SSH`,
      ``,
      `4) Audite usuários e remova "ANY HOST":`,
      `   SELECT User, Host FROM mysql.user;`,
      `   -- Remova entradas com Host='%' que não devem existir`,
      `   DROP USER 'usuario'@'%';`,
      ``,
      `5) Atualize MySQL para versão suportada (5.7+ ou 8.0+).`,
      ``,
      `Verificar:`,
      `   nmap -p ${port} seu-host   # deve estar filtered da internet`,
      `   mysql -h seu-host -u root -p   # deve falhar com timeout`,
    ].join('\n'),
  },
  '5432': {
    service: 'PostgreSQL',
    title: (h, p) => `PostgreSQL exposto em ${h}:${p}`,
    severity: 'CRITICAL',
    buildDescription: (host, port, version) => [
      `Localização: ${host}:${port}${version ? ` (versão detectada: ${version})` : ''}`,
      ``,
      `O servidor PostgreSQL está acessível diretamente da internet. Bancos de dados NUNCA devem ser expostos publicamente.`,
      ``,
      `Cenário de ataque:`,
      `   1. Brute force automatizado em postgres e usuários comuns`,
      `   2. CVEs de auth bypass em versões antigas`,
      `   3. Se autenticar, atacante usa "COPY ... FROM PROGRAM" (PostgreSQL 9.3+) para RCE no servidor`,
      `   4. Dump completo: pg_dumpall -h alvo`,
      ``,
      `Referência: CWE-284 | CVE-2019-9193 (RCE via COPY FROM PROGRAM)`,
    ].join('\n'),
    buildSolution: (port) => [
      `AÇÃO IMEDIATA:`,
      ``,
      `1) Restrinja em postgresql.conf:`,
      `   listen_addresses = 'localhost'           # só localhost`,
      `   # OU: listen_addresses = '10.0.0.5'      # IP interno específico`,
      ``,
      `2) Restrinja em pg_hba.conf (auth por host):`,
      `   # NEGAR todo acesso público:`,
      `   host all all 0.0.0.0/0 reject`,
      `   # PERMITIR só rede interna:`,
      `   host all all 10.0.0.0/8 scram-sha-256`,
      ``,
      `   sudo systemctl restart postgresql`,
      ``,
      `3) Bloqueie ${port}/tcp no firewall externo:`,
      `   sudo ufw deny ${port}/tcp`,
      `   # AWS RDS: configure security group sem inbound público`,
      ``,
      `4) Para acesso remoto legítimo: SSH tunnel ou VPN.`,
      ``,
      `5) Force scram-sha-256 (não md5):`,
      `   # postgresql.conf:`,
      `   password_encryption = scram-sha-256`,
      ``,
      `6) Atualize para versão suportada (13+).`,
      ``,
      `Verificar:`,
      `   nmap -p ${port} seu-host   # filtered/closed da internet pública`,
    ].join('\n'),
  },
  '6379': {
    service: 'Redis',
    title: (h, p) => `Redis exposto em ${h}:${p}`,
    severity: 'CRITICAL',
    buildDescription: (host, port, version) => [
      `Localização: ${host}:${port}${version ? ` (versão detectada: ${version})` : ''}`,
      ``,
      `Redis em sua configuração padrão NÃO TEM autenticação. Exposto publicamente, qualquer pessoa na internet tem acesso completo de leitura/escrita.`,
      ``,
      `Cenário de ataque (clássico, ainda funciona em milhares de hosts):`,
      `   1. Atacante conecta: redis-cli -h alvo`,
      `   2. Verifica se não há senha: AUTH (sem senha) → OK`,
      `   3. Lê dados sensíveis (sessions, cache de queries, tokens)`,
      `   4. RCE via CONFIG SET dir + SAVE: escreve chaves SSH em ~/.ssh/authorized_keys → login SSH`,
      `   5. Ou exploit em Lua scripting: EVAL "..."  → RCE`,
      `   6. Ransomware: FLUSHALL e mensagem pedindo bitcoin`,
      ``,
      `Referência: Redis Security Docs | CVE-2022-0543 (RCE via Lua sandbox escape)`,
    ].join('\n'),
    buildSolution: (port) => [
      `AÇÃO IMEDIATA:`,
      ``,
      `1) Configure senha em /etc/redis/redis.conf:`,
      `   # gere senha forte:`,
      `   openssl rand -base64 48`,
      ``,
      `   # adicione/edite:`,
      `   requirepass "SUA_SENHA_AQUI"`,
      `   bind 127.0.0.1 ::1                    # só localhost`,
      `   protected-mode yes`,
      ``,
      `   sudo systemctl restart redis`,
      ``,
      `2) Bloqueie ${port}/tcp no firewall:`,
      `   sudo ufw deny ${port}/tcp`,
      `   sudo iptables -A INPUT -p tcp --dport ${port} ! -s 127.0.0.1 -j DROP`,
      ``,
      `3) Renomeie comandos perigosos (defense in depth):`,
      `   # redis.conf:`,
      `   rename-command FLUSHALL ""`,
      `   rename-command FLUSHDB ""`,
      `   rename-command CONFIG ""`,
      `   rename-command EVAL ""`,
      ``,
      `4) Para acesso entre máquinas use TLS (Redis 6+):`,
      `   tls-port ${port}`,
      `   port 0   # desabilita conexão sem TLS`,
      `   tls-cert-file /path/redis.crt`,
      `   tls-key-file /path/redis.key`,
      ``,
      `5) Atualize Redis para 6.x ou 7.x (suporta ACL granular).`,
      ``,
      `Verificar:`,
      `   redis-cli -h seu-host -p ${port} ping   # da internet, deve dar timeout`,
      `   redis-cli -h localhost -p ${port}        # local, deve pedir AUTH`,
    ].join('\n'),
  },
  '27017': {
    service: 'MongoDB',
    title: (h, p) => `MongoDB exposto em ${h}:${p}`,
    severity: 'CRITICAL',
    buildDescription: (host, port, version) => [
      `Localização: ${host}:${port}${version ? ` (versão detectada: ${version})` : ''}`,
      ``,
      `MongoDB exposto publicamente é o vetor mais clássico de leaks massivos da década:`,
      `   - 2017: 26.000 servidores MongoDB sem auth foram tomados por ransomware "MongoLock"`,
      `   - 2019: leak de 763 milhões de emails (Verifications.io)`,
      `   - Recorrente: bots automatizados varrem 27017/tcp 24/7`,
      ``,
      `Versões antigas (<3.6) vinham SEM autenticação por padrão.`,
      ``,
      `Cenário de ataque:`,
      `   1. mongo --host alvo  →  conecta sem auth`,
      `   2. show dbs  →  lista todas as bases`,
      `   3. mongodump --host alvo  →  dump completo em minutos`,
      `   4. Ou: db.dropDatabase() + mensagem pedindo bitcoin`,
      ``,
      `Referência: CWE-284 | MongoDB Security Checklist`,
    ].join('\n'),
    buildSolution: (port) => [
      `AÇÃO IMEDIATA:`,
      ``,
      `1) Habilite autenticação em /etc/mongod.conf:`,
      `   security:`,
      `     authorization: enabled`,
      `   net:`,
      `     bindIp: 127.0.0.1                    # só localhost`,
      `     # OU: bindIp: 127.0.0.1,10.0.0.5     # localhost + rede interna`,
      ``,
      `   sudo systemctl restart mongod`,
      ``,
      `2) Crie usuário admin (antes de habilitar auth, ou use localhost exception):`,
      `   mongo`,
      `   > use admin`,
      `   > db.createUser({ user: "admin", pwd: passwordPrompt(), roles: ["root"] })`,
      ``,
      `3) Bloqueie ${port}/tcp no firewall externo:`,
      `   sudo ufw deny ${port}/tcp`,
      `   # AWS/Azure: remova inbound público do security group`,
      ``,
      `4) Use TLS para conexões cliente:`,
      `   net:`,
      `     tls:`,
      `       mode: requireTLS`,
      `       certificateKeyFile: /path/mongo.pem`,
      ``,
      `5) Use MongoDB Atlas se possível (cloud gerenciado, com auth/TLS forçados).`,
      ``,
      `Verificar:`,
      `   mongo --host seu-host:${port}   # da internet, deve dar timeout`,
    ].join('\n'),
  },
  '9200': {
    service: 'Elasticsearch',
    title: (h, p) => `Elasticsearch exposto em ${h}:${p}`,
    severity: 'CRITICAL',
    buildDescription: (host, port, version) => [
      `Localização: ${host}:${port}${version ? ` (versão detectada: ${version})` : ''}`,
      ``,
      `Elasticsearch (versões open-source antigas) não tem autenticação por padrão. Exposto, qualquer pessoa pode ler/escrever em todos os índices via API REST simples.`,
      ``,
      `Cenário de ataque:`,
      `   1. curl http://alvo:${'9200'}/_cat/indices  →  lista todos os índices`,
      `   2. curl http://alvo:${'9200'}/INDEX/_search  →  exporta tudo`,
      `   3. CVE-2015-1427 (Groovy RCE), CVE-2014-3120 (RCE via dynamic scripting)`,
      `   4. Ransomware "Meow attack": deleta índices em massa`,
      ``,
      `Histórico: Adobe (2018), Yahoo Japan (2020), e centenas de outras empresas vazaram dados via Elasticsearch público.`,
      ``,
      `Referência: CVE-2015-1427 | Elastic Security Docs`,
    ].join('\n'),
    buildSolution: (port) => [
      `AÇÃO IMEDIATA:`,
      ``,
      `1) Habilite X-Pack Security (gratuito desde Elastic 6.8/7.1):`,
      `   # elasticsearch.yml:`,
      `   xpack.security.enabled: true`,
      `   xpack.security.transport.ssl.enabled: true`,
      `   network.host: 127.0.0.1                # só localhost`,
      ``,
      `2) Defina senhas iniciais:`,
      `   bin/elasticsearch-setup-passwords interactive`,
      ``,
      `3) Bloqueie ${port}/tcp no firewall externo:`,
      `   sudo ufw deny ${port}/tcp`,
      ``,
      `4) Para acesso de apps, use API key ou usuário restrito (não elastic).`,
      ``,
      `5) Se usar OpenSearch (fork da AWS), habilite OpenSearch Security Plugin.`,
      ``,
      `6) Atualize: versões <7.1 não têm security gratuito — migre.`,
      ``,
      `Verificar:`,
      `   curl http://seu-host:${port}/_cat/indices   # deve dar timeout ou 401`,
    ].join('\n'),
  },
  '11211': {
    service: 'Memcached',
    title: (h, p) => `Memcached exposto em ${h}:${p}`,
    severity: 'HIGH',
    buildDescription: (host, port, version) => [
      `Localização: ${host}:${port}${version ? ` (versão detectada: ${version})` : ''}`,
      ``,
      `Memcached não tem autenticação nativa. Exposto publicamente:`,
      `   1. Atacantes leem/escrevem dados em cache (sessões, queries)`,
      `   2. Vetor de DDoS amplificação via UDP: ataques de 1.7 Tbps registrados (GitHub 2018, CVE-2018-1000115)`,
      `   3. Pode revelar dados sensíveis em cache`,
      ``,
      `Referência: CVE-2018-1000115 | US-CERT TA18-052A`,
    ].join('\n'),
    buildSolution: (port) => [
      `AÇÃO IMEDIATA:`,
      ``,
      `1) Configure bind apenas em localhost. Edite /etc/memcached.conf:`,
      `   -l 127.0.0.1`,
      `   -U 0                                    # desabilita UDP (anti-amplificação)`,
      ``,
      `   sudo systemctl restart memcached`,
      ``,
      `2) Bloqueie ${port}/tcp E ${port}/udp no firewall:`,
      `   sudo ufw deny ${port}/tcp`,
      `   sudo ufw deny ${port}/udp`,
      ``,
      `3) Se versão >=1.5.13, use SASL para auth:`,
      `   memcached -S -B binary  -l 10.0.0.5  -p ${port}`,
      ``,
      `4) Migre para Redis com auth se possível — Memcached é legado.`,
      ``,
      `Verificar:`,
      `   echo "stats" | nc seu-host ${port}   # da internet, deve dar timeout`,
    ].join('\n'),
  },
  '21': {
    service: 'FTP',
    title: (h, p) => `FTP exposto em ${h}:${p}`,
    severity: 'MEDIUM',
    buildDescription: (host, port, version) => [
      `Localização: ${host}:${port}${version ? ` (versão detectada: ${version})` : ''}`,
      ``,
      `FTP transmite credenciais e dados em TEXTO PURO. Protocolo dos anos 80, sem criptografia, com problemas conhecidos (PASV connection hijacking, anonymous logins inseguros).`,
      ``,
      `Cenário de ataque:`,
      `   1. Sniffing de credenciais em redes hostis (idêntico a Telnet)`,
      `   2. Brute force automatizado (Hydra, Medusa) — milhões de tentativas/hora`,
      `   3. Anonymous login (anonymous/qualquer) ainda habilitado em muitos servidores`,
      `   4. CVEs históricas em vsftpd, ProFTPD, etc.`,
      ``,
      `Referência: CWE-319 | RFC 2577 (FTP Security Considerations)`,
    ].join('\n'),
    buildSolution: (port) => [
      `Como corrigir:`,
      ``,
      `OPÇÃO A — Migrar para SFTP (recomendado, usa SSH na porta 22):`,
      `   # SFTP é nativo do OpenSSH server. Configure em /etc/ssh/sshd_config:`,
      `   Subsystem sftp internal-sftp`,
      `   Match Group sftpusers`,
      `       ChrootDirectory /home/%u`,
      `       ForceCommand internal-sftp`,
      `       AllowTcpForwarding no`,
      ``,
      `OPÇÃO B — Usar FTPS (FTP sobre TLS) se precisa manter FTP:`,
      `   # vsftpd.conf:`,
      `   ssl_enable=YES`,
      `   force_local_data_ssl=YES`,
      `   force_local_logins_ssl=YES`,
      `   ssl_tlsv1_2=YES`,
      `   ssl_sslv3=NO`,
      `   ssl_tlsv1=NO`,
      `   anonymous_enable=NO`,
      `   rsa_cert_file=/etc/ssl/private/vsftpd.pem`,
      ``,
      `OPÇÃO C — Desabilitar completamente:`,
      `   sudo systemctl stop vsftpd && sudo systemctl disable vsftpd`,
      `   sudo ufw deny ${port}/tcp`,
      ``,
      `Verificar:`,
      `   nmap -p ${port} seu-host`,
    ].join('\n'),
  },
  '3389': {
    service: 'RDP',
    title: (h, p) => `RDP (Remote Desktop) exposto em ${h}:${p}`,
    severity: 'HIGH',
    buildDescription: (host, port, version) => [
      `Localização: ${host}:${port}${version ? ` (versão detectada: ${version})` : ''}`,
      ``,
      `RDP exposto publicamente é alvo CONSTANTE de ataques. Estatísticas conhecidas:`,
      `   - Honeypots registram dezenas de milhares de tentativas de brute force/dia em IPs com 3389 aberto`,
      `   - BlueKeep (CVE-2019-0708): RCE pré-auth wormable em Windows 7/2008`,
      `   - DejaBlue (CVE-2019-1181/1182): mesma classe, Windows 10/Server 2019`,
      `   - Esprayed credential stuffing com listas de senhas vazadas`,
      ``,
      `Cenário de ataque: ransomware moderno (Conti, REvil, BlackCat) entra majoritariamente via RDP comprometido — credenciais fracas ou exploits.`,
      ``,
      `Referência: CVE-2019-0708 (BlueKeep) | Microsoft RDP Security Best Practices`,
    ].join('\n'),
    buildSolution: (port) => [
      `Como corrigir:`,
      ``,
      `1) NUNCA exponha RDP diretamente. Use UMA das opções:`,
      ``,
      `   OPÇÃO A — VPN (mais segura):`,
      `   - Configure WireGuard, OpenVPN, ou Tailscale`,
      `   - Conecte na VPN primeiro, depois RDP no IP interno`,
      ``,
      `   OPÇÃO B — RD Gateway (Microsoft):`,
      `   - Configura HTTPS na porta 443 → encapsula RDP`,
      `   - Permite 2FA via Azure MFA`,
      ``,
      `   OPÇÃO C — Restrinja por IP de origem:`,
      `   - AWS Security Group: inbound ${port}/tcp source = IP_DO_ESCRITORIO/32`,
      `   - Windows Firewall: New-NetFirewallRule -RemoteAddress IP_PERMITIDO`,
      ``,
      `2) Habilite Network Level Authentication (NLA):`,
      `   # GUI: System Properties → Remote tab → "Allow connections only from computers running Remote Desktop with NLA"`,
      `   # PowerShell:`,
      `   Set-ItemProperty -Path 'HKLM:\\System\\CurrentControlSet\\Control\\Terminal Server\\WinStations\\RDP-Tcp' -Name 'UserAuthentication' -Value 1`,
      ``,
      `3) Habilite 2FA via Azure AD MFA, Duo Security, ou similar.`,
      ``,
      `4) Account Lockout Policy: trava conta após 3-5 tentativas erradas.`,
      ``,
      `5) Aplique TODOS os patches de Windows (especialmente CVE-2019-0708 e atualizações mensais).`,
      ``,
      `6) Mude porta padrão (ofuscação, não segurança real, mas reduz ruído de bots):`,
      `   reg add "HKLM\\System\\CurrentControlSet\\Control\\Terminal Server\\WinStations\\RDP-Tcp" /v PortNumber /t REG_DWORD /d <PORTA_NOVA>`,
      ``,
      `Verificar: nmap -p ${port} seu-host (após mudanças, deve estar filtered da internet)`,
    ].join('\n'),
  },
};

const SCAN_PROFILES: Record<ScanMode, { flags: string[]; ports: string; timeout: number }> = {
  BASIC: {
    flags: ['--unprivileged', '-sT', '--open', '-T4', '--host-timeout', '10s', '--max-retries', '1'],
    ports: '21,23,80,443,445,3306,3389,5432,6379,9200,11211,27017',
    timeout: 25000,
  },
  AGGRESSIVE: {
    flags: ['--unprivileged', '-sT', '-sV', '--open', '-T4', '--host-timeout', '30s', '--max-retries', '2'],
    ports: '21,23,25,53,80,110,143,443,445,587,993,995,1433,1521,2375,2376,3306,3389,5432,5900,5984,6379,7001,7474,8000,8080,8443,8888,9000,9042,9092,9200,9300,11211,15672,27017,28017',
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
      ], { timeout: profile.timeout, maxBuffer: 10 * 1024 * 1024 });

      if (stderr) console.warn(`[NMAP] stderr: ${stderr}`);
      console.log(`[NMAP] Raw output length: ${stdout.length} bytes`);

      const vulns = this.parseNmapOutput(stdout, sanitizedHost);
      console.log(`[NMAP] Parsed ${vulns.length} vulnerabilities for ${sanitizedHost}: ${vulns.map(v => v.title).join(', ') || 'none'}`);
      return vulns;
    } catch (err: any) {
      console.error(`[NMAP] Scan FAILED for ${sanitizedHost}: ${err.message || err}`);
      if (err.stderr) console.error(`[NMAP] stderr: ${err.stderr}`);
      if (err.killed) console.error(`[NMAP] Process was killed (timeout?)`);
      return [];
    }
  }

  private sanitizeHostname(hostname: string): string | null {
    const safe = /^[a-zA-Z0-9.\-]+$/.test(hostname);
    if (!safe) return null;
    if (hostname.length > 253) return null;
    return hostname;
  }

  private extractServiceVersion(xml: string, port: string): string {
    // Match <port portid="N">... <service product="X" version="Y" .../>
    const portBlockRegex = new RegExp(`<port[^>]*portid="${port}"[\\s\\S]*?</port>`, 'i');
    const block = xml.match(portBlockRegex)?.[0] || '';
    if (!block) return '';
    const product = block.match(/product="([^"]+)"/)?.[1] || '';
    const version = block.match(/\sversion="([^"]+)"/)?.[1] || '';
    const extraInfo = block.match(/extrainfo="([^"]+)"/)?.[1] || '';
    return [product, version, extraInfo].filter(Boolean).join(' ').trim();
  }

  private parseNmapOutput(xml: string, host: string): VulnRaw[] {
    const vulns: VulnRaw[] = [];

    for (const [port, info] of Object.entries(DANGEROUS_PORTS)) {
      const portRegex = new RegExp(`portid="${port}"[^>]*?\\sstate="open"|<state\\s+state="open"[^>]*\\/>\\s*<service[^>]*portid="${port}"`);
      const altRegex = new RegExp(`<port[^>]*portid="${port}"[^>]*>\\s*<state[^>]*state="open"`);
      if (portRegex.test(xml) || altRegex.test(xml)) {
        const version = this.extractServiceVersion(xml, port);
        vulns.push({
          title: info.title(host, port),
          severity: info.severity,
          description: info.buildDescription(host, port, version),
          solution: info.buildSolution(port),
        });
      }
    }

    return vulns;
  }
}
