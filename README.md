<<<<<<< HEAD
# MyCreator API - Sistema de Agendamento Automatizado

Sistema de automação para agendamento de posts em redes sociais via ContentStudio API, integrado ao Google Sheets.

## 🆕 Versão 2.0 - 

### Funcionalidades Adicionadas

✅ **Tipos de Post** - Suporte para `post`, `reel`, `story`, `reel+story` e `carousel`  
✅ **Carrosséis** - Envio de múltiplas imagens em um único post  
✅ **Detecção Automática de Vídeo** - Diferencia imagens de vídeos pela extensão  
✅ **Validação Cruzada** - Bloqueia carrossel sem 2+ imagens ou reel sem vídeo  
✅ **API Key Segura** - Removida do código e armazenada no PropertiesService  

### Melhorias de Segurança

🔒 **API Key migrada** do código para armazenamento seguro  
🔒 **Validação de entrada** para tipos de post aceitos  
🔒 **Tratamento de erros** mais robusto e descritivo  

---

## 📁 Estrutura do Projeto

```
mycreator-api/
├── Config.js          # Configurações e constantes (colunas, tipos válidos, etc)
├── Main.js            # Lógica principal (agendamento, staging, validação)
├── UI.js              # Interface do usuário (menus e popups)
├── MyCreatorAPI.js    # Chamadas à API ContentStudio
├── Popup.html         # Seletor de contas (multi-workspace)
├── SETUP_GUIDE.md     # Guia de configuração pós-atualização
└── README.md          # Este arquivo
```

---

## 🚀 Início Rápido

### 1. Primeira Vez? Configure a API Key

```
Menu: 🚀 Automação MyCreator → ⚙️ Configurar API Key
```

Cole sua chave da ContentStudio quando solicitado.

### 2. Sincronize Workspaces e Contas

```
Menu: 🚀 Automação MyCreator → Atualizar Workspaces/Contas
```

Isso popula a aba **CONFIGS** com suas contas disponíveis.

### 3. Preencha uma Linha na Aba INTERFACE

| Coluna | Conteúdo | Exemplo |
|--------|----------|---------|
| **A** - Status | `Agendar` | Agendar |
| **B** - Data | Data de publicação | 15/02/2026 |
| **C** - Hora | Hora de publicação | 14:30 |
| **D** - Contas | Clique em "Selecionar Contas" | Workspace - Instagram (@perfil) |
| **E** - Tipo de Post | `post`, `reel`, `story`, `carousel` | carousel |
| **F** - Legenda | Texto do post | Confira nossa nova coleção! |
| **G** - Mídia | URL(s) separadas por vírgula | img1.jpg,img2.jpg,img3.jpg |
| **H** - Link Externo | URL externa (opcional) | https://loja.com/promo |

### 4. Teste com Staging

```
Selecione a linha → Menu: Validar JSON (Staging)
```

Verifique o JSON gerado na aba **STAGING** antes de enviar!

### 5. Agendar!

```
Menu: 🚀 Automação MyCreator → AGENDAR
```

O sistema processa TODAS as linhas com status "Agendar" e exibe um relatório final.

---

## 📖 Documentação Técnica

### Tipos de Post Aceitos

| Tipo | Descrição | Mídia Necessária |
|------|-----------|------------------|
| `post` | Post normal no feed | 0 a N imagens (opcional) |
| `reel` | Instagram Reels | 1 vídeo (obrigatório) |
| `story` | Instagram/Facebook Stories | 1 vídeo ou imagem |
| `reel+story` | Publica como Reel E Story simultaneamente | 1 vídeo (obrigatório) |
| `carousel` | Carrossel de imagens | 2 ou mais imagens (obrigatório) |

**Padrão:** Se a coluna E estiver vazia, o sistema usa `post`.

### Formato de Múltiplas Mídias

Separe URLs com **vírgula**, **ponto-e-vírgula** ou **quebra de linha**:

```
https://img1.jpg,https://img2.jpg,https://img3.jpg
```

ou

```
https://img1.jpg
https://img2.jpg
https://img3.jpg
```

### Detecção de Vídeo

O sistema reconhece automaticamente arquivos de vídeo pelas extensões:
- `.mp4`, `.mov`, `.avi`, `.wmv`, `.webm` (case-insensitive)

**Exemplo:**
```
https://meusite.com/video.mp4  →  Detectado como vídeo
https://meusite.com/foto.jpg   →  Detectado como imagem
```

### Payload Gerado (Exemplo Carousel)

```json
{
  "accounts": ["abc123", "def456"],
  "post_type": "carousel",
  "content": {
    "text": "Confira nossa galeria!",
    "media": {
      "images": [
        "https://img1.jpg",
        "https://img2.jpg", 
        "https://img3.jpg"
      ]
    },
    "link": "https://loja.com"
  },
  "scheduling": {
    "publish_type": "scheduled",
    "scheduled_at": "2026-02-15 14:30:00"
  }
}
```

---

## 🔧 Funções Principais

### `Config.js`

- **`CONFIG`** - Objeto com todas as constantes (colunas, tipos válidos, extensões)
- **`getApiKey()`** - Recupera API Key do PropertiesService
- **`checkApiKey()`** - Valida se existe uma API Key configurada
- **`salvarApiKey()`** - Prompt para salvar a API Key

### `Main.js`

- **`sincronizarConfigs()`** - Sincroniza workspaces e contas da ContentStudio
- **`gerarStaging()`** - Gera JSON de teste para linha selecionada
- **`enviarAgendamento()`** - Envia TODOS os posts com status "Agendar"
- **`parseMidias(mediaStr)`** - Converte string de mídia em objeto `{ images: [], video: "" }`
- **`validarTipoPostVsMidia(tipo, media)`** - Valida compatibilidade tipo ↔ mídia

### `UI.js`

- **`onOpen()`** - Cria o menu personalizado
- **`abrirPopupContas()`** - Abre popup de seleção de contas
- **`getDadosParaPopup()`** - Prepara dados dos workspaces/contas
- **`salvarSelecaoNaCelula(lista)`** - Salva contas selecionadas na célula

### `MyCreatorAPI.js`

- **`apiGetWorkspaces()`** - Busca workspaces disponíveis
- **`apiGetAccounts(workspaceId)`** - Busca contas de um workspace
- **`apiCreatePost(workspaceId, payload)`** - Cria/agenda um post

---

## 🛡️ Validações Automáticas

O sistema valida:

1. **Tipo de post** está na lista de tipos válidos
2. **Carousel** tem pelo menos 2 imagens
3. **Reel/Story** tem pelo menos 1 vídeo
4. **Data/Hora** estão no formato correto
5. **Contas selecionadas** existem no CONFIGS
6. **API Key** está configurada antes de qualquer operação

---

## 🐛 Troubleshooting

### Erro: "Chave Ausente"
**Solução:** Execute **⚙️ Configurar API Key** no menu.

### Erro: "Tipo de Post inválido"
**Solução:** Use apenas: `post`, `reel`, `story`, `reel+story` ou `carousel`.

### Erro: "Carrossel requer 2 ou mais imagens"
**Solução:** Adicione pelo menos 2 URLs de imagem separadas por vírgula na coluna G.

### Erro: "Reel/Story requer um link de vídeo"
**Solução:** Certifique-se de que há uma URL terminando em `.mp4`, `.mov`, etc na coluna G.

### JSON no Staging não aparece
**Solução:** Verifique se você selecionou uma linha (não apenas a célula) antes de executar.

---

## 📚 Referências

- [ContentStudio API Docs](https://docs.contentstudio.io/article/1163-contentstudio-api)
- [Google Apps Script Reference](https://developers.google.com/apps-script/reference)
- [PropertiesService (Segurança)](https://developers.google.com/apps-script/reference/properties/properties-service)

---

## 📝 Changelog

### v2.0.0 (2026-02-11)
- ✨ Adicionado suporte a `post_type` (reel, carousel, story)
- ✨ Parsing de múltiplas imagens para carrosséis
- ✨ Detecção automática de vídeos por extensão
- ✨ Validação cruzada tipo de post vs mídia
- 🔒 Migração de API Key para PropertiesService
- 🐛 Removida função `checkApiKey()` duplicada
- 📝 Atualizado índice das colunas após inserção da coluna E

### v1.0.0 (2024)
- 🎉 Versão inicial com agendamento básico
- 📋 Seletor de contas multi-workspace
- 🧪 Função de staging para validação de JSON

---

## 👨‍💻 Desenvolvido por

Este sistema é uma integração Google Apps Script ↔ ContentStudio API.

**Planilha:** [Meus Agendamentos MyCreator](https://docs.google.com/spreadsheets/d/1yxm-Oq5c84Jh-AKr037hiuU4TBpovA7RtBThixcxb44/edit)

---

## 📄 Licença

Este projeto é de uso privado.
=======
# MyCreator API - Sistema de Agendamento Automatizado

Sistema de automação para agendamento de posts em redes sociais via ContentStudio API, integrado ao Google Sheets.

## 🆕 Versão 2.0 - Novidades

### Funcionalidades Adicionadas

✅ **Tipos de Post** - Suporte para `post`, `reel`, `story`, `reel+story` e `carousel`  
✅ **Carrosséis** - Envio de múltiplas imagens em um único post  
✅ **Detecção Automática de Vídeo** - Diferencia imagens de vídeos pela extensão  
✅ **Validação Cruzada** - Bloqueia carrossel sem 2+ imagens ou reel sem vídeo  
✅ **API Key Segura** - Removida do código e armazenada no PropertiesService  

### Melhorias de Segurança

🔒 **API Key migrada** do código para armazenamento seguro  
🔒 **Validação de entrada** para tipos de post aceitos  
🔒 **Tratamento de erros** mais robusto e descritivo  

---

## 📁 Estrutura do Projeto

```
mycreator-api/
├── Config.js          # Configurações e constantes (colunas, tipos válidos, etc)
├── Main.js            # Lógica principal (agendamento, staging, validação)
├── UI.js              # Interface do usuário (menus e popups)
├── MyCreatorAPI.js    # Chamadas à API ContentStudio
├── Popup.html         # Seletor de contas (multi-workspace)
├── SETUP_GUIDE.md     # Guia de configuração pós-atualização
└── README.md          # Este arquivo
```

---

## 🚀 Início Rápido

### 1. Primeira Vez? Configure a API Key

```
Menu: 🚀 Automação MyCreator → ⚙️ Configurar API Key
```

Cole sua chave da ContentStudio quando solicitado.

### 2. Sincronize Workspaces e Contas

```
Menu: 🚀 Automação MyCreator → Atualizar Workspaces/Contas
```

Isso popula a aba **CONFIGS** com suas contas disponíveis.

### 3. Preencha uma Linha na Aba INTERFACE

| Coluna | Conteúdo | Exemplo |
|--------|----------|---------|
| **A** - Status | `Agendar` | Agendar |
| **B** - Data | Data de publicação | 15/02/2026 |
| **C** - Hora | Hora de publicação | 14:30 |
| **D** - Contas | Clique em "Selecionar Contas" | Workspace - Instagram (@perfil) |
| **E** - Tipo de Post | `post`, `reel`, `story`, `carousel` | carousel |
| **F** - Legenda | Texto do post | Confira nossa nova coleção! |
| **G** - Mídia | URL(s) separadas por vírgula | img1.jpg,img2.jpg,img3.jpg |
| **H** - Link Externo | URL externa (opcional) | https://loja.com/promo |

### 4. Teste com Staging

```
Selecione a linha → Menu: Validar JSON (Staging)
```

Verifique o JSON gerado na aba **STAGING** antes de enviar!

### 5. Agendar!

```
Menu: 🚀 Automação MyCreator → AGENDAR
```

O sistema processa TODAS as linhas com status "Agendar" e exibe um relatório final.

---

## 📖 Documentação Técnica

### Tipos de Post Aceitos

| Tipo | Descrição | Mídia Necessária |
|------|-----------|------------------|
| `post` | Post normal no feed | 0 a N imagens (opcional) |
| `reel` | Instagram Reels | 1 vídeo (obrigatório) |
| `story` | Instagram/Facebook Stories | 1 vídeo ou imagem |
| `reel+story` | Publica como Reel E Story simultaneamente | 1 vídeo (obrigatório) |
| `carousel` | Carrossel de imagens | 2 ou mais imagens (obrigatório) |

**Padrão:** Se a coluna E estiver vazia, o sistema usa `post`.

### Formato de Múltiplas Mídias

Separe URLs com **vírgula**, **ponto-e-vírgula** ou **quebra de linha**:

```
https://img1.jpg,https://img2.jpg,https://img3.jpg
```

ou

```
https://img1.jpg
https://img2.jpg
https://img3.jpg
```

### Detecção de Vídeo

O sistema reconhece automaticamente arquivos de vídeo pelas extensões:
- `.mp4`, `.mov`, `.avi`, `.wmv`, `.webm` (case-insensitive)

**Exemplo:**
```
https://meusite.com/video.mp4  →  Detectado como vídeo
https://meusite.com/foto.jpg   →  Detectado como imagem
```

### Payload Gerado (Exemplo Carousel)

```json
{
  "accounts": ["abc123", "def456"],
  "post_type": "carousel",
  "content": {
    "text": "Confira nossa galeria!",
    "media": {
      "images": [
        "https://img1.jpg",
        "https://img2.jpg", 
        "https://img3.jpg"
      ]
    },
    "link": "https://loja.com"
  },
  "scheduling": {
    "publish_type": "scheduled",
    "scheduled_at": "2026-02-15 14:30:00"
  }
}
```

---

## 🔧 Funções Principais

### `Config.js`

- **`CONFIG`** - Objeto com todas as constantes (colunas, tipos válidos, extensões)
- **`getApiKey()`** - Recupera API Key do PropertiesService
- **`checkApiKey()`** - Valida se existe uma API Key configurada
- **`salvarApiKey()`** - Prompt para salvar a API Key

### `Main.js`

- **`sincronizarConfigs()`** - Sincroniza workspaces e contas da ContentStudio
- **`gerarStaging()`** - Gera JSON de teste para linha selecionada
- **`enviarAgendamento()`** - Envia TODOS os posts com status "Agendar"
- **`parseMidias(mediaStr)`** - Converte string de mídia em objeto `{ images: [], video: "" }`
- **`validarTipoPostVsMidia(tipo, media)`** - Valida compatibilidade tipo ↔ mídia

### `UI.js`

- **`onOpen()`** - Cria o menu personalizado
- **`abrirPopupContas()`** - Abre popup de seleção de contas
- **`getDadosParaPopup()`** - Prepara dados dos workspaces/contas
- **`salvarSelecaoNaCelula(lista)`** - Salva contas selecionadas na célula

### `MyCreatorAPI.js`

- **`apiGetWorkspaces()`** - Busca workspaces disponíveis
- **`apiGetAccounts(workspaceId)`** - Busca contas de um workspace
- **`apiCreatePost(workspaceId, payload)`** - Cria/agenda um post

---

## 🛡️ Validações Automáticas

O sistema valida:

1. **Tipo de post** está na lista de tipos válidos
2. **Carousel** tem pelo menos 2 imagens
3. **Reel/Story** tem pelo menos 1 vídeo
4. **Data/Hora** estão no formato correto
5. **Contas selecionadas** existem no CONFIGS
6. **API Key** está configurada antes de qualquer operação

---

## 🐛 Troubleshooting

### Erro: "Chave Ausente"
**Solução:** Execute **⚙️ Configurar API Key** no menu.

### Erro: "Tipo de Post inválido"
**Solução:** Use apenas: `post`, `reel`, `story`, `reel+story` ou `carousel`.

### Erro: "Carrossel requer 2 ou mais imagens"
**Solução:** Adicione pelo menos 2 URLs de imagem separadas por vírgula na coluna G.

### Erro: "Reel/Story requer um link de vídeo"
**Solução:** Certifique-se de que há uma URL terminando em `.mp4`, `.mov`, etc na coluna G.

### JSON no Staging não aparece
**Solução:** Verifique se você selecionou uma linha (não apenas a célula) antes de executar.

---

## 📚 Referências

- [ContentStudio API Docs](https://docs.contentstudio.io/article/1163-contentstudio-api)
- [Google Apps Script Reference](https://developers.google.com/apps-script/reference)
- [PropertiesService (Segurança)](https://developers.google.com/apps-script/reference/properties/properties-service)

---

## 📝 Changelog

### v2.0.0 (2026-02-11)
- ✨ Adicionado suporte a `post_type` (reel, carousel, story)
- ✨ Parsing de múltiplas imagens para carrosséis
- ✨ Detecção automática de vídeos por extensão
- ✨ Validação cruzada tipo de post vs mídia
- 🔒 Migração de API Key para PropertiesService
- 🐛 Removida função `checkApiKey()` duplicada
- 📝 Atualizado índice das colunas após inserção da coluna E

### v1.0.0 (2024)
- 🎉 Versão inicial com agendamento básico
- 📋 Seletor de contas multi-workspace
- 🧪 Função de staging para validação de JSON

---

## 👨‍💻 Desenvolvido por

Este sistema é uma integração Google Apps Script ↔ ContentStudio API.

**Planilha:** [Meus Agendamentos MyCreator](https://docs.google.com/spreadsheets/d/1yxm-Oq5c84Jh-AKr037hiuU4TBpovA7RtBThixcxb44/edit)

---

## 📄 Licença

Este projeto é de uso privado.
>>>>>>> c51b0eb (feat: implementa lógica de Nível 2 e atualiza guias de configuração e cenários)
