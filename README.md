<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# FitFlow

Aplicação web/PWA para registro de treinos, geração de rotinas e acompanhamento de progresso. O primeiro acesso coleta um perfil de treino; depois, objetivos (com seleção múltipla), experiência e equipamentos disponíveis personalizam as recomendações. Peso e altura são opcionais.

View your app in AI Studio: https://ai.studio/apps/579560a7-d8ff-400f-8cdf-d05cacec786f

Os dados do perfil ficam no `localStorage`; rotinas, exercícios e histórico ficam no IndexedDB do navegador. Nome e medidas não são enviados à API Gemini.

## Executar localmente

**Pré-requisitos:** Node.js e pnpm (ou Corepack habilitado).

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

O servidor local utiliza a porta 3000 por padrão (`http://localhost:3000`), conforme definido em `server.ts` (ou a porta informada na variável `PORT`). Para habilitar geração com Gemini, configure `GEMINI_API_KEY` em `.env`; sem a chave, a aplicação usa o mecanismo local quando houver exercícios compatíveis.

## Arquitetura da API e Deploy na Vercel

Em ambiente Vercel:
- A rota pública `POST /api/gemini/generate-workout` é encaminhada pelo rewrite definido em `vercel.json` para o handler Serverless compilado `/api/generate-workout` (`api/generate-workout.js`).
- O script de build gera os artefatos `api/generate-workout.js` e `api/gemini/generate-workout.js` a partir de `src/server/apiHandler.ts`, mantendo a paridade de rotas e o handler funcional.
- Configure `GEMINI_API_KEY` nas variáveis de ambiente do projeto na Vercel e faça um novo deploy para habilitar a geração com Gemini; sem essa variável, a função retorna a rotina de fallback local.

## Verificações

Execute as verificações do projeto com pnpm/Corepack:

```bash
corepack pnpm test
corepack pnpm lint
corepack pnpm build
```
