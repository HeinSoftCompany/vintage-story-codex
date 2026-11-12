# Vintage Story Codex Brasil — orientações permanentes para agentes de código

## Missão
Uma interface comunitária para consulta à Vintage Story Wiki, fiel à linguagem visual de Vintage Story: madeira, cobre, pedra, argila, verde musgo, pergaminhos e sinais de instabilidade temporal. Modernizar a experiência de leitura sem trocar a identidade do jogo por uma estética genérica futurista.

## Fonte do projeto
- Repositório: `HeinSoftCompany/vintage-story-codex`.
- Base atual: JavaScript com módulos ES, CSS puro, servidor local Node.js e build estático para Vercel. **Não é um projeto React/Vite**, apesar de alguns prompts de referência serem.
- Preservar `src/api.js`, `src/data.js`, roteamento, busca, favoritos, navbar, sidebar, sanitização de artigos, responsividade, integração com MediaWiki e build para Vercel.
- Antes de mudanças grandes, revisar os arquivos existentes; nunca substituir o projeto por um scaffold de template.

## Motion design — diretrizes baseadas nos exemplos compartilhados
1. **Fold / Day & Night:** usar um cartão com capa que gira em 3D, revelando outra face. Os conteúdos internos surgem em sequência, respeitando redução de movimento e acessibilidade por teclado.
2. **Glass Light Switch:** usar controle de tema com trilha fosca, lente de vidro, símbolos de lua/sol e transição curta. **Não alternar sozinho** porque a aparência escolhida pertence à preferência do leitor.
3. **Start → Middle → End:** desenvolver sequências didáticas em três etapas por procedimento relevante. A primeira etapa prepara, a segunda executa e a terceira mostra o resultado/continuação. **Somente utilizar fatos extraídos de páginas da wiki ou curadoria verificada; nunca inventar instruções.** Para páginas gerais, usar navegação pelas seções originais, sem chamá-las de procedimento.
4. **Ghost Buddy:** adaptar a resposta ao cursor/toque em um **efeito de energia ou ressonância temporal**, e não importar um fantasma de vidro roxo; manter leve e decorativo, sem cobrir texto nem interceptar cliques.
5. **Warp Cards:** adaptar profundidade, leve perspectiva e troca de foco a eras, crafting e categorias. Fazer primeiro com CSS; WebGL só quando houver ganho real de UX e fallback seguro.
6. **Melune / Scroll Journey:** destacar transições editoriais conforme a rolagem, com revelações e movimentos discretos. **Não prender a rolagem durante a leitura de artigos**; animações longas ou com shader apenas em demonstrações separadas e sob demanda.

## Implementado nesta versão
- `src/motion.css`: todos os estilos de efeitos adicionados.
- `src/app.js`: 3D day/night, três etapas na homepage, caminho de leitura derivado dos `h2` da wiki, interação do switch e cursor wisp.
- `index.html`: importa `src/motion.css` após `src/styles.css`.
- A timeline original de eras ganha leve profundidade no hover; seções especiais revelam o conteúdo ao entrar no viewport.

## Próximos passos
- Criar estrutura de dados para roteiros didáticos curados por artigo: `slug`, `language`, `sourceRevision`, `stages`, `steps`, `media`, `reviewStatus`.
- Somente disponibilizar o passo a passo de um tema quando estiver validado e traduzido. Exibir fonte e versão do artigo.
- Permitir controles Anterior/Próximo, reiniciar e acompanhar progresso. O conteúdo deve ser navegável por teclado, leitores de tela e toque.
- Se usar Canvas/WebGL, carregar sob demanda, cancelar loops ao desmontar, lidar com perda de contexto, limitar DPR e oferecer fallback estático.
- Localização futura: strings por idioma; não embutir traduções em lógica de animação.

## Qualidade obrigatória
- Mobile first. Evitar vídeos pesados e animações que dificultem o uso em celulares de 8 GB de RAM ou menos.
- `prefers-reduced-motion: reduce` deve impedir animações decorativas e respeitar acessibilidade.
- Não baixar ou copiar arte, código, fontes ou assets proprietários de templates sem licença/autorização. Reaproveitar **ideias de interação**, criando componentes originais.
- Imagens do jogo e conteúdo da wiki dependem das condições de atribuição e licenças dos titulares.
- Testar `npm run build` e os fluxos de navegação, busca e artigos antes de subir para a Vercel.
