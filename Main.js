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
          listaPerfis.push([nomeParaDropdown, c._id, w._id]);
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

  const dados = sheetInterface.getRange(linha, 1, 1, 9).getValues()[0];
  const [status, dataApenas, horaApenas, valorCelulaContas, tipoPost, legenda, mediaUrl, linkExterno, log] = dados;

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

  // Processar mídia usando a nova função helper
  const mediaParsed = parseMidias(mediaUrl);

  // Normalizar tipo de post (agora mantém o formato "Plataforma (tipo)")
  let tipoPostCompleto = tipoPost && tipoPost.toString().trim() !== '' ? tipoPost.toString().trim() : '';

  // Validar tipo de post contra lista completa
  if (tipoPostCompleto && !CONFIG.TIPOS_POST_VALIDOS.includes(tipoPostCompleto)) {
    ui.alert('Erro de Validação',
      `Tipo de Post "${tipoPostCompleto}" inválido.\n\nExemplos válidos:\n- Instagram (feed)\n- Instagram (carousel)\n- YouTube (video)\n\nVeja a lista completa na validação da coluna E.`,
      ui.ButtonSet.OK);
    return;
  }

  // Validação cruzada: tipo vs mídia
  const erroValidacao = validarTipoPostVsMidia(tipoPostCompleto, mediaParsed);
  if (erroValidacao) {
    ui.alert('Erro de Validação', erroValidacao, ui.ButtonSet.OK);
    return;
  }

  // NÍVEL 2: Validação de compatibilidade para tipos genéricos
  if (tipoPostCompleto && ehTipoGenerico(tipoPostCompleto)) {
    const erroCompatibilidade = validarCompatibilidadeTipoPlataformas(tipoPostCompleto, listaNomesContas);
    if (erroCompatibilidade) {
      ui.alert('Erro de Compatibilidade', erroCompatibilidade, ui.ButtonSet.OK);
      return;
    }
  }

  // Extrai o tipo puro para enviar à API
  // Se for genérico (ex: "carousel"), usa direto
  // Se for específico (ex: "Instagram (carousel)"), extrai o tipo
  let tipoParaAPI = null;
  if (tipoPostCompleto) {
    tipoParaAPI = ehTipoGenerico(tipoPostCompleto)
      ? tipoPostCompleto
      : extrairTipoPost(tipoPostCompleto);
  }

  // Geração do JSON
  let resultadosStaging = [];
  for (let wsId in dadosPorWorkspace) {
    const idsContas = dadosPorWorkspace[wsId];
    const payload = {
      "accounts": idsContas,
      "post_type": tipoParaAPI || undefined,
      "content": {
        "text": legenda,
        // CORREÇÃO: API espera um Array de URLs, não um Objeto {images: ...}
        "media": mediaParsed ? (mediaParsed.images || (mediaParsed.video ? [mediaParsed.video] : [])) : undefined,
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
  sheetStaging.getRange('A2:D2').setValues([[new Date(), outputFinal, `Tipo: ${tipoPostCompleto || '(vazio)'}`, `WS IDs: ${Object.keys(dadosPorWorkspace).join(', ')}`]]);
  sheetStaging.activate();
  SpreadsheetApp.getActiveSpreadsheet().toast('JSON Gerado com sucesso! ✅', 'validacao');
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
      // PROGRESADOR VISUAL (Iteração 5.0)
      const progresso = totalProcessados + 1;
      SpreadsheetApp.getActiveSpreadsheet().toast(`Enviando ${progresso}... (Linha ${i})`, "🚀 Processando", -1);
      SpreadsheetApp.flush();

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
      const cellContas = sheet.getRange(i, CONFIG.COLUNA_CONTAS);
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

      const tipoPost = sheet.getRange(i, CONFIG.COLUNA_TIPO_POST).getValue();
      const legenda = sheet.getRange(i, CONFIG.COLUNA_LEGENDA).getValue();
      const mediaUrl = sheet.getRange(i, CONFIG.COLUNA_MIDIA).getValue();
      const linkExterno = sheet.getRange(i, CONFIG.COLUNA_LINK_EXTERNO).getValue();

      // Processar mídia
      const mediaParsed = parseMidias(mediaUrl);

      // Normalizar tipo de post (mantém formato "Plataforma (tipo)")
      let tipoPostCompleto = tipoPost && tipoPost.toString().trim() !== '' ? tipoPost.toString().trim() : '';

      // Validar tipo de post contra lista completa
      if (tipoPostCompleto && !CONFIG.TIPOS_POST_VALIDOS.includes(tipoPostCompleto)) {
        sheet.getRange(i, CONFIG.COLUNA_LOG).setValue(`❌ Tipo inválido: "${tipoPostCompleto}". Use formato: Plataforma (tipo)`);
        sheet.getRange(i, CONFIG.COLUNA_STATUS).setValue("Erro");
        totalErros++;
        continue;
      }

      // Validação cruzada: tipo vs mídia
      const erroValidacao = validarTipoPostVsMidia(tipoPostCompleto, mediaParsed);
      if (erroValidacao) {
        sheet.getRange(i, CONFIG.COLUNA_LOG).setValue(erroValidacao);
        sheet.getRange(i, CONFIG.COLUNA_STATUS).setValue("Erro");
        totalErros++;
        continue;
      }

      // NÍVEL 2: Validação de compatibilidade para tipos genéricos
      if (tipoPostCompleto && ehTipoGenerico(tipoPostCompleto)) {
        const erroCompatibilidade = validarCompatibilidadeTipoPlataformas(tipoPostCompleto, listaNomesContas);
        if (erroCompatibilidade) {
          sheet.getRange(i, CONFIG.COLUNA_LOG).setValue(erroCompatibilidade);
          sheet.getRange(i, CONFIG.COLUNA_STATUS).setValue("Erro");
          totalErros++;
          continue;
        }
      }

      // Extrai o tipo puro para enviar à API
      // Se for genérico (ex: "carousel"), usa direto
      // Se for específico (ex: "Instagram (carousel)"), extrai o tipo
      let tipoParaAPI = null;
      if (tipoPostCompleto) {
        tipoParaAPI = ehTipoGenerico(tipoPostCompleto)
          ? tipoPostCompleto
          : extrairTipoPost(tipoPostCompleto);
      }

      for (let wsId in enviosPorWorkspace) {
        const idsContas = enviosPorWorkspace[wsId];

        const payload = {
          "accounts": idsContas,
          "post_type": tipoParaAPI || undefined,
          "content": {
            "text": legenda,
            "media": mediaParsed,
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

/**
 * Converte string de mídia em objeto { images: [], video: "" }
 * Aceita separadores: vírgula, ponto-e-vírgula, ou quebra de linha
 * Detecta vídeos automaticamente pela extensão do arquivo
 */
/**
 * Converte string de mídia em objeto { images: [], video: "" }
 * Suporta:
 * 1. Links diretos (terminados em .jpg, .mp4, etc)
 * 2. Links do Google Drive (converte para export=view)
 * 3. Detecção automática de vídeo via extensão ou cabeçalho (opcional)
 */
function parseMidias(mediaStr) {
  if (!mediaStr || mediaStr.toString().trim() === '') return null;

  const links = mediaStr.toString()
    .split(/[,;\n]/)
    .map(s => s.trim())
    .filter(Boolean);

  if (links.length === 0) return null;

  const images = [];
  let video = null;

  links.forEach(rawLink => {
    // 1. Tenta converter se for Google Drive
    let finalLink = converterLinkDrive(rawLink);

    // 2. Detecta se é vídeo
    // Verifica extensões comuns
    let isVideo = CONFIG.EXTENSOES_VIDEO.some(ext => finalLink.toLowerCase().endsWith(ext));

    // Se não tem extensão (ex: link do Drive sem .mp4 no final), tenta inferir ou checar
    // Por padrão, se não parece vídeo explicitamente, tratamos como imagem 
    // (A API do ContentStudio é esperta, mas para separar os arrays precisamos de uma dica)

    // TRUQUE: Se o link original continha indicativo de video, ou se o usuário marcou
    // Para evitar chamadas de rede lentas (UrlFetch), vamos confiar na extensão ou 
    // assumir imagem por padrão, A MENOS que o link explícito do drive aponte para video
    // (Difícil saber sem metadata).

    // MELHORIA V4.3: Se for drive, tentamos acessar via DriveApp se tiver permissão (TRY/CATCH)
    // Se falhar, assumimos imagem.
    if (!isVideo && ehLinkDrive(rawLink)) {
      try {
        const id = extrairIdDrive(rawLink);
        if (id) {
          const file = DriveApp.getFileById(id);
          const mime = file.getMimeType();
          if (mime.startsWith('video/')) {
            isVideo = true;
          }
        }
      } catch (e) {
        console.log("Aviso: Não foi possível checar MIME type via DriveApp (falta permissão?). Assumindo Imagem.", e);
      }
    }

    if (isVideo) {
      video = finalLink; // Última ocorrência ganha
    } else {
      images.push(finalLink);
    }
  });

  const media = {};
  if (images.length > 0) media.images = images;
  if (video) media.video = video;
  return Object.keys(media).length > 0 ? media : null;
}

/**
 * Converte links de visualização do Google Drive em links diretos de download/binares
 */
function converterLinkDrive(url) {
  if (!ehLinkDrive(url)) return url;

  const id = extrairIdDrive(url);
  if (!id) return url;

  // Retorna formato de exportação direta que a API aceita
  return `https://drive.google.com/uc?export=view&id=${id}`;
}

function ehLinkDrive(url) {
  return url.includes('drive.google.com');
}

function extrairIdDrive(url) {
  // Tenta padrões comuns
  // 1. /file/d/ID/
  let match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];

  // 2. id=ID
  match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match) return match[1];

  // 3. /open?id=ID (variação do 2)

  return null;
}

/**
 * Validação cruzada entre tipo de post e mídia fornecida
 * Agora trabalha com formato "Plataforma (tipo)"
 * @param {string} tipoPostCompleto - Formato: "Instagram (feed+reel)"
 * @param {object} media - Objeto { images: [], video: "" }
 * @returns {string|null} Mensagem de erro ou null se válido
 */
function validarTipoPostVsMidia(tipoPostCompleto, media) {
  if (!tipoPostCompleto || tipoPostCompleto.toString().trim() === '') {
    return null; // Sem tipo = válido (usuário pode deixar vazio)
  }

  // Extrai o tipo puro: "Instagram (feed+reel)" → "feed+reel"
  const tipo = extrairTipoPost(tipoPostCompleto);

  if (!tipo) {
    return '❌ Formato de tipo de post inválido. Use: Plataforma (tipo)';
  }

  // Validação para carousel (precisa de 2+ imagens)
  if (tipo.includes('carousel')) {
    if (!media || !media.images || media.images.length < 2) {
      return '❌ Carousel requer 2 ou mais imagens na coluna Mídia';
    }
  }

  // Validação para tipos que exigem vídeo
  const tiposComVideo = ['reel', 'story', 'video', 'shorts'];
  const precisaVideo = tiposComVideo.some(t => tipo.includes(t));

  if (precisaVideo) {
    if (!media || !media.video) {
      // Exceção: story pode ser imagem também, então se for só story, ok imagem.
      // Mas se for reel, TEM que ter vídeo.
      if (tipo.includes('reel') || tipo.includes('video') || tipo.includes('shorts')) {
        return '❌ Reel/Video requer um link de vídeo na coluna Mídia';
      }
    }
  }

  // NOVA VALIDAÇÃO (Iteração 4.5): Bloquear mix Imagem + Vídeo em tipos combinados
  // A API não aceita mix no mesmo objeto (exceto carrossel específico).
  if (tipo.includes('+')) {
    if (media && media.images && media.images.length > 0 && media.video) {
      return '❌ Erro: Tipos mistos (ex: Feed+Reel) não aceitam Imagem e Vídeo JUNTOS.\n\n' +
        'A API exige posts separados. Por favor, crie duas linhas na planilha:\n' +
        '1. Post para Feed (Imagem)\n' +
        '2. Post para Reel (Vídeo)';
    }
  }

  return null;
}

/**
 * DRY RUN: Verifica integridade sem enviar (Iteração 5.0)
 * Atualiza status para 'Pronto' (Verde) ou 'Verificar' (Laranja)
 */
function verificarAgendamentos() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_INTERFACE);
  const data = sheet.getDataRange().getValues();

  let verificados = 0;
  let comErro = 0;

  ss.toast("Verificando integridade...", "🔍 Validação", -1);

  // Começa do índice 1 (linha 2)
  for (let i = 1; i < data.length; i++) {
    const status = data[i][CONFIG.COLUNA_STATUS - 1];

    // Verifica apenas os que estão marcados para sair ou Rascunho
    // (O usuário pode querer validar rascunhos também)
    if (status === 'Agendar' || status === 'Rascunho') {
      const linha = i + 1;

      // Coleta dados da linha
      const dataStr = data[i][CONFIG.COLUNA_DATA - 1];
      const horaStr = data[i][CONFIG.COLUNA_HORA - 1];
      const contas = data[i][CONFIG.COLUNA_CONTAS - 1];
      const tipo = data[i][CONFIG.COLUNA_TIPO_POST - 1];
      const mediaStr = data[i][CONFIG.COLUNA_MIDIA - 1];

      let erro = null;

      // 1. Validar Data
      const dataHora = combinarDataHora(dataStr, horaStr);
      if (!dataHora) erro = 'Data/Hora inválida';
      else if (dataHora < new Date()) erro = 'Data no passado (Mínimo 15min)';

      // 2. Validar Contas
      if (!erro && (!contas || contas === "")) erro = 'Nenhuma conta selecionada';

      // 3. Validar Mídia/Tipo
      if (!erro) {
        const media = parseMidias(mediaStr);
        erro = validarTipoPostVsMidia(tipo, media);
      }

      // Atualiza Planilha
      const cellStatus = sheet.getRange(linha, CONFIG.COLUNA_STATUS);
      const cellLog = sheet.getRange(linha, CONFIG.COLUNA_LOG);

      if (erro) {
        cellStatus.setValue('Verificar'); // Mantém o usuário alerta
        cellStatus.setBackground('#ffeeba'); // Amarelo/Laranja Suave
        cellLog.setValue('⚠️ Falha na Validação');
        cellLog.setNote(erro);
        comErro++;
      } else {
        // Se estava como Agendar, confirma que está Pronto
        if (status === 'Agendar') {
          cellStatus.setValue('Pronto');
          cellStatus.setBackground('#d4edda'); // Verde Suave
          cellLog.setValue('✅ Dados Válidos');
          cellLog.clearNote();
        }
      }
      verificados++;
    }
  }

  SpreadsheetApp.flush();
  ss.toast(`Verificação completa. ${verificados} linhas analisadas.`, "🔍 Fim", 5);

  if (comErro > 0) {
    SpreadsheetApp.getUi().alert(`⚠️ Atenção: Encontrei ${comErro} linha(s) com problemas.\nVerifique as células amarelas e as notas de erro.`);
  } else if (verificados > 0) {
    SpreadsheetApp.getUi().alert(`✅ Tudo Certo! ${verificados} agendamentos prontos para envio.`);
  } else {
    SpreadsheetApp.getUi().alert('Nenhuma linha marcada como "Agendar" ou "Rascunho" encontrada.');
  }
}

// Helper para data (Reuso ou criação se não existir explicito)
function combinarDataHora(dataPost, horaPost) {
  if (!(dataPost instanceof Date)) return null;
  let dataFinal = new Date(dataPost);

  if (horaPost instanceof Date) {
    dataFinal.setHours(horaPost.getHours(), horaPost.getMinutes(), 0);
  } else if (typeof horaPost === 'string' && horaPost.includes(':')) {
    const p = horaPost.split(':');
    dataFinal.setHours(parseInt(p[0]), parseInt(p[1]), 0);
  } else {
    dataFinal.setHours(10, 0, 0);
  }
  return dataFinal;
}