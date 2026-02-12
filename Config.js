const CONFIG = {
  MY_CREATOR_API_KEY: 'cs_dbc4951ff3f99972fe9184ca435aef0c49610e7bbe22a6dd493d1939d3c23901',
  MY_CREATOR_BASE_URL: 'https://api.contentstudio.io/api/v1',

  // Configurações das Abas
  SHEET_INTERFACE: 'INTERFACE',
  SHEET_CONFIGS: 'CONFIGS',
  SHEET_STAGING: 'STAGING',

  COLUNA_CONFIG_WS_ID: 4, // Aba CONFIGS

  // Mapeamento das Colunas (Aba Interface)
  COLUNA_STATUS: 1,       // Coluna A
  COLUNA_DATA: 2,         // Coluna B
  COLUNA_HORA: 3,         // Coluna C
  COLUNA_CONTA: 4,        // Coluna D
  COLUNA_LEGENDA: 5,      // Coluna E
  COLUNA_MIDIA: 6,        // Coluna F
  COLUNA_LINK_EXTERNO: 7, // Coluna G
  COLUNA_LOG: 8           // Coluna H
};

function checkApiKey() {
  if (CONFIG.MY_CREATOR_API_KEY && CONFIG.MY_CREATOR_API_KEY.length > 10) {
    return true;
  }
  return false;
}

function checkApiKey() {
  if (CONFIG.MY_CREATOR_API_KEY && CONFIG.MY_CREATOR_API_KEY.length > 10) {
    return true;
  }
  // Só reprova se estiver realmente vazia
  return false;
}

