# IdealistaFarm 🌱

Sistema automático de pesquisa e gestão de imóveis do Idealista para consultores imobiliários.

## Funcionalidades

- 🤖 **Bot de Pesquisa Automática** — Abre o Idealista automaticamente e extrai imóveis reais com Playwright
- 📄 **Importador de Página** — Cole o código HTML de qualquer página do Idealista e extraia imóveis instantaneamente
- 🔗 **Link Direto** — Adicione links individuais de imóveis manualmente
- ⭐ **Top 3 Recomendados** — Seleciona automaticamente os 3 melhores imóveis ainda não enviados ao cliente
- 📋 **Copiar 3 Links Juntos** — Copia os 3 links formatados para WhatsApp/Email com 1 clique
- ✉️ **Anti-Repetição** — Marque imóveis como "Já Enviado" para nunca repetir envios ao mesmo cliente
- 👁️ **Ver Anúncio Completo** — Modal com foto, características e link direto
- 📊 **Exportar CSV** — Exporta os imóveis de cada cliente para Excel

## Instalação

```bash
npm install
npx playwright install chromium
npm start
```

## Uso

Abra [http://localhost:3000](http://localhost:3000) no seu navegador.

1. Crie um cliente com nome, localização e critérios de preço/tipologia
2. Clique em **Pesquisar Agora** — o Bot abre automaticamente o Idealista e recolhe os imóveis
3. Se aparecer o slider de verificação, deslize-o uma vez na janela aberta
4. Os imóveis reais aparecem no Dashboard com fotos reais, preços e links diretos
5. Use o **Top 3** para copiar os melhores links para enviar ao cliente
6. Marque como **Já Enviado** para não repetir envios
