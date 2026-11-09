<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# FitFlow

Aplicação web/PWA para registro de treinos, geração de rotinas e acompanhamento de progresso. O primeiro acesso coleta um perfil de treino; depois, objetivos (com seleção múltipla), experiência e equipamentos disponíveis personalizam as recomendações. Peso e altura são opcionais.

View your app in AI Studio: https://ai.studio/apps/579560a7-d8ff-400f-8cdf-d05cacec786f

Os dados do perfil ficam no `localStorage`; rotinas, exercícios e histórico ficam no IndexedDB do navegador. Nome e medidas não são enviados à API Gemini.

## Executar localmente

**Pré-requisitos:** Node.js e npm.

```bash
npm install
npm run dev
```

O servidor local fica em `http://localhost:3000`. Para habilitar geração com Gemini, configure `GEMINI_API_KEY` em `.env`; sem a chave, a aplicação usa o mecanismo local quando houver exercícios compatíveis.

Na Vercel, a rota `POST /api/gemini/generate-workout` é encaminhada por `vercel.json` à função raiz `api/generate-workout.ts`, que reutiliza o handler Express. Configure `GEMINI_API_KEY` nas variáveis de ambiente do projeto e faça um novo deploy para habilitar a geração com Gemini; sem essa variável, a função retorna a rotina de fallback local.

## Verificações

```bash
npm test
npm run lint
npm run build
```
