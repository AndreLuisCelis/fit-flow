# FitFlow

FitFlow é uma aplicação web de registro e acompanhamento de treinos de musculação. Ela permite escolher ou gerar rotinas, registrar séries durante uma sessão, acompanhar indicadores de progresso e instalar a interface como Progressive Web App (PWA).

## Objetivos e público

A aplicação é voltada a pessoas que querem organizar seus treinos, acompanhar cargas e volume, e consultar o histórico sem depender de uma conta ou de um banco de dados remoto. A interface oferece português e inglês e permite exibir cargas em quilogramas ou libras.

## Funcionalidades

- **Onboarding e perfil:** cadastro inicial em etapas, com nome, um ou mais objetivos, experiência e equipamentos; peso e altura são opcionais. O perfil pode ser consultado e editado posteriormente.
- **Rotinas:** catálogo de treinos predefinidos, com busca e filtros por categoria, músculos trabalhados, duração, dificuldade e exercícios.
- **Treino ativo:** registro de séries, repetições, carga e RPE; inclusão de séries; notas por exercício; navegação entre exercícios; alternância entre kg e lb.
- **Descanso:** temporizador integrado ao registro de séries, com controles para pausar, retomar, ajustar o tempo ou pular o descanso.
- **Recordes e resumo:** identificação visual de recordes pessoais, feedback sonoro e animações; ao concluir, a sessão gera um resumo com duração, volume, séries, repetições e XP.
- **Treinador e gerador de rotinas:** seleção de foco muscular, duração, equipamentos, fadiga e objetivo. A geração usa a API Gemini quando configurada e tem uma rotina alternativa no servidor quando a chave não está disponível ou a chamada falha.
- **Progresso:** histórico de sessões, gráficos de carga e estimativa de 1RM, indicadores por grupo muscular, galeria de recordes e exportação do histórico para CSV.
- **Gamificação:** XP, níveis, sequência de treinos, emblemas, proteção de sequência e recompensa por meta diária de volume.
- **Preferências:** idioma, unidade de carga, efeitos sonoros e perfil de treino, com persistência local.
- **PWA e uso offline:** interface instalável em dispositivos compatíveis, service worker e indicador de conectividade. Os dados salvos localmente continuam disponíveis no navegador; a geração online via Gemini depende de conexão.

## Tecnologias e bibliotecas

| Tecnologia | Uso |
| --- | --- |
| React 19 | Componentes e interface da aplicação. |
| TypeScript | Tipos para rotinas, exercícios, sessões, estatísticas e demais dados. |
| Vite | Ferramentas de desenvolvimento e build do frontend. |
| Express | Servidor Node.js e endpoint de geração de rotinas. |
| `tsx` | Execução do servidor TypeScript durante o desenvolvimento. |
| Tailwind CSS 4 | Estilização utilitária, integrada ao Vite. |
| `@google/genai` | Integração do servidor com a API Gemini. |
| IndexedDB | Persistência local de rotinas, exercícios e histórico de sessões. |
| LocalStorage | Preferências, estatísticas e emblemas do usuário. |
| Recharts | Gráficos de progressão de carga. |
| `lucide-react` | Ícones da interface. |
| Framer Motion | Transições e animações de interface. |
| `canvas-confetti` | Efeitos visuais para recordes e conquistas. |
| `vite-plugin-pwa` e Workbox | Manifesto, service worker e cache de recursos do PWA. |

## Organização do código

- [`src/App.tsx`](src/App.tsx): estado principal, navegação, preferências e conclusão de sessões.
- [`src/components/`](src/components/): telas e componentes, incluindo treino ativo, rotinas, treinador, análise, gamificação e temporizador.
- [`src/data/presetRoutines.ts`](src/data/presetRoutines.ts): rotinas, exercícios e dados iniciais.
- [`src/db/indexedDb.ts`](src/db/indexedDb.ts): acesso ao IndexedDB e carga de dados predefinidos.
- [`src/types/workout.ts`](src/types/workout.ts): modelos TypeScript da aplicação.
- [`src/hooks/`](src/hooks/): hooks de conectividade e instalação do PWA.
- [`server.ts`](server.ts): servidor Express e integração com Gemini.
- [`vite.config.ts`](vite.config.ts): plugins React, Tailwind e PWA.

## Dados e persistência

Rotinas, exercícios e histórico de sessões são armazenados no IndexedDB do navegador. O perfil usa a chave `fitflow_profile_v1` no LocalStorage; preferências, estatísticas de gamificação e emblemas também usam LocalStorage. Perfis antigos com um único objetivo são atualizados ao serem lidos. Esses dados ficam no perfil do navegador e não são sincronizados entre dispositivos por um backend. Nome, peso e altura não são enviados ao serviço de geração; somente objetivos, nível de experiência e equipamentos são usados para personalizar os treinos.

Ao inicializar um banco vazio, a aplicação inclui rotinas, exercícios e algumas sessões de exemplo. Além disso, algumas séries de progressão, volumes semanais e indicadores de recuperação exibidos nas análises são dados demonstrativos definidos no código; não representam necessariamente cálculos derivados de todo o histórico pessoal.

## Configuração e execução local

**Pré-requisito:** Node.js e npm.

```bash
npm install
npm run dev
```

O servidor de desenvolvimento usa a porta `3000` por padrão. Acesse [http://localhost:3000](http://localhost:3000). A porta pode ser alterada pela variável de ambiente `PORT`.

Para habilitar a geração com Gemini, defina `GEMINI_API_KEY` em um arquivo `.env` na raiz do projeto. Sem essa chave, o endpoint responde com a rotina alternativa local.

Comandos adicionais:

```bash
npm run build    # gera a versão de produção
npm run preview  # pré-visualiza a build
npm run lint     # verifica os tipos TypeScript
```

## Observações

- O projeto não implementa autenticação nem sincronização em nuvem.
- Os dados locais podem ser removidos ao limpar os dados do site no navegador.
- A aplicação contém exemplos predefinidos para facilitar a demonstração inicial.