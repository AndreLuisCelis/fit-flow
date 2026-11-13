# Pipeline de Mídia de Exercícios — Fit Flow

Este documento define o pipeline reproduzível em lote para geração, padronização, hospedagem externa, verificação HTTP e liberação de exercícios para seleção pela IA Gemini no **Fit Flow**.

---

## 1. Decisões Arquiteturais

1. **Formato principal estático (Obrigatório):** `WebP` (preferencial) ou `AVIF`, com dimensão padronizada `768×512` (3:2) e tamanho alvo `<= 60 KB` por exercício.
2. **Animação opcional:** `WebM` (VP9) ou `MP4` curto em loop (`2–4s`, `<= 250 KB`, sem áudio). **GIF não é utilizado** pelo peso elevado e baixa eficiência de compressão. Nem todo exercício exige animação — a imagem estática `WebP` funciona como fallback universal.
3. **Zero ativos de exercício no bundle PWA:** Nenhuma imagem de exercício fica em `public/` ou importada via bundler. O `Workbox` em `vite.config.ts` armazena apenas o shell da aplicação; os ativos de exercício residem em CDN externo com URLs imutáveis e versionadas:
   - Imagem principal: `https://cdn.fitflow.celisapp.com/exercises/v1/{exerciseId}.webp`
   - Animação opcional: `https://cdn.fitflow.celisapp.com/exercises/v1/{exerciseId}.webm`
4. **Zero geração em runtime e zero dependências pagas no app:** O cliente e o servidor do Fit Flow não invocam APIs de geração de imagem em tempo real. Toda produção visual ocorre **offline, em lote, por processo editorial/build**.

---

## 2. Avaliação do Ecossistema Google / Gemini para Produção em Lote

| Opção avaliada | Uso recomendado no pipeline | Prós | Limitações / Cuidados |
| :--- | :--- | :--- | :--- |
| **Geração em lote offline via Google Imagen 3 / Gemini Image Generation** | Geração inicial de ilustrações anatômicas estilizadas a partir de prompts padronizados por grupo muscular | Consistência visual com tema dark/volt, geração rápida dos 90 exercícios em lote, baixo custo único de lote | Exige revisão biomecânica humana antes da publicação para evitar artefatos anatômicos (pegadas, alinhamento articular ou equipamentos incorretos) |
| **Ativos vetoriais autorais / abertos (SVG -> WebP/WebM)** | Fallback curado para movimentos compostos complexos onde precisão articular é crítica | Controle anatômico exato, zero alucinação de equipamento, fácil edição de postura inicial/final | Maior esforço manual por exercício caso não haja biblioteca base padronizada |

**Estratégia adotada:** pipeline híbrido em lote offline (SVG vetorial curado ou geração em lote via Imagen/Gemini Image offline com prompt fixo de estilo técnico **Fit Flow**), **sempre seguido de conversão para WebP, revisão biomecânica e verificação HTTP automática** antes de marcar `status: 'published'`.

---

## 3. Regra de Elegibilidade para a IA Gemini

O sistema distingue explicitamente quatro estados no catálogo (`src/types/workout.ts` e `src/utils/workoutPersonalization.ts`):

1. **Exercício cadastrado (`registered`):** existe em `EXERCISE_DATABASE` com ID único, nomes PT/EN, músculos, equipamento, guia de execução e erros comuns.
2. **Com metadados de mídia (`hasExerciseMediaMetadata`):** possui estrutura `media` válida (`imageUrl` HTTPS, `alt`, `mediaType`, `assetId`, `version`), podendo estar com `status: 'planned'`.
3. **Com mídia publicada e verificada (`hasVerifiedExerciseMedia`):** `media.status === 'published'` **e** `media.verifiedAt` com timestamp ISO-8601 válido obtido após verificação HTTP real (`200 OK` e `Content-Type: image/*`).
4. **Elegível para seleção pela IA (`eligibleForAi`):** atende aos 3 critérios anteriores **e** é compatível com os equipamentos disponíveis do usuário.

### Comportamento de Segurança Atual

- Enquanto os ativos no CDN `cdn.fitflow.celisapp.com/exercises/v1/*` não estiverem publicados e verificados (`publishedAndVerified = 0` de `90`), `getEligibleCatalogExercises(...)` retorna vazio (`[]`).
- Nessa condição, `src/server/workoutService.ts` **não envia exercícios sem mídia verificada para o Gemini** e utiliza diretamente o **motor determinístico local (`generateProfileFallback`)** mantendo o app 100% funcional sem quebrar rotinas ou UX.
- Quando os primeiros ativos forem publicados e verificados, apenas esses IDs passam a integrar o catálogo elegível enviado ao prompt do Gemini, e `validateGeneratedWorkout` rejeita automaticamente qualquer resposta da IA que referencie IDs com `status !== 'published'`.

---

## 4. Pipeline Reproduzível de 8 Etapas

1. **Exportar manifesto de pendências:**
   ```bash
   corepack pnpm media:validate -- --write-report
   ```
   Gera `docs/media/exercise-media-manifest.json` e `docs/media/exercise-media-report.json` listando todos os exercícios sem mídia publicada (`status: 'planned'`).
2. **Produzir lote offline (`master/png` ou `master/svg`):** gerar ou ilustrar os ativos listados em `exercisesWithoutPublishedMedia`, seguindo guia visual técnico (fundo `#0A0F1D`, destaque anatômico `#CCFF00` / `#38BDF8`, postura limpa sem texto embutido).
3. **Revisão biomecânica:** validar alinhamento articular, equipamento correto (`bodyweight`, `pull_up_bar`, `dumbbell`, `barbell`, `machine`, `cable`, `bands`) e coerência com `commonMistakes`.
4. **Transcodificação e otimização:** converter originais para `WebP` (qualidade ~82, `768×512`, `<= 60 KB`; opcionalmente `WebM` `<= 250 KB`) mantendo nome exato `{exerciseId}.webp`.
5. **Upload versionado para CDN:** publicar em `cdn.fitflow.celisapp.com/exercises/v1/` com cabeçalhos `Cache-Control: public, max-age=31536000, immutable` e `CORS` liberado para o domínio da aplicação.
6. **Verificação HTTP real:** validar acessibilidade e `Content-Type` em lote:
   ```bash
   corepack pnpm media:validate -- --check-network --write-report
   ```
7. **Promoção no catálogo:** para cada ativo confirmado com `HTTP 200`, atualizar `status: 'published'`, `verifiedAt: '<ISO-8601>'` e `source: '<lote>'` em `src/data/exerciseCatalog.ts`.
8. **Gate de CI/Build:** rodar `corepack pnpm media:validate`, `corepack pnpm test`, `corepack pnpm lint` e `corepack pnpm build`. Qualquer ativo marcado como `'published'` sem `verifiedAt` válido ou que falhe no `--check-network` bloqueia a validação.
