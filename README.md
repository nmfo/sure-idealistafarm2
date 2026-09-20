# IdealistaFarm & SURE CRM 🌱 🏡

Sistema inteligente e automático de pesquisa, gestão e recomendação de imóveis (Idealista, Imovirtual, CasaSAPO, SuperCasa, BPI Expresso Imobiliário, Zome, ARYS, ERA, RE/MAX, etc.) para consultores imobiliários e equipas de mediação.

---

## 🚀 Funcionalidades Principais

- 🤖 **Bot de Pesquisa Multi-Portal**: Suporte para Idealista, Imovirtual, CasaSAPO, SuperCasa, BPI Expresso Imobiliário, Zome, etc.
- 🎯 **Motor de Matching Inteligente**: Cruzamento automático dos critérios dos clientes (localização, freguesia, orçamento, tipologia, características) com scoring ponderado de relevância.
- 📋 **Top 3 Recomendações Instantâneas**: Geração com 1 clique de resumos prontos para WhatsApp e Email com links diretos.
- ✉️ **Anti-Repetição**: Registo histórico de imóveis enviados e favoritos para nunca repetir sugestões ao mesmo cliente.
- ☁️ **Sincronização Google Drive / Google Sheets**: Integração bidirecional e backup automático em nuvem com Google Apps Script.
- 📄 **Importação Direta & Parsing HTML**: Importe listings diretamente através de URLs individuais ou páginas completas de resultados.
- 👥 **Gestão Multi-Consultor**: Filtros e atribuição de leads por consultor com códigos de cor e prioridades de urgência.

---

## 🛠️ Instalação e Execução Local

### 1. Pré-requisitos
- Node.js 18+ instalado
- npm ou yarn

### 2. Clonar e Instalar Dependências
```bash
git clone https://github.com/SEU_USER/SEU_REPO.git
cd idealistafarm
npm install
npx playwright install chromium
```

### 3. Configurar Variáveis de Ambiente
Copie o ficheiro `.env.example` para `.env`:
```bash
cp .env.example .env
```
Edite as variáveis conforme necessário:
- `PORT`: Porta do servidor (padrão: 3000)
- `GOOGLE_DRIVE_ROOT_FOLDER_ID`: ID da pasta do Google Drive (opcional)
- `GOOGLE_WEBHOOK_URL`: URL do Webhook do Google Apps Script (opcional)

### 4. Iniciar o Servidor
```bash
npm start
```
Aceda a **[http://localhost:3000](http://localhost:3000)** no seu navegador.

---

## 📦 Envio para o GitHub

Para preparar o commit e enviar para o repositório remoto:

```bash
# 1. Preparar e criar o commit com validação dos limites do GitHub
node init_git.js "Mensagem do commit"

# 2. Enviar para o GitHub
node push_to_github.js https://github.com/SEU_USER/SEU_REPO.git SEU_TOKEN_GITHUB
```

---

## 🛡️ Boas Práticas & Limites do GitHub
Este repositório está configurado para respeitar rigorosamente os limites do GitHub:
- **Limite de 100MB por ficheiro**: Perfis binários do Chromium, cache e sessões de navegador (`data/*_profile/`, `.cache/`) estão no `.gitignore`.
- **Privacidade & Segurança**: Credenciais, Webhooks (`google_webhook.json`, `bot_cookies.json`) e dados operacionais de clientes (`clients.json`, `listings.json`) estão protegidos. Modelos de exemplo são fornecidos em `.example.json`.

---

## ☁️ Deploy

### Vercel / Render / Servidor VPS
- O projeto inclui ficheiros de configuração prontos: `vercel.json` e `render.yaml`.
- Em ambientes Serverless (como Vercel), as APIs operam em modo rápido de importação direta / webhook.

---

## 📄 Licença
Propriedade privada — Uso exclusivo da equipa SURE.

