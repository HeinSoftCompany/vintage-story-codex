# Vintage Story Codex Brasil

Protótipo navegável de enciclopédia **não oficial** para a comunidade de *Vintage Story*, com layout original escuro, inspirado em interfaces editoriais de jogos, e navegação simplificada.

**Fonte de dados:** [Vintage Story Wiki em português](https://wiki.vintagestory.at/Main_Page/pt-br). O projeto **não é** a wiki oficial, não substitui a documentação da comunidade e não afirma ter copiado todas as páginas para o pacote.

## Idiomas

A interface está disponível em **português do Brasil, inglês, espanhol, alemão, francês e japonês**. O seletor fica no cabeçalho, inclusive no mobile. A escolha fica salva no navegador; o idioma explícito na URL tem prioridade. Links antigos sem prefixo continuam funcionando e recebem o idioma salvo, ou `pt-br` na primeira visita.

Exemplos: `/pt-br/`, `/en/explorar`, `/es/biblioteca`, `/de/categoria/iniciantes`, `/fr/favoritos` e `/ja/artigo/Getting%20started`. Os nomes internos das rotas e os títulos canônicos dos artigos são estáveis em todos os idiomas. Ao trocar o idioma, a página, o artigo, os parâmetros e a âncora são preservados. Os favoritos são compartilhados entre idiomas neste navegador.

O leitor tenta a versão da wiki no idioma escolhido (`/pt-br`, `/es`, `/de`, `/fr` ou `/ja`); em inglês usa o título original. Se a tradução não existir, abre o original em inglês com aviso visível. Falhas de rede mostram um erro de carregamento, sem afirmar que a tradução está ausente. Traduções da comunidade podem conter trechos ainda em inglês ou desatualizados. Créditos e links apontam para a página efetivamente exibida. Cópias locais em português só são usadas ao solicitar português.

O índice local existente continua sendo um catálogo compartilhado de títulos canônicos, complementado pela curadoria. Ele não representa um índice completo de traduções nos seis idiomas. A busca também consulta a wiki ao vivo, prioriza o idioma selecionado e inclui resultados originais em inglês. Não há tradução automática de artigos, API de IA ou fluxo de revisão comunitária nesta etapa.

Para ampliar a interface, configure o idioma em `src/locale.js` e acrescente uma coluna completa a `src/messages.js`. As traduções são aplicadas somente aos fragmentos da interface pelo módulo `src/i18n.js`; o HTML dos artigos da wiki permanece separado. Novas mensagens e textos da curadoria devem ter tradução em todas as colunas. As regras de publicação em `vercel.json` precisam incluir qualquer novo código de idioma.

Validação: `npm test` verifica traduções, rotas e comportamento do cliente da wiki com respostas controladas. `npm run test:ui` verifica os seis idiomas num navegador Chromium em modo headless, com um servidor local e respostas da wiki simuladas. Por padrão usa o Brave no Windows; defina `CODEX_TEST_BROWSER` com o executável de Chrome, Chromium ou Brave para outra instalação. O teste usa um perfil temporário e não acessa o perfil pessoal do navegador.

## Execução local

Necessário **Node.js 20 ou superior**. Nenhuma dependência de terceiros é exigida.

```bash
npm start
```

Abra **http://localhost:4173**.

O servidor inclui um proxy `/api/wiki` somente de leitura, para consultar a API pública do MediaWiki. Também há uma função pronta para deploy na Vercel.

## Deploy na Vercel

1. Suba esta pasta para um repositório GitHub.
2. Importe o repositório na Vercel, com **Framework Preset: Other** (não `Node.js`).
3. Use **Build Command: `npm run build`** e **Output Directory: `dist`**; **Root Directory: `./`**.
4. O arquivo `vercel.json` também define esse framework/build/output, evitando servir apenas a pasta `public`.
5. As rotas são tratadas pelo arquivo `vercel.json`; a função serverless `api/wiki.js` serve artigos pesquisáveis.

Antes do deploy, você pode validar com `npm run build`: confirme que existem `dist/index.html`, `dist/src/app.js`, `dist/src/styles.css` e `dist/data/wiki-index.json`. O projeto não exige Vite/Next.js. A função serverless requer runtime Node.js suportado pela plataforma.

## Navegação e funções implementadas

- Início com oito categorias retiradas da organização temática da página principal PT-BR.
- Navbar superior + sidebar lateral com tópicos e guias.
- Página de cada categoria, com filtro instantâneo.
- Biblioteca geral e lista de favoritos, guardados no navegador.
- Busca global por título (**Ctrl/Cmd + K** ou `/`) e pesquisa adicional no MediaWiki.
- Visualização dos artigos originais completos **sob demanda**, usando MediaWiki API `action=parse`.
- Preferência pela versão `/pt-br`; alternativa para artigo em inglês se não houver tradução.
- Sumário de seções, links internos, links de origem, copiar URL e atalhos.
- Tema escuro e claro e versão responsiva com menu lateral móvel.
- Animações sutis, respeitando `prefers-reduced-motion`.

## Incluir TODO o índice da wiki

A curadoria inicial contém os artigos principais da página inicial da Wiki. Para obter automaticamente um índice completo das páginas existentes em português, execute:

```bash
npm run sync
```

O script percorre os namespaces de artigo, comunidade, ajuda e categoria da wiki, seleciona os títulos terminados em `/pt-br` e grava `public/data/wiki-index.json`. A Biblioteca passa a exibir esse índice. A busca e a leitura continuam consultando a wiki em tempo real.

Para guardar cópias locais dos **artigos HTML completos** (não faz download dos arquivos de imagem), execute:

```bash
npm run sync:full
```

Isto pode representar muitas requisições e criar muitos arquivos. Faça esse espelhamento **somente depois de conferir as permissões de reutilização do conteúdo, termos e limites de acesso da wiki**. O script inclui pausas entre as chamadas e aproveita cópias já baixadas.

Para incluir no índice os artigos originais sem tradução correspondente:

```bash
node scripts/sync-wiki.mjs --include-original
```

Para indexar e armazenar ambas as versões:

```bash
node scripts/sync-wiki.mjs --full --include-original
```

### Observações sobre cobertura e artigos

- Este pacote **não contém** todos os artigos da wiki. Fornece um explorador funcional e as rotinas de indexação/cópia para executar na sua máquina.
- A wiki tem conteúdo que pode estar desatualizado ou sem tradução. Nunca preencha a ausência de uma tradução com texto inventado.
- Algumas páginas incluem predefinições, scripts, imagens e estilos específicos do MediaWiki que podem não renderizar de forma idêntica na nova interface.
- A API pode impor limitações de CORS, acesso, volume, taxa e tempo de resposta; o proxy fornece um caminho alternativo, mas não garante disponibilidade.
- A funcionalidade de busca ampliada depende da API e do índice sincronizado.
- Para usar em público, consulte a licença real da wiki e os direitos de cada imagem e artigo. Mantenha créditos aos autores, link da fonte e histórico.

## Estrutura

```text
index.html               Página principal / SPA
src/app.js               Interface, rotas, leitura, busca e ações
src/data.js              Taxonomia e guias principais
src/icons.js             Ícones vetoriais inline
src/api.js               Integração com MediaWiki API
src/styles.css           Design system e responsividade
api/wiki.js              Proxy serverless Vercel
server.mjs               Servidor local sem dependências
scripts/sync-wiki.mjs    Indexação e armazenamento opcionais
public/data/             Índice de artigos e cópias opcionais
vercel.json              Regras de URLs
```

## Créditos e uso responsável

Os conteúdos são da Vintage Story Wiki e de seus respectivos colaboradores. Veja os termos exatos de cada obra e mídia na [wiki original](https://wiki.vintagestory.at/Main_Page/pt-br). As capturas do jogo, marcas e outros materiais visuais pertencem aos respectivos titulares. O hero usa uma imagem pública do aplicativo na [Flathub](https://flathub.org/en/apps/at.vintagestory.VintageStory), carregada externamente e não incluída neste pacote.

A interface é uma criação original deste protótipo. O [UberDesigner](https://uberdesigner.ai/) foi consultado como referência geral de direção visual; **nenhum template pago foi copiado, baixado ou incluído**. Consulte as licenças do UberDesigner antes de usar qualquer um de seus assets ou projetos.

**Sugestão de comunidade:** conversar com os mantenedores da wiki antes de disponibilizar um espelho integral e, se possível, contribuir para a documentação existente em vez de criar uma cópia sem manutenção.
