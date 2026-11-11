# Vintage Story Codex Brasil

Protótipo navegável de enciclopédia **não oficial** para a comunidade de *Vintage Story*, com layout original escuro, inspirado em interfaces editoriais de jogos, e navegação simplificada.

**Fonte de dados:** [Vintage Story Wiki em português](https://wiki.vintagestory.at/Main_Page/pt-br). O projeto **não é** a wiki oficial, não substitui a documentação da comunidade e não afirma ter copiado todas as páginas para o pacote.

## Rodar no computador

Necessário **Node.js 20 ou superior**. Nenhuma dependência de terceiros é exigida.

```bash
npm start
```

Abra **http://localhost:4173**.

O servidor inclui um proxy `/api/wiki` somente de leitura, para consultar a API pública do MediaWiki. Também há uma função pronta para deploy na Vercel.

## Deploy na Vercel

1. Suba esta pasta para um repositório GitHub.
2. Importe o repositório na Vercel, com **Framework Preset: Other** e **sem comando de build**.
3. Mantenha o diretório raiz do projeto como diretório de saída (sem `dist`).
4. As rotas são tratadas pelo arquivo `vercel.json`; a função serverless `api/wiki.js` serve artigos pesquisáveis.

Caso a Vercel esteja configurada para exigir diretório de saída, use uma configuração para projeto estático sem framework. A função serverless requer runtime Node.js suportado pela plataforma.

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
