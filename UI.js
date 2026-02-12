function onOpen() {
  const ui = SpreadsheetApp.getUi();

  // Cria o menu 
  ui.createMenu('🚀 Automação MyCreator')
    .addItem('AGENDAR', 'enviarAgendamento') // Chama func no Main.gs
    .addItem('✅ Verificar Integridade', 'verificarAgendamentos')
    .addSeparator()
    .addItem('Selecionar Contas', 'abrirPopupContas') // Pop Up Múltipla Escolha
    .addItem('Validar JSON (Staging)', 'gerarStaging') // Chama func no Main.gs
    .addSeparator()
    .addItem('Atualizar Workspaces/Contas', 'sincronizarConfigs') // Chama func no Main.gs
    .addItem('⚙️ Configurar API Key', 'salvarApiKey') // Configuração inicial
    .addToUi();
}

function abrirPopupContas() {
  const html = HtmlService.createHtmlOutputFromFile('Popup')
    .setWidth(450)   // Largura confortável
    .setHeight(600); // Altura máxima

  SpreadsheetApp.getUi().showModalDialog(html, 'Seletor de Contas');
}

function getDadosParaPopup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetConfigs = ss.getSheetByName('CONFIGS');
  const sheetInterface = ss.getSheetByName('INTERFACE');

  // Pegamos o range completo até a coluna E
  const rangeConfigs = sheetConfigs.getRange("A2:E" + sheetConfigs.getLastRow()).getValues();
  const mapaWorkspaces = {};

  // --- PASSO 1: CRIAR O DICIONÁRIO MESTRE (A -> B) ---
  const dicionarioNomes = {};
  rangeConfigs.forEach(linha => {
    const nomeWS = linha[0]; // Coluna A
    const idWS = linha[1];   // Coluna B (O ID oficial do Workspace)

    if (idWS && nomeWS && nomeWS !== "") {
      dicionarioNomes[idWS] = nomeWS;
    }
  });

  // --- PASSO 2: MONTAR OS BLOCOS USANDO O ID DA COLUNA E ---
  rangeConfigs.forEach(linha => {
    const nomeConta = linha[2];      // Coluna C
    const idWS_da_Conta = linha[4];  // Coluna E (O Workspace que essa conta pertence)

    if (idWS_da_Conta && nomeConta) {
      if (!mapaWorkspaces[idWS_da_Conta]) {
        mapaWorkspaces[idWS_da_Conta] = {
          // Buscamos o nome no dicionário que criamos no Passo 1
          nome: dicionarioNomes[idWS_da_Conta] || "Workspace Desconhecido",
          perfis: []
        };
      }
      mapaWorkspaces[idWS_da_Conta].perfis.push(nomeConta);
    }
  });

  // Lê o que já está selecionado na célula ativa
  const valorAtual = sheetInterface.getActiveCell().getValue().toString();
  const selecionados = valorAtual.split(',').map(s => s.trim());

  return {
    estrutura: mapaWorkspaces,
    selecionados: selecionados
  };
}


/**
 * [BACKEND] Salva a escolha do usuário na célula (mantendo sua lógica) 
 * e adiciona a Nota com a lista detalhada.
 */
function salvarSelecaoNaCelula(listaContas) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('INTERFACE');
  const cell = sheet.getActiveCell();

  // 1. Sua lógica de escrita na célula (não alterada)
  const textoParaCelula = listaContas.join(', ');
  cell.setValue(textoParaCelula);

  // 2. ADICIONAL: Criar e aplicar a Nota com quebra de linha (\n)
  if (listaContas.length > 0) {
    const listaParaNota = "PERFIS SELECIONADOS:\n" + listaContas.join('\n');
    cell.setNote(listaParaNota);

    // Opcional: feedback visual de que há uma nota ali
    cell.setBackground("#f8f9fa");
  } else {
    cell.clearNote();
    cell.setBackground(null);
  }
}

/**
 * [NOVO] Salva seleção de contas E tipo de post
 * Preenche colunas D (contas) e E (tipo de post) simultaneamente
 * @param {Object} dados - { contas: [], tipoPost: '' }
 */
function salvarSelecaoComTipo(dados) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_INTERFACE);
  const linha = sheet.getActiveCell().getRow();

  if (linha < 2) {
    SpreadsheetApp.getUi().alert('Selecione uma linha válida (linha 2 ou abaixo).');
    return;
  }

  // Preenche coluna D (Contas)
  const textoCelula = `📋 ${dados.contas.length} Conta(s) Selecionadas`;
  const notaCelula = `PERFIS SELECIONADOS:\n${dados.contas.join('\n')}`;

  const cellContas = sheet.getRange(linha, CONFIG.COLUNA_CONTAS);
  cellContas.setValue(textoCelula);
  cellContas.setNote(notaCelula);
  cellContas.setBackground("#f8f9fa");

  // Preenche coluna E (Tipo de Post)
  const cellTipo = sheet.getRange(linha, CONFIG.COLUNA_TIPO_POST);
  cellTipo.setValue(dados.tipoPost);

  // Feedback
  SpreadsheetApp.getActiveSpreadsheet().toast(
    `✅ ${dados.contas.length} conta(s) + tipo "${dados.tipoPost}" configurados!`,
    'Sucesso',
    3
  );
}

// Função utilitária para mostrar alertas 
function mostrarAlerta(titulo, mensagem) {
  SpreadsheetApp.getUi().alert(titulo, mensagem, SpreadsheetApp.getUi().ButtonSet.OK);
}