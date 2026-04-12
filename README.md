# DevGuard AI

SaaS de análise de segurança para apps web gerados por IA.

## Stack

- **Frontend**: Next.js 14 + TailwindCSS
- **Backend**: NestJS + TypeScript  
- **DB**: PostgreSQL + Prisma ORM
- **Queue**: Redis + BullMQ
- **Worker**: Node.js separado
- **Auth**: Firebase (Google login)
- **Scanner**: Nmap + análise HTTP
- **IA**: OpenAI GPT-4o-mini
- **Pagamentos**: Mercado Pago

## Setup rápido

### 1. Configurar variáveis de ambiente
```bash
cp .env.example .env
# Edite .env com suas credenciais
```

### 2. Subir via Docker
```bash
docker-compose up --build
```

### 3. Rodar migrations
```bash
cd backend
npm install
npx prisma migrate dev --name init
```

## Desenvolvimento local

### Backend
```bash
cd backend && npm install && npx prisma generate && npm run start:dev
```

### Frontend
```bash
cd frontend && npm install && npm run dev
```

### Worker
```bash
cd worker && npm install && npx prisma generate && npm run start:dev
```

## Estrutura

```
/backend   NestJS API (porta 3001)
/frontend  Next.js UI (porta 3000)
/worker    BullMQ scan worker
/docker    Dockerfiles
```

## Endpoints

POST /api/scan | GET /api/scan/:id | GET /api/report/:id
POST /api/payment/checkout | POST /api/payment/webhook
GET /api/user/subscription | GET /api/auth/me
