// Curadoria da Página Principal PT-BR da Vintage Story Wiki.
// Slugs em inglês correspondem aos títulos canônicos da MediaWiki;
// a aplicação tenta primeiro /pt-br e depois a página original.
import { cleanWikiTitle } from './locale.js';
const item = (label, slug, note = '') => ({ label, slug, note });

export const categories = [
  {
    id: 'iniciantes', name: 'Primeiros passos', short: 'Iniciantes', kicker: '01 / SOBREVIVÊNCIA', icon: 'compass',
    description: 'O essencial para passar da primeira noite à sua primeira base segura.',
    color: '#a4b888', accent: 'stone',
    subgroups: [
      { name: 'Comece por aqui', items: [
        item('Começando no Vintage Story', 'Getting started', 'Criação de mundo, personagem e controles'),
        item('Seu primeiro dia', 'Survival Guide - Your first day', 'Aprenda a sobreviver à primeira noite'),
        item('Tecnologias avançadas', 'Survival Guide - Advanced tech', 'Da primeira fogueira aos metais'),
        item('Perguntas frequentes', 'Frequently Asked Questions', 'Respostas para dúvidas comuns'),
      ] },
      { name: 'Aprenda a jogar', items: [
        item('Guia do modo criativo', 'Creative Mode - Starter Guide'),
        item('Ferramentas', 'Tools'), item('Armas', 'Weapons'), item('Combate', 'Combat'),
      ] },
    ],
  },
  {
    id: 'mecanicas', name: 'Mecânicas do jogo', short: 'Mecânicas', kicker: '02 / SISTEMAS', icon: 'settings',
    description: 'Entenda os sistemas que deixam cada decisão e cada estação mais importantes.',
    color: '#c0ad82', accent: 'sand',
    subgroups: [{ name: 'Sistemas e progressão', items: [
      item('Classes', 'Classes'), item('Armadura', 'Armor'), item('Comércio', 'Trading'),
      item('Armazenamento', 'Storage'), item('Refeições', 'Meals'),
      item('Conservação de alimentos', 'Food preservation'), item('Podridão', 'Rot'),
      item('Estabilidade temporal', 'Temporal stability'), item('Temperatura', 'Temperature'),
      item('Força mecânica', 'Mechanical power'), item('Criaturas', 'Creatures'),
    ] }],
  },
  {
    id: 'fabricacao', name: 'Fabricação & metalurgia', short: 'Fabricação', kicker: '03 / OFÍCIOS', icon: 'hammer',
    description: 'Da lascagem da pedra à forja de metal, domine cada etapa da produção.',
    color: '#c6926e', accent: 'copper',
    subgroups: [{ name: 'Ofícios e técnicas', items: [
      item('Lascagem', 'Knapping'), item('Receitas de fabricação', 'Grid crafting'),
      item('Modelagem de argila', 'Clay forming'), item('Fundição', 'Casting'),
      item('Forja', 'Smithing'), item('Fertilizantes', 'Fertilizer'),
      item('Fabricação de álcool', 'Alcohol brewing'), item('Trabalho em couro', 'Leather working'),
      item('Ciselamento', 'Chiseling'),
    ] }],
  },
  {
    id: 'recursos', name: 'Natureza & recursos', short: 'Recursos', kicker: '04 / EXPLORAÇÃO', icon: 'leaf',
    description: 'Cultive, extraia, crie animais e descubra os segredos da natureza.',
    color: '#92ad83', accent: 'forest',
    subgroups: [{ name: 'Coleta e recursos', items: [
      item('Forrageamento', 'Foraging'), item('Plantas', 'Plants'), item('Agricultura', 'Farming'),
      item('Pecuária', 'Animal husbandry'), item('Apicultura', 'Beekeeping'),
      item('Garimpo', 'Panning'), item('Mineração', 'Mining'), item('Minérios', 'Ore'),
      item('Vasos rachados', 'Cracked vessels'), item('Ruínas', 'Ruins'),
    ] }],
  },
  {
    id: 'mundo', name: 'O mundo & suas estações', short: 'Mundo', kicker: '05 / AMBIENTE', icon: 'globe',
    description: 'Terrenos, biomas, clima e os fenômenos que moldam a sua história.',
    color: '#8db6b6', accent: 'blue',
    subgroups: [{ name: 'Exploração do ambiente', items: [
      item('Geração do mundo', 'World Generation'), item('Configuração do mundo', 'World Configuration'),
      item('Superfície', 'Surface'), item('Depósitos de minérios', 'Ore Deposits'),
      item('Mapa do mundo', 'Worldmap'), item('Clima', 'Weather'),
      item('Estações', 'Seasons'), item('Fenômenos naturais', 'Natural Phenomena'),
    ] }],
  },
  {
    id: 'multiplayer', name: 'Multiplayer & servidores', short: 'Multiplayer', kicker: '06 / COMUNIDADE', icon: 'users',
    description: 'Construa um mundo compartilhado com amigos e administre seu servidor.',
    color: '#af9ccb', accent: 'purple',
    subgroups: [{ name: 'Servidor e administração', items: [
      item('Configurar servidor multiplayer', 'Setting up a Multiplayer Server'),
      item('Lista de comandos do servidor', 'List of server commands'),
      item('Reivindicação de território', 'Land claiming'),
      item('Proteção de blocos', 'Block reinforcement'),
      item('Parâmetros de inicialização do servidor', 'Server startup parameters'),
    ] }],
  },
  {
    id: 'utilitarios', name: 'Ferramentas & suporte', short: 'Utilitários', kicker: '07 / REFERÊNCIA', icon: 'wrench',
    description: 'Comandos, instalação, compatibilidade, editor de mundo e correções.',
    color: '#b4b4a4', accent: 'steel',
    subgroups: [
      { name: 'Comandos e instalação', items: [
        item('Lista de comandos do cliente', 'List of client commands'),
        item('Códigos de itens', 'Item codes'), item('Parâmetros de inicialização', 'Client startup parameters'),
        item('Atualizando mundos antigos', 'Updating Old Worlds'),
        item('Instalando no Linux', 'Installing the game on Linux'),
        item('Instalando no Steam Deck', 'Installing the game on Steam Deck'),
        item('Compatibilidade com controle', 'Controller Compatibility'),
      ] },
      { name: 'Ferramentas e soluções', items: [
        item('Sugestões', 'Tips'), item('Editor de mundo', 'How to use WorldEdit'),
        item('Câmera cinematográfica', 'Cinematic Camera'),
        item('Gravação de vídeo com FPS configurável', 'Adjustable FPS Video Recording'),
        item('Resolução de problemas', 'Troubleshooting Guide'),
        item('Macros', 'Macro'), item('Adicionando mods', 'Adding Mods'),
        item('Problemas com mods', 'Mod Troubleshooting'),
      ] },
    ],
  },
  {
    id: 'modding', name: 'Modding & desenvolvimento', short: 'Modding', kicker: '08 / CRIAÇÃO', icon: 'code',
    description: 'Crie conteúdo, desenvolva novas mecânicas e estenda o universo do jogo.',
    color: '#c59f75', accent: 'amber',
    subgroups: [{ name: 'Desenvolvimento e mods', items: [
      item('Tutorial rápido de modding', 'Modding:Quick Start Tutorial'),
      item('Noções básicas de modding', 'Modding:Basics'),
      item('Mods de conteúdo', 'Modding:Content Mods'),
      item('Mods de código', 'Modding:Code Mods'),
      item('Tipos de ativos', 'Modding:Asset Types Portal'),
      item('VS Model Creator', 'Modding:VS Model Creator'),
      item('Solução de problemas', 'Modding:Troubleshooting'),
      item('Detalhes do motor', 'Modding:VS Engine'),
      item('Todas as páginas de modding', 'Category:Modding'),
    ] }],
  },
];

export const featured = [
  { slug: 'Survival Guide - Your first day', title: 'Seu primeiro dia', tag: 'GUIA ESSENCIAL', summary: 'Tudo começa com uma pedra, alguns gravetos e a decisão de sobreviver.', type: 'sun' },
  { slug: 'Clay forming', title: 'O domínio da argila', tag: 'FABRICAÇÃO', summary: 'Modele recipientes e ferramentas para transformar seus primeiros dias.', type: 'clay' },
  { slug: 'Farming', title: 'Cultive seu futuro', tag: 'NATUREZA', summary: 'Conheça o solo, as sementes e os ciclos para enfrentar o inverno.', type: 'farm' },
];

export const progress = [
  { title: 'Idade da Pedra', subtitle: 'Pedra, palha e fogo', slug: 'Knapping' },
  { title: 'Idade do Cobre', subtitle: 'Fundição e ferramentas', slug: 'Casting' },
  { title: 'Idade do Bronze', subtitle: 'Ligas e forja', slug: 'Smithing' },
  { title: 'Idade do Ferro', subtitle: 'Metalurgia avançada', slug: 'Survival Guide - Advanced tech' },
];

export const allCurated = categories.flatMap(cat => cat.subgroups.flatMap(sub => sub.items.map(p => ({...p, category: cat.id, categoryName: cat.name}))));
export const uniqueCurated = [...new Map(allCurated.map(p => [p.slug.toLowerCase(), p])).values()];
export const findCategory = id => categories.find(c => c.id === id);
export const findArticle = slug => allCurated.find(a => a.slug.toLowerCase() === slug.toLowerCase());
export const formatTitle = raw => { let str=String(raw||'');try{str=decodeURIComponent(str)}catch{}return cleanWikiTitle(str) };

// Classificação aproximada para páginas que não aparecem na curadoria manual.
// A wiki conserva as categorias de origem em sourceCategories; não presumir
// que essa classificação temática substitua a estrutura editorial oficial.
export function autoCategory(title='',sourceCategories=[]){
 const names=[title,...sourceCategories].join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const rules=[
  ['modding',/(^|\W)(modding|model creator|json patch|blocktypes|itemtypes|worldgen config|vs engine|asset type|code mods|content mods|api reference)(\W|$)/i],
  ['multiplayer',/(multiplayer|server command|server setup|server startup|land claim|block reinforcement|server admin|server hosting)/i],
  ['utilitarios',/(installing|steam deck|linux|controller|troubleshoot|client command|client startup|item codes|worldedit|cinematic camera|recording|macro|mod installation|updating old|compatib)/i],
  ['fabricacao',/(knapping|grid craft|clay form|clay working|casting|smithing|smelting|bronze|copper|iron age|steel|anvil|ingot|forge|chisel|pottery|kiln|leather working|crucible|metalwork|tool mold|alloy)/i],
  ['recursos',/(foraging|plant|farming|crop|animal husband|beekeeping|panning|mining|prospect|ore\b|ruins|berries|seed|fertile|soil|flower|mushroom|tree|wood|forest|fish|fruit|grain|honey|water|livestock)/i],
  ['mundo',/(world generation|world configuration|worldmap|world map|climate|weather|season|temperature zones|natural phenomena|biomes|latitude|ore deposits|geolog|surface|landscape)/i],
  ['mecanicas',/(mechanic|class\b|classes|combat|armor|armour|trading|storage|meal|food preservation|rot\b|temporal|temperature|mechanical power|creatures|hunger|health|nutrition|stamina)/i],
  ['iniciantes',/(getting started|survival guide|first day|beginner|starter guide|faq|frequently asked|first night|introduction|basic gameplay)/i],
 ];
 return rules.find(([,regex])=>regex.test(names))?.[0]||null;
}
