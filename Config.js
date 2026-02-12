const CONFIG = {
  MY_CREATOR_BASE_URL: 'https://api.contentstudio.io/api/v1',

  // Configurações das Abas
  SHEET_INTERFACE: 'INTERFACE',
  SHEET_CONFIGS: 'CONFIGS',
  SHEET_STAGING: 'STAGING',

  // Mapeamento das Colunas (Aba Interface)
  COLUNA_STATUS: 1,
  COLUNA_DATA: 2,
  COLUNA_HORA: 3,
  COLUNA_CONTAS: 4,
  COLUNA_TIPO_POST: 5,    // Coluna E (NOVO)
  COLUNA_LEGENDA: 6,      // Coluna F (era E)
  COLUNA_MIDIA: 7,        // Coluna G (era F)
  COLUNA_LINK_EXTERNO: 8, // Coluna H (era G)
  COLUNA_LOG: 9,          // Coluna I (era H)

  // Lista completa de tipos válidos (formato da API ContentStudio)
  TIPOS_POST_VALIDOS: [
    // Tipos específicos por plataforma
    'Instagram (feed)',
    'Instagram (feed+reel)',
    'Instagram (reel)',
    'Instagram (carousel)',
    'Instagram (story)',
    'Instagram (feed+story)',
    'Instagram (feed+reel+story)',
    'Instagram (reel+story)',
    'Instagram (carousel+story)',
    'Facebook (feed)',
    'Facebook (feed+reel)',
    'Facebook (reel)',
    'Facebook (story)',
    'Facebook (feed+story)',
    'Facebook (feed+reel+story)',
    'Facebook (reel+story)',
    'YouTube (video)',
    'YouTube (shorts)',
    'TikTok (video)',
    'TikTok (carousel)',
    'Pinterest (feed)',
    'Google My Business (feed)',
    'LinkedIn (feed)',
    'LinkedIn (carousel)',

    // Tipos genéricos (NÍVEL 2 - Cross-platform)
    'feed',      // Instagram, Facebook, LinkedIn, Pinterest, GMB
    'carousel',  // Instagram, LinkedIn, TikTok
    'video',     // TikTok, YouTube
    'story',     // Instagram, Facebook
    'reel',      // Instagram, Facebook

    // Tipos combinados (NÍVEL 3 - Instagram/Facebook)
    'feed+reel',
    'feed+story',
    'feed+reel+story',
    'reel+story',
    'carousel+story'
  ],

  // Matriz de compatibilidade: Tipo genérico → Plataformas suportadas
  COMPATIBILIDADE_TIPO_PLATAFORMA: {
    'feed': ['Instagram', 'Facebook', 'LinkedIn', 'Pinterest', 'Google My Business'],
    'carousel': ['Instagram', 'LinkedIn', 'TikTok'],
    'video': ['TikTok', 'YouTube'],
    'story': ['Instagram', 'Facebook'],
    'reel': ['Instagram', 'Facebook'],

    // Combos Instagram/Facebook
    'feed+reel': ['Instagram', 'Facebook'],
    'feed+story': ['Instagram', 'Facebook'],
    'feed+reel+story': ['Instagram', 'Facebook'],
    'reel+story': ['Instagram', 'Facebook'],
    'carousel+story': ['Instagram']
  },

  // Extensões de vídeo reconhecidas
  EXTENSOES_VIDEO: ['.mp4', '.mov', '.avi', '.wmv', '.webm', '.MP4', '.MOV']
};

/**
 * Extrai o tipo de post do formato "Plataforma (tipo)"
 * Exemplo: "Instagram (feed+reel)" → "feed+reel"
 * @param {string} tipoComPlataforma - Formato: "Plataforma (tipo)"
 * @returns {string|null} - Tipo extraído ou null se inválido
 */
function extrairTipoPost(tipoComPlataforma) {
  if (!tipoComPlataforma || tipoComPlataforma.toString().trim() === '') {
    return null;
  }

  const tipoStr = tipoComPlataforma.toString().trim();

  // Se já é um tipo genérico (sem parênteses), retorna direto
  if (ehTipoGenerico(tipoStr)) {
    return tipoStr;
  }

  // Caso contrário, extrai do formato "Plataforma (tipo)"
  const match = tipoStr.match(/\(([^)]+)\)/);
  return match ? match[1] : null;
}

/**
 * Extrai a plataforma do nome da conta
 * Exemplo: "Workspace - Instagram (@perfil)" → "Instagram"
 * @param {string} nomeConta - Nome completo da conta
 * @returns {string|null} - Nome da plataforma ou null
 */
/**
 * Extrai a plataforma do nome da conta
 * Exemplo: "Workspace - Instagram (@perfil)" → "Instagram"
 * Exemplo Real: "MyCreator - anapersonalshopperimobiliaria (instagram)" → "Instagram"
 * @param {string} nomeConta - Nome completo da conta
 * @returns {string|null} - Nome da plataforma ou null
 */
function extrairPlataforma(nomeConta) {
  if (!nomeConta) return null;

  // Tenta extrair o conteúdo entre os últimos parênteses
  const match = nomeConta.toString().match(/\(([^)]+)\)$/);

  if (match) {
    let plat = match[1].trim();

    // Normalização Explícita para LinkedIn (Caso Especial)
    if (plat.toLowerCase() === 'linkedin') return 'LinkedIn';

    // Normalização básica para bater com a lista de compatibilidade
    // (Capitaliza a primeira letra: instagram -> Instagram)
    return plat.charAt(0).toUpperCase() + plat.slice(1).toLowerCase();
  }

  return null;
}

/**
 * Verifica se o tipo é genérico (sem plataforma especificada)
 * @param {string} tipo - Tipo de post
 * @returns {boolean} - True se for genérico
 */
function ehTipoGenerico(tipo) {
  if (!tipo) return false;
  const tiposGenericos = [
    'feed', 'carousel', 'video', 'story', 'reel',
    'feed+reel', 'feed+story', 'feed+reel+story', 'reel+story', 'carousel+story'
  ];
  return tiposGenericos.includes(tipo.toString().trim().toLowerCase());
}

/**
 * Valida se um tipo genérico é compatível com as plataformas selecionadas
 * @param {string} tipoGenerico - Tipo genérico (ex: 'carousel')
 * @param {Array<string>} listaNomesContas - Lista de nomes de contas selecionadas
 * @returns {string|null} - Mensagem de erro ou null se válido
 */
function validarCompatibilidadeTipoPlataformas(tipoGenerico, listaNomesContas) {
  if (!tipoGenerico || !listaNomesContas || listaNomesContas.length === 0) {
    return null;
  }

  // Extrai plataformas únicas das contas selecionadas
  const plataformas = listaNomesContas
    .map(conta => extrairPlataforma(conta))
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i); // Remove duplicatas

  if (plataformas.length === 0) {
    return null; // Não conseguiu extrair plataformas, deixa passar
  }

  // Verifica compatibilidade
  const plataformasCompativeis = CONFIG.COMPATIBILIDADE_TIPO_PLATAFORMA[tipoGenerico];

  if (!plataformasCompativeis) {
    return null; // Tipo não está na matriz, deixa validação padrão lidar
  }

  // Encontra plataformas incompatíveis
  const incompativeis = plataformas.filter(p => !plataformasCompativeis.includes(p));

  if (incompativeis.length > 0) {
    return `❌ Tipo "${tipoGenerico}" não é compatível com: ${incompativeis.join(', ')}\n\n` +
      `Plataformas suportadas para "${tipoGenerico}": ${plataformasCompativeis.join(', ')}`;
  }

  return null; // Tudo OK!
}

/**
 * Retorna a API Key armazenada no PropertiesService
 * Fallback: tenta ler do ScriptProperties, depois do UserProperties
 */
function getApiKey() {
  const scriptProps = PropertiesService.getScriptProperties();
  const userProps = PropertiesService.getUserProperties();

  let apiKey = scriptProps.getProperty('MY_CREATOR_API_KEY');

  // Fallback para UserProperties (caso o usuário tenha configurado lá)
  if (!apiKey || apiKey.trim() === '') {
    apiKey = userProps.getProperty('MY_CREATOR_API_KEY');
  }

  return apiKey;
}

/**
 * Valida se existe uma API Key configurada
 */
function checkApiKey() {
  const apiKey = getApiKey();
  return apiKey && apiKey.length > 10;
}

/**
 * [SETUP] Salva a API Key no PropertiesService
 * Execute esta função UMA VEZ para migrar a chave do código para o armazenamento seguro
 */
function salvarApiKey() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    'Configurar API Key do ContentStudio',
    'Cole aqui sua API Key:',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() === ui.Button.OK) {
    const apiKey = response.getResponseText().trim();

    if (apiKey.length > 10) {
      PropertiesService.getScriptProperties().setProperty('MY_CREATOR_API_KEY', apiKey);
      ui.alert('✅ API Key salva com sucesso!', 'Agora você pode usar o sistema normalmente.', ui.ButtonSet.OK);
    } else {
      ui.alert('❌ Chave inválida', 'A API Key parece estar incorreta. Tente novamente.', ui.ButtonSet.OK);
    }
  }
}

