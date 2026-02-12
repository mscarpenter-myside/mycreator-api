function apiGetWorkspaces() {
  const endpoint = `${CONFIG.MY_CREATOR_BASE_URL}/workspaces`;

  const options = {
    method: 'GET',
    headers: {
      'X-API-Key': getApiKey(),
      'Content-Type': 'application/json'
    },
    muteHttpExceptions: true // Impede que o script pare se der erro 400/500
  };

  try {
    const response = UrlFetchApp.fetch(endpoint, options);
    const responseCode = response.getResponseCode();
    const json = JSON.parse(response.getContentText());

    if (responseCode !== 200) {
      console.error('Erro ao buscar Workspaces:', json);
      throw new Error(`Erro API (${responseCode}): ${json.message || 'Desconhecido'}`);
    }

    // A API retorna algo como { code: 200, data: [...] } ou direto a lista dependendo do endpoint
    // Ajuste conforme o retorno real da API (geralmente está dentro de 'data')
    return json.data || json;

  } catch (e) {
    console.error('Falha na conexão:', e);
    throw e; // Repassa o erro para quem chamou
  }
}

function apiGetAccounts(workspaceId) {
  const endpoint = `${CONFIG.MY_CREATOR_BASE_URL}/workspaces/${workspaceId}/accounts`;
  const options = {
    method: 'GET',
    headers: { 'X-API-Key': getApiKey() },
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(endpoint, options);
    const json = JSON.parse(response.getContentText());
    return json.data || [];
  } catch (e) {
    console.warn(`Erro ao buscar contas: ${e.message}`);
    return [];
  }
}

function apiCreatePost(workspaceId, payload) {
  const endpoint = `${CONFIG.MY_CREATOR_BASE_URL}/workspaces/${workspaceId}/posts`;

  const options = {
    method: 'POST',
    headers: {
      'X-API-Key': getApiKey(),
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload), // Converte o Objeto JS para texto JSON
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(endpoint, options);
  const json = JSON.parse(response.getContentText());

  return {
    code: response.getResponseCode(),
    body: json
  };
}