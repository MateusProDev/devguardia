# DevGuardia Marketplace — Plano de Implementação

> **Arquitetura**: non-custodial. Plataforma nunca toca em dinheiro de produtos.
> Pagamentos de produtos vão DIRETO do comprador para o vendedor.
> Plataforma se sustenta com **contribuições mensais voluntárias** dos vendedores.

---

## 1. Princípios

- **Sem custódia**: plataforma só intermedia informação (catálogo + verificação)
- **Sem KYC**: comprador autentica com email; vendedor só fornece endereço de pagamento
- **Sem afiliados**: simplicidade no MVP
- **Compradores usam grátis**: não pagam nada à plataforma
- **Vendedores contribuem voluntariamente**: R$ 10, 20, 30 ou 50/mês em XMR ou PIX
- **Anonimato preservado**: Monero principal, PIX como alternativa pragmática

---

## 2. Fluxos de pagamento

### Compra de produto — Monero (auto-confirmado)
1. Vendedor configura no painel: `moneroMainAddress` + `moneroViewKey`
2. Comprador inicia compra → backend gera subaddress determinístico (ainda da carteira do vendedor)
3. Comprador paga para o subaddress (XMR vai DIRETO para vendedor)
4. Worker polleia rede via nó público a cada 30s usando view-key
5. Quando saldo recebido >= valor + 10 confirmações → status `CONFIRMED` → libera acesso

### Compra de produto — PIX (semi-manual)
1. Vendedor configura: `pixKey` + tipo + nome do beneficiário + (opcional) QR estático
2. Comprador vê chave PIX + valor exato → paga no app do banco
3. Comprador clica "Paguei" → status `PAYMENT_CLAIMED` (24h até expirar)
4. Vendedor recebe notificação → confirma manualmente → libera acesso
5. Disputa: chat simples (futuro)

### Contribuição mensal de vendedor — XMR/PIX para a PLATAFORMA
- Tiers: **R$ 10**, **R$ 20**, **R$ 30**, **R$ 50** por mês
- Vendedor escolhe tier no painel → escolhe método (XMR ou PIX)
- XMR: subaddress da carteira da PLATAFORMA → confirmação automática
- PIX: chave PIX da plataforma → vendedor clica "Paguei" → admin confirma
- Status `ACTIVE` por 30 dias após confirmação
- **Contribuição é OPCIONAL** — vendedor sem contribuição ativa pode usar a plataforma normalmente
- Vendedor com contribuição ativa ganha badge "Supporter" (futuro: features extras)

---

## 3. Schema (resumo)

| Model | Função |
|---|---|
| `CreatorProfile` | Perfil de vendedor + config Monero (mainaddr + viewkey) + config PIX |
| `Product` | Curso/Ebook/Mentoria com preço em XMR e/ou PIX |
| `Module` / `Lesson` | Estrutura interna de cursos |
| `EbookFile` | Storage key (R2) do PDF |
| `MentorshipDetails` | Duração, formato, instruções de agendamento |
| `Purchase` | Compra com método, status, dados Monero/PIX |
| `Contribution` | Contribuição mensal do vendedor para a plataforma |
| `Review` | Avaliação 1-5 estrelas |

---

## 4. Fases

### Fase 1 — Foundation (em progresso)
- [x] Plano documentado
- [x] Schema Prisma estendido (sem afiliados)
- [ ] Migration aplicada
- [ ] MoneroService (geração de subaddress via view-key + monitoramento)
- [ ] Backend: módulo creators (config XMR/PIX)
- [ ] Backend: módulo products (CRUD)
- [ ] Backend: módulo purchases (criar, claim, confirm)
- [ ] Backend: módulo contributions (tier mensal vendedor → plataforma)
- [ ] Worker cron: confirmação XMR (purchases + contributions)

### Fase 2 — Frontend creator dashboard
- [ ] Página de configuração de pagamento (XMR + PIX)
- [ ] CRUD de produtos
- [ ] Builder de curso (módulos + aulas)
- [ ] Upload de arquivos (Cloudflare R2)
- [ ] Página de contribuição mensal (escolher tier + pagar)

### Fase 3 — Marketplace público + checkout
- [ ] Listagem `/marketplace`
- [ ] Página de produto `/p/[slug]`
- [ ] Checkout (escolha método, mostra dados, polling status)
- [ ] Player de curso pós-compra
- [ ] Download de ebook pós-compra

### Fase 4 — Reviews + admin
- [ ] Sistema de reviews (5 estrelas)
- [ ] Painel admin para confirmar contribuições PIX
- [ ] Notificações
- [ ] Métricas

---

## 5. Stack técnico

- **Backend**: NestJS (existente) + Prisma + Postgres (existente)
- **Worker**: Node.js (existente) + BullMQ
- **Frontend**: Next.js 14 (existente)
- **Monero**: `monero-ts` npm package + nó público (configurável)
- **Storage**: Cloudflare R2 (10GB free), abstrato em `StorageService`
- **Auth**: Firebase (existente)

---

## 6. Variáveis de ambiente novas

```
# Monero (compra de produtos vai DIRETO para vendedor — view-key fica no DB do vendedor)
MONERO_NETWORK=mainnet
MONERO_PUBLIC_NODES=https://node.monerooutreach.org:18081,https://xmr-node.cakewallet.com:18081
MONERO_CONFIRMATIONS_REQUIRED=10
MONERO_PAYMENT_WINDOW_HOURS=2

# Monero da PLATAFORMA (recebe contribuições mensais)
PLATFORM_MONERO_MAIN_ADDRESS=
PLATFORM_MONERO_VIEW_KEY=

# PIX da plataforma (recebe contribuições mensais)
PLATFORM_PIX_KEY=
PLATFORM_PIX_KEY_TYPE=EMAIL
PLATFORM_PIX_HOLDER_NAME=

# PIX (compra de produtos)
PIX_PAYMENT_WINDOW_HOURS=24

# Storage (Cloudflare R2)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=devguardia-marketplace
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

---

## 7. Observações de segurança

### Monero view-key no banco
- Vendedor cola sua **private view key** no painel
- View key permite VER transações, **não permite gastar**
- DB deve guardar criptografado at-rest (campo encriptado com chave do servidor)
- Se DB vazar, vazam apenas históricos de transações dos vendedores — não fundos
- TODO Fase 1.5: encriptação de `moneroViewKey` com `pgcrypto` ou `crypto` no app

### PIX
- Chaves PIX são públicas por design (qualquer um pode receber)
- Sem risco crítico de vazamento da chave em si
- Risco real: alguém colocar chave PIX de OUTRA pessoa para fraudar
- Mitigação: campo `pixHolderName` que deve casar com a chave (verificação manual em disputas)
