Cloud Function de moderação para `support_chats/{userId}/messages`

O que faz
- Executa em `onCreate` quando uma nova mensagem é escrita.
- Aplica rate-limit simples por usuário (janela de 60s, 5 mensagens).
- Detecta links e palavras-chave básicas; sinaliza mensagens suspeitas.
- Atualiza o documento com campos: `moderated`, `flagged`, `reason`.

Como usar
1) Crie/adicione este código em um projeto de Cloud Functions (pasta `functions/` do Firebase).
2) No `functions/package.json` adicione dependências:

```json
{
  "name": "functions",
  "engines": { "node": "18" },
  "dependencies": {
    "firebase-admin": "^11.0.0",
    "firebase-functions": "^4.0.0"
  }
}
```

3) Faça `npm install` dentro da pasta `functions`.
4) Faça o deploy:

```bash
firebase deploy --only functions:moderateSupportMessage
```

Notas de segurança e melhoria
- Substitua a detecção simples por um serviço de moderação (Perspective API, OpenAI + prompt de moderação, etc.).
- Ative App Check no frontend para reduzir uso abusivo.
- Para maior robustez, implemente bloqueio de IP/endpoints no backend e monitoramento.
- Essa função usa um esquema simples (array de timestamps) para rate-limit; para grande escala, prefira Redis ou regras mais eficientes.

Quer que eu gere também `package.json` e um `functions` scaffold para você? Se sim, forneça se prefere TypeScript ou JavaScript.