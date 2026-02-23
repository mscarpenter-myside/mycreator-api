# 🚀 Ideias e Melhorias Futuras

Este documento registra conceitos avançados e funcionalidades que foram consideradas mas postergadas em favor da simplicidade/segurança, para possível implementação futura.

---

## 1. Separação Automática de Mídia (Robô Split)

### O Problema
A API do ContentStudio (e do Instagram) não permite postagens mistas de **Imagem E Vídeo** no mesmo objeto de `post`, exceto em Carrosséis específicos. 
Ao selecionar um tipo combinado como `feed+reel`, o usuário hoje é obrigado a garantir que a mídia seja compatível com ambos (ou seja, apenas Vídeo, já que Reel exige vídeo e Feed aceita vídeo).

### A Solução Proposta (Automática)
Implementar uma lógica no Backend (`Main.js`) que detecta media mista e **divide** a solicitação em dois ou mais agendamentos separados.

### Lógica de Implementação
**Entrada:**
- Tipo: `feed+reel`
- Mídia: `[imagem1.jpg, video1.mp4]`

**Processamento:**
1.  O script analisa os tipos solicitados.
2.  Separa os tipos em grupos:
    - **Grupo Imagem:** `feed`, `story`, `carousel`
    - **Grupo Vídeo:** `reel`, `video`, `shorts`
3.  Cria Payloads Separados:
    - **Payload A (Feed):** Recebe `imagem1.jpg`. Tipo ajustado para `feed`.
    - **Payload B (Reel):** Recebe `video1.mp4`. Tipo ajustado para `reel`.
4.  Envia sequencialmente para a API.

### Logs e Transparência
Para não confundir o usuário (que vê apenas 1 linha na planilha), o log deve ser explícito:
- **Status:** `✅ Enviado (Split)`
- **Nota:** 
  ```
  Post 1 (Feed): ID 123456
  Post 2 (Reel): ID 789012
  ```

### Por que não foi implementado agora?
Optou-se pela segurança de manter 1 Linha = 1 Post para evitar complexidade de depuração e garantir que o usuário tenha controle total sobre qual legenda vai para qual mídia (já que o split duplicaria a legenda).

---

## 2. Legendas Dinâmicas com Separador
Caso o "Robô Split" seja implementado, permitir legendas diferentes na mesma célula:
- **Formato:** `Texto para o Feed... || Texto para o Reel...`
- **Lógica:** O script quebra pelo `||` e atribui cada parte ao seu respectivo payload.

---
