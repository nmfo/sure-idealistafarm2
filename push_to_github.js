/**
 * Script para enviar o código para o GitHub via isomorphic-git
 * 
 * Uso: node push_to_github.js <URL_DO_REPOSITORIO> <SEU_TOKEN_GITHUB>
 * Exemplo: node push_to_github.js https://github.com/o-teu-user/sure-idealistafarm.git ghp_xxxxxxxxxxxx
 */

const git = require('isomorphic-git');
const http = require('isomorphic-git/http/node');
const fs = require('fs');

async function push() {
  const repoUrl = process.argv[2];
  const token = process.argv[3];

  if (!repoUrl) {
    console.log('\n⚠️  URL do repositório em falta.');
    console.log('📌 Como usar:');
    console.log('   node push_to_github.js https://github.com/SEU_USER/SEU_REPO.git SEU_TOKEN_GITHUB\n');
    console.log('🔑 Para criar o seu Token no GitHub (Fine-grained ou Classic):');
    console.log('   1. Aceda a: https://github.com/settings/tokens');
    console.log('   2. Crie um token com permissão de "repo" (ou "Contents: Read and write")');
    console.log('   3. Copie o token (começa por ghp_...)\n');
    return;
  }

  const dir = __dirname;
  console.log(`\n🚀 A enviar branch 'main' para: ${repoUrl} ...`);

  try {
    await git.push({
      fs,
      http,
      dir,
      remote: 'origin',
      url: repoUrl,
      ref: 'main',
      force: false,
      onAuth: () => ({
        username: token || 'git',
        password: token || ''
      })
    });

    console.log('🎉 Código enviado com sucesso para o GitHub!');
    console.log(`🔗 Verifique no repositório: ${repoUrl.replace(/\.git$/, '')}\n`);
  } catch (err) {
    console.error('\n❌ Erro ao enviar para o GitHub:', err.message);
    if (err.message && err.message.includes('401') || err.message.includes('403') || err.message.includes('Authentication failed')) {
      console.error('👉 Verifique se o Token GitHub (PAT) é válido e tem permissões de escrita ("repo").');
    }
  }
}

push();

