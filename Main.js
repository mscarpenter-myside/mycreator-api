function sincronizarConfigs() {
  const ui = SpreadsheetApp.getUi();
  const sheetConfigs = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_CONFIGS);

  if (!checkApiKey()) {
    ui.alert('⚠️ Chave Ausente', 'Configure a API Key no arquivo Config.js', ui.ButtonSet.OK);
    return;
  }

  SpreadsheetApp.getActiveSpreadsheet().toast('Conectando ao MyCreator...', 'Status', -1);

  try {
    // 1. Limpa a área de CONFIGS (Colunas A até F)
    sheetConfigs.getRange('A2:E').clearContent();

    // 2. Busca Workspaces
    const workspaces = apiGetWorkspaces();
    if (!workspaces || workspaces.length === 0) {
      ui.alert('Nenhum Workspace encontrado.');
      return;
    }

    let listaWorkspaces = []; 
    let listaPerfis = [];    

    workspaces.forEach(w => {
      listaWorkspaces.push([w.name, w._id]); // Colunas A e B

      const contas = apiGetAccounts(w._id);
      if (contas && contas.length > 0) {
        contas.forEach(c => {
          // Nome para o Dropdown
          const nomeParaDropdown = `${w.name} - ${c.account_name} (${c.platform})`;
          
          // O SEGREDO: Salvamos [Nome, ID Conta, ID WORKSPACE]
          // Colunas C, D e E
          listaPerfis.push([nomeParaDropdown, c._id,w._id]); 
        });
      }
    });

    // 3. Escreve na Planilha
    if (listaWorkspaces.length > 0) {
      sheetConfigs.getRange(2, 1, listaWorkspaces.length, 2).setValues(listaWorkspaces);
    }

    if (listaPerfis.length > 0) {
      // Agora escrevemos 3 colunas (C, D, E)
      sheetConfigs.getRange(2, 3, listaPerfis.length, 3).setValues(listaPerfis);
    }

    SpreadsheetApp.getActiveSpreadsheet().toast('Perfis e IDs de Workspace sincronizados!', 'Sucesso', 5);

  } catch (erro) {
    console.error(erro);
    ui.alert('Erro', `Falha ao sincronizar: ${erro.message}`, ui.ButtonSet.OK);
  }
}

function gerarStaging() {
  const ui = SpreadsheetApp.getUi();
  const sheetInterface = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_INTERFACE);
  const sheetConfigs = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_CONFIGS);
  const sheetStaging = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_STAGING);

  const linha = sheetInterface.getActiveCell().getRow();
  if (linha < 2) {
    ui.alert('Selecione uma linha válida.');
    return;
  }

  const dados = sheetInterface.getRange(linha, 1, 1, 8).getValues()[0];
  const [status, dataApenas, horaApenas, valorCelulaContas, legenda, mediaUrl, linkExterno] = dados;

  const cellContas = sheetInterface.getRange(linha, 4);
  const notaCelula = cellContas.getNote();
  
  let listaNomesContas = [];

  if (notaCelula && notaCelula.trim() !== "") {
    // Se tem nota, lê ignorando o cabeçalho "PERFIS SELECIONADOS"
    listaNomesContas = notaCelula
      .split('\n')
      .map(s => s.trim())
      .filter(s => s !== "" && !s.includes("PERFIS SELECIONADOS:"));
  } else {
    // Se não tem nota, lê o valor da célula normalmente
    listaNomesContas = valorCelulaContas.toString()
      .replace(/📋.*?Selecionadas/g, "")
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  }

  // Remove duplicados por segurança
  listaNomesContas = [...new Set(listaNomesContas)];

  // --- BUSCA PRECISA (Usando a Coluna E) ---
  // Lê C, D e E (Nome, ID Conta, ID Workspace)
  const configsContas = sheetConfigs.getRange('C2:E').getValues(); 

  let dadosPorWorkspace = {};

  for (let nomeConta of listaNomesContas) {
    // Busca pelo nome exato
    const contaEncontrada = configsContas.find(c => c[0] === nomeConta);
    
    if (contaEncontrada) {
      const accountId = contaEncontrada[1];   // Coluna D
      const workspaceId = contaEncontrada[2]; // Coluna E (NOVO!)

      if (!workspaceId) {
        // Fallback de segurança
         if (!dadosPorWorkspace["ERRO_WS"]) dadosPorWorkspace["ERRO_WS"] = [];
         dadosPorWorkspace["ERRO_WS"].push(`Conta ${nomeConta} sem Workspace ID no Configs`);
         continue;
      }

      if (!dadosPorWorkspace[workspaceId]) {
        dadosPorWorkspace[workspaceId] = [];
      }
      dadosPorWorkspace[workspaceId].push(accountId);

    } else {
      const erroKey = "ERRO_CONTA";
      if (!dadosPorWorkspace[erroKey]) dadosPorWorkspace[erroKey] = [];
      dadosPorWorkspace[erroKey].push(`"${nomeConta}" não encontrada (Rode a Sincronização)`);
    }
  }

  // Formatação de Data (Padrão)
  let dataFinal = new Date();
  if (dataApenas instanceof Date) {
    dataFinal.setFullYear(dataApenas.getFullYear());
    dataFinal.setMonth(dataApenas.getMonth());
    dataFinal.setDate(dataApenas.getDate());
    if (horaApenas instanceof Date) {
      dataFinal.setHours(horaApenas.getHours());
      dataFinal.setMinutes(horaApenas.getMinutes());
    } else {
      dataFinal.setHours(10, 0, 0); 
    }
  }
  const dataFormatada = Utilities.formatDate(dataFinal, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");

  // Geração do JSON
  let resultadosStaging = [];
  for (let wsId in dadosPorWorkspace) {
    const idsContas = dadosPorWorkspace[wsId];
    const payload = {
      "accounts": idsContas,
      "content": {
        "text": legenda,
        "media": mediaUrl ? { "images": [mediaUrl] } : undefined,
        "link": linkExterno || undefined
      },
      "scheduling": {
        "publish_type": "scheduled",
        "scheduled_at": dataFormatada
      },
      "_DEBUG_WORKSPACE_ID": wsId
    };
    resultadosStaging.push(JSON.stringify(payload, null, 2));
  }

  const outputFinal = resultadosStaging.join('\n\n--- SEPARADOR ---\n\n');
  
  sheetStaging.insertRowBefore(2);
  sheetStaging.getRange('A2:D2').setValues([[new Date(), outputFinal, "TESTE NOVO", `WS IDs: ${Object.keys(dadosPorWorkspace).join(', ')}`]]);
  sheetStaging.activate();
  SpreadsheetApp.getActiveSpreadsheet().toast('JSON Gerado com ID correto!', 'Sucesso');
}

function enviarAgendamento() {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_INTERFACE);
  
  // 1. Confirmação Inicial (Segurança)
  const resposta = ui.alert(
    'Deseja verificar e enviar todos os agendamentos pendentes?',
    ui.ButtonSet.YES_NO
  );

  if (resposta !== ui.Button.YES) {
    ui.alert('Operação cancelada.');
    return;
  }

  // Feedback inicial discreto
  SpreadsheetApp.getActiveSpreadsheet().toast("Iniciando o processamento...", "Robô MyCreator");

  const sheetConfigs = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_CONFIGS);
  
  // Carrega configurações (Cache) - Lendo até a Coluna E para pegar o ID do Workspace
  // C=Nome, D=ID Conta, E=Vazio, F=ID Workspace
  const configsContas = sheetConfigs.getRange('C2:E').getValues();     
  
  const lastRow = sheet.getLastRow();
  
  // Contadores para o Relatório Final
  let totalProcessados = 0;
  let totalSucesso = 0;
  let totalErros = 0;

  // --- LOOP PRINCIPAL (Varre todas as linhas) ---
  for (let i = 2; i <= lastRow; i++) {
    const status = sheet.getRange(i, CONFIG.COLUNA_STATUS).getValue();
    
    // FILTRO: Só processa se o status for exatamente "Agendar"
    if (status === "Agendar") {
      totalProcessados++;
      
      // --- A. Validação de Data e Hora ---
      const dataPost = sheet.getRange(i, CONFIG.COLUNA_DATA).getValue();
      const horaPost = sheet.getRange(i, CONFIG.COLUNA_HORA).getValue();
      
      let dataFinal = new Date();
      let dataValida = true;

      if (dataPost instanceof Date) {
        dataFinal.setFullYear(dataPost.getFullYear());
        dataFinal.setMonth(dataPost.getMonth());
        dataFinal.setDate(dataPost.getDate());
        
        if (horaPost instanceof Date) {
          dataFinal.setHours(horaPost.getHours());
          dataFinal.setMinutes(horaPost.getMinutes());
          dataFinal.setSeconds(0);
        } else if (typeof horaPost === 'string' && horaPost.includes(':')) {
          const partes = horaPost.split(':');
          dataFinal.setHours(parseInt(partes[0]));
          dataFinal.setMinutes(parseInt(partes[1]));
          dataFinal.setSeconds(0);
        } else {
          dataFinal.setHours(10, 0, 0); // Padrão 10am
        }
      } else {
        dataValida = false;
      }

      if (!dataValida) {
        sheet.getRange(i, CONFIG.COLUNA_LOG).setValue("❌ Erro: Data inválida");
        sheet.getRange(i, CONFIG.COLUNA_STATUS).setValue("Erro");
        totalErros++;
        continue;
      }
      
      const dataFormatada = Utilities.formatDate(dataFinal, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");

      // --- B. Leitura Rigorosa das Contas (Higienização) ---
      const cellContas = sheet.getRange(i, CONFIG.COLUNA_CONTA);
      const notaCelula = cellContas.getNote();
      const valorCelula = cellContas.getValue();
      
      let listaNomesContas = [];
      
      // Prioridade: Nota (lista detalhada) > Texto da Célula
      if (notaCelula && notaCelula.trim() !== "") {
        listaNomesContas = notaCelula
          .split('\n')
          .map(s => s.trim())
          // O SEGREDO: Ignora a linha do título e linhas vazias
          .filter(s => s !== "" && !s.includes("PERFIS SELECIONADOS:")); 
      } else if (valorCelula) {
        // Se não tem nota, limpa o texto visual da célula (como você já fazia)
        listaNomesContas = valorCelula.toString()
          .replace(/📋.*?Selecionadas/g, "")
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
      }

      // REMOVE DUPLICATAS (Crucial para evitar envio repetido)
      listaNomesContas = [...new Set(listaNomesContas)];

      if (listaNomesContas.length === 0) {
        sheet.getRange(i, CONFIG.COLUNA_LOG).setValue("❌ Erro: Nenhuma conta selecionada");
        sheet.getRange(i, CONFIG.COLUNA_STATUS).setValue("Erro");
        totalErros++;
        continue;
      }

      // --- C. Agrupamento por Workspace (Usando Coluna F) ---
      let enviosPorWorkspace = {};

      for (let nomeConta of listaNomesContas) {
        // Busca exata no Configs
        const contaEncontrada = configsContas.find(c => c[0] === nomeConta);
        
        if (contaEncontrada) {
          const accountId = contaEncontrada[1];   // Coluna D (Índice 1)
          const workspaceId = contaEncontrada[2]; // Coluna F (Índice 3 no range C:E)

          if (workspaceId) {
            if (!enviosPorWorkspace[workspaceId]) {
              enviosPorWorkspace[workspaceId] = [];
            }
            enviosPorWorkspace[workspaceId].push(accountId);
          } else {
             // Log de aviso se faltar ID do Workspace no Configs
             console.log(`Aviso: Conta ${nomeConta} sem Workspace ID associado.`);
          }
        }
      }

      if (Object.keys(enviosPorWorkspace).length === 0) {
        sheet.getRange(i, CONFIG.COLUNA_LOG).setValue("❌ Erro: Nenhuma conta válida encontrada no Configs");
        sheet.getRange(i, CONFIG.COLUNA_STATUS).setValue("Erro");
        totalErros++;
        continue;
      }

      // --- D. Execução dos Envios (Loop pelos Workspaces) ---
      let logFinal = [];
      let statusFinal = [];
      let temErroNestaLinha = false;

      const legenda = sheet.getRange(i, CONFIG.COLUNA_LEGENDA).getValue();
      const mediaUrl = sheet.getRange(i, CONFIG.COLUNA_MIDIA).getValue();
      const linkExterno = sheet.getRange(i, CONFIG.COLUNA_LINK_EXTERNO).getValue();

      for (let wsId in enviosPorWorkspace) {
        const idsContas = enviosPorWorkspace[wsId];

        const payload = {
          "accounts": idsContas,
          "content": {
            "text": legenda,
            "media": mediaUrl ? { "images": [mediaUrl] } : undefined,
            "link": linkExterno || undefined
          },
          "scheduling": {
            "publish_type": "scheduled",
            "scheduled_at": dataFormatada
          }
        };

        try {
          // CHAMADA À API (Ordem: wsId, payload)
          const response = apiCreatePost(wsId, payload);
          
          if (response && response.code === 200) {
             statusFinal.push("✅ Enviado");
             const postId = (response.body && response.body.data && response.body.data.id) ? response.body.data.id : "OK";
             logFinal.push(`WS(${wsId.substr(-4)}): ID ${postId}`);
          } else {
             // Tenta extrair mensagem de erro detalhada
             const msgErro = (response.body && response.body.message) ? response.body.message : JSON.stringify(response.body);
             throw new Error(msgErro);
          }

        } catch (e) {
          temErroNestaLinha = true;
          statusFinal.push("❌ Erro");
          logFinal.push(`WS(${wsId.substr(-4)}): ${e.message}`);
        }
      }

      // --- E. Atualiza Estatísticas e Planilha ---
      if (temErroNestaLinha) {
        totalErros++;
        const statusResumo = statusFinal.includes("✅ Enviado") ? "Parcial" : "Erro";
        sheet.getRange(i, CONFIG.COLUNA_STATUS).setValue(statusResumo);
      } else {
        totalSucesso++;
        sheet.getRange(i, CONFIG.COLUNA_STATUS).setValue("Enviado");
      }
      
      sheet.getRange(i, CONFIG.COLUNA_LOG).setValue(logFinal.join('\n'));
      
      const cellLog = sheet.getRange(i, CONFIG.COLUNA_LOG);
      const resumo = temErroNestaLinha ? "⚠️ Erro" : "✅ Sucesso";
      cellLog.setValue(resumo); // Escreve o resumo limpo na célula
      cellLog.setNote(logFinal.join('\n')); // Joga o "lixo" técnico para a nota (pop-up ao passar o mouse)
      // Atualiza visualmente a cada linha processada
      SpreadsheetApp.flush(); 
    }
  }

  // 2. Relatório Final (Box)
  if (totalProcessados > 0) {
    ui.alert(
      'Relatório Final 📊',
      `Processamento concluído!\n\n` +
      `✅ Enviados com Sucesso: ${totalSucesso}\n` +
      `❌ Com Erros: ${totalErros}\n` +
      `Total Processado: ${totalProcessados}`,
      ui.ButtonSet.OK
    );
  } else {
    ui.alert('Aviso', 'Não foram encontrados posts com status "Agendar".', ui.ButtonSet.OK);
  }
}