# Motion Design no Vintage Story Codex Brasil

## O que mudou
A versão usa os conceitos de interação que você mostrou no UberDesigner, adaptados para o universo de Vintage Story. Não foi importado ou copiado o código dos templates anexados.

| Referência | Recurso introduzido | Arquivo |
| --- | --- | --- |
| Card dobrável | Painel dia/noite com capa 3D e três indicadores que surgem em sequência | `app.js`, `motion.css` |
| Interruptor de vidro | Controle claro/escuro no cabeçalho com lente, marcas e lua/sol | `app.js`, `motion.css` |
| Explicação em etapas | Sequência interativa de 3 estágios na homepage | `app.js`, `motion.css` |
| Explicação em etapas para artigos | Índice opcional de começo / desenvolvimento / parte final, **exibido apenas se o artigo original da wiki tiver três ou mais títulos H2** | `app.js`, `motion.css` |
| Ghost Buddy | Ressonância temporal decorativa no hero, que responde à posição do cursor | `app.js`, `motion.css` |
| Warp Cards | Perspectiva leve nos cards da progressão, sem WebGL | `motion.css` |
| Melune | Revelação de seções conforme a rolagem, sem rolagem presa | `app.js`, `motion.css` |

## Importante sobre os tutoriais
O site NÃO recebeu automaticamente um tutorial completo para todos os artigos. Isso exige extração editorial dos passos e revisão de conteúdo, inclusive da tradução. A trilha de leitura usa títulos reais do artigo para facilitar navegar; ela não deve ser confundida com instruções de crafting.

## Implementação e teste
```bash
npm run build
npm start
```
Depois abra `http://localhost:4173`, role até as seções de dia/noite e trilha, e teste os controles. O build estático inclui a folha `src/motion.css`.

## Deploy Vercel
Usar Framework Preset `Other`, Build Command `npm run build`, Output Directory `dist`. Não modifique `vercel.json` nem `api/` por conta destas animações.

## Como publicar sem perder alterações locais
Sempre revise `git diff` antes de commitar. Esta atualização modifica `index.html` e `src/app.js`, além de adicionar `src/motion.css`, `AGENTS.md` e este guia.
