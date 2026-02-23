# Guia de Configuração Pós-Atualização

## 📋 Checklist de Migração

### 1. ✅ Configurar API Key (OBRIGATÓRIO)

A chave da API foi removida do código por segurança. Agora ela é armazenada de forma segura no Google Apps Script.

**Passo a passo:**

1. Abra sua planilha
2. No menu **🚀 Automação MyCreator**, clique em **⚙️ Configurar API Key**
3. Cole sua API Key quando solicitado: `cs_dbc4951ff3f99972fe9184ca435aef0c49610e7bbe22a6dd493d1939d3c23901`
4. Clique em **OK**

> **⚠️ IMPORTANTE:** Execute este passo ANTES de usar qualquer outra função do sistema!

---

### 2. ✅ Validar Estrutura de Colunas

Confirme que suas colunas estão nesta ordem:

| A | B | C | D | E | F | G | H | I |
|---|---|---|---|---|---|---|---|---|
| Status | Data | Hora | Contas Sociais | **Tipo de Post** | Legenda do Post | Link da Mídia | Link Externo | Log de Erro |

**A coluna E (Tipo de Post) é NOVA** e deve estar vazia ou preenchida com valores válidos.

---

### 3. ✅ Configurar Validação de Dados na Coluna E

Para evitar erros de digitação, configure um dropdown na coluna E:

1. Selecione toda a coluna E (clique no cabeçalho "E")
2. Menu **Dados** → **Validação de dados**
3. Em "Critérios", escolha **Lista de itens**
4. Cole esta lista:
   ```
   Instagram (feed),Instagram (feed+reel),Instagram (reel),Instagram (carousel),Instagram (story),Instagram (feed+story),Instagram (feed+reel+story),Instagram (reel+story),Instagram (carousel+story),Facebook (feed),Facebook (feed+reel),Facebook (reel),Facebook (story),Facebook (feed+story),Facebook (feed+reel+story),Facebook (reel+story),YouTube (video),YouTube (shorts),TikTok (video),TikTok (carousel),Pinterest (feed),Google My Business (feed),LinkedIn (feed),LinkedIn (carousel),feed,carousel,video,story,reel
   ```
5. Marque **Mostrar lista suspensa na célula**
6. Marque **Rejeitar entrada se os dados forem inválidos**
7. Clique em **Salvar**

**Novidade:** Agora você pode usar **tipos genéricos** (ex: `carousel`) para publicar em múltiplas plataformas de uma vez!

---

### 4. ✅ Entender os Tipos de Post

O sistema agora suporta **2 níveis de tipos**:

#### **Nível 1: Tipos Específicos por Plataforma** (Formato: `Plataforma (tipo)`)

Use quando todas as contas são da **mesma plataforma**.

| Plataforma | Tipos Disponíveis |
|------------|-------------------|
| **Instagram** | feed, feed+reel, reel, carousel, story, feed+story, feed+reel+story, reel+story, carousel+story |
| **Facebook** | feed, feed+reel, reel, story, feed+story, feed+reel+story, reel+story |
| **YouTube** | video, shorts |
| **TikTok** | video, carousel |
| **LinkedIn** | feed, carousel |
| **Pinterest** | feed |
| **Google My Business** | feed |

**Formato na planilha:** `Instagram (carousel)`, `YouTube (shorts)`, `Facebook (feed+reel)`, etc.

---

#### **Nível 2: Tipos Genéricos** 🆕 (Formato: `carousel`, `feed`, etc.)

Use quando quer publicar em **múltiplas plataformas** com o mesmo tipo.

| Tipo Genérico | Plataformas Compatíveis | Exemplo de Uso |
|---------------|-------------------------|----------------|
| **feed** | Instagram, Facebook, LinkedIn, Pinterest, GMB | Foto única para todas as redes |
| **carousel** | Instagram, LinkedIn, TikTok | Carrossel de fotos multi-plataforma |
| **video** | TikTok, YouTube | Vídeo para TikTok + YouTube |
| **story** | Instagram, Facebook | Story simultâneo |
| **reel** | Instagram, Facebook | Reel para Instagram + Facebook |

**Vantagem:** Não precisa criar múltiplas linhas para cross-posting!

**Exemplo:**
```
Coluna D: Instagram (@perfil1), LinkedIn (@empresa)
Coluna E: carousel
Coluna G: img1.jpg,img2.jpg,img3.jpg

✅ Sistema valida automaticamente que ambas plataformas aceitam carousel
✅ Envia para ambas em uma única operação
```

**Validação Automática:**
- ✅ Sistema verifica se **todas** as plataformas selecionadas aceitam o tipo genérico
- ❌ Se alguma plataforma não aceitar, exibe erro claro
- 📝 Exemplo de erro: "Tipo 'reel' não é compatível com: Pinterest"

---

**Se deixar a coluna E vazia**, o post será enviado sem especificar tipo (a API usa o padrão da plataforma).

---

### 5. ✅ Como Preencher Múltiplas Imagens/Vídeos

Para carrosséis ou múltiplas mídias, separe os links na coluna G com:
- **Vírgula** (`,`)
- **Ponto-e-vírgula** (`;`)
- **Quebra de linha** (Alt+Enter no Google Sheets)

**Exemplo para Carousel:**
```
https://exemplo.com/img1.jpg,https://exemplo.com/img2.jpg,https://exemplo.com/img3.jpg
```

**Exemplo para Reel:**
```
https://exemplo.com/video.mp4
```

> O sistema detecta automaticamente vídeos pela extensão (`.mp4`, `.mov`, `.avi`, `.wmv`, `.webm`)

---

### 6. ✅ Testar com Staging

Antes de agendar posts reais, **sempre teste** com a função **Validar JSON (Staging)**:

1. Preencha uma linha de teste na aba INTERFACE
2. Selecione a linha
3. Menu **🚀 Automação MyCreator** → **Validar JSON (Staging)**
4. Vá para a aba **STAGING** e verifique o JSON gerado
5. Procure por:
   - `"post_type": "carousel"` (ou outro tipo que você definiu)
   - `"media": { "images": ["url1", "url2", "url3"] }` (array de imagens para carousel)
   - `"media": { "video": "url.mp4" }` (vídeo para reel/story)

**Se o JSON estiver correto**, você pode agendar com segurança!

---

## 🔍 Validações Automáticas

O sistema agora valida automaticamente:

✅ **Tipo de post válido** - Deve ser um dos 5 tipos aceitos  
✅ **Carrossel** - Bloqueia se tiver menos de 2 imagens  
✅ **Reel/Story** - Bloqueia se não tiver um vídeo  
✅ **Extensão de vídeo** - Detecta automaticamente `.mp4`, `.mov`, etc  

Se houver erro, você verá uma mensagem clara explicando o problema!

---

## 🆘 Troubleshooting

### "Chave Ausente" ao tentar agendar
→ Execute **⚙️ Configurar API Key** no menu

### "Tipo de Post inválido" ou "Use formato: Plataforma (tipo)"
→ Use o formato correto: `Instagram (feed)`, `YouTube (video)`, ou tipos genéricos: `carousel`, `feed`, etc.  
→ Consulte a lista completa na validação da coluna E

### "Tipo 'X' não é compatível com: Y"
→ Você está usando um tipo genérico incompatível com alguma plataforma selecionada  
→ Exemplo: `reel` não funciona com Pinterest  
→ **Solução:** Use tipo específico ou remova a plataforma incompatível

### "Carousel requer 2 ou mais imagens"
→ Adicione mais links separados por vírgula na coluna G

### "Reel/Story/Video requer um link de vídeo"
→ Coloque um link terminando em `.mp4` ou `.mov` na coluna G

---

## 📊 Exemplos Completos

### Exemplo 1: Tipo Específico (Instagram apenas)

| A | B | C | D | E | F | G | H | I |
|---|---|---|---|---|---|---|---|---|
| Agendar | 15/02/2026 | 14:30 | Workspace - Instagram (@conta) | **Instagram (carousel)** | Confira nossa galeria! | `img1.jpg,img2.jpg,img3.jpg` | https://site.com | |

Resultado esperado no Staging:
```json
{
  "accounts": ["abc123"],
  "post_type": "carousel",
  "content": {
    "text": "Confira nossa galeria!",
    "media": {
      "images": ["img1.jpg", "img2.jpg", "img3.jpg"]
    },
    "link": "https://site.com"
  },
  "scheduling": {
    "publish_type": "scheduled",
    "scheduled_at": "2026-02-15 14:30:00"
  }
}
```

---

### Exemplo 2: Tipo Genérico (Cross-platform) 🆕

| A | B | C | D | E | F | G | H | I |
|---|---|---|---|---|---|---|---|---|
| Agendar | 15/02/2026 | 14:30 | Workspace - Instagram (@loja), Workspace - LinkedIn (@empresa) | **carousel** | Confira nossa galeria! | `img1.jpg,img2.jpg,img3.jpg` | https://site.com | |

Resultado esperado no Staging:
```json
{
  "accounts": ["abc123", "def456"],
  "post_type": "carousel",
  "content": {
    "text": "Confira nossa galeria!",
    "media": {
      "images": ["img1.jpg", "img2.jpg", "img3.jpg"]
    },
    "link": "https://site.com"
  },
  "scheduling": {
    "publish_type": "scheduled",
    "scheduled_at": "2026-02-15 14:30:00"
  }
}
```

**Diferença:** Mesmo tipo, múltiplas plataformas, 1 única linha! ✅

---

## 🎯 Próximos Passos (Opcional)

Se quiser adicionar suporte para **Primeiro Comentário** (`first_comment`) futuramente:

1. Adicionar coluna **I** com nome "Primeiro Comentário"
2. Deslocar "Log de Erro" para coluna **J**
3. Avisar para implementarmos o código adicional

Por enquanto, essa funcionalidade está **desativada** conforme combinado.
