const git = require('isomorphic-git');
const fs = require('fs');
const path = require('path');

const MAX_GITHUB_FILE_SIZE = 100 * 1024 * 1024; // 100 MB limit no GitHub
const WARN_GITHUB_FILE_SIZE = 50 * 1024 * 1024; // 50 MB aviso no GitHub

async function main() {
  const dir = __dirname;
  console.log('📦 A preparar o repositório Git em:', dir);
  
  // 1. Inicializar Git se ainda não existir
  await git.init({ fs, dir });
  console.log('✅ Repositório Git inicializado (.git pronto)');

  // 2. Ficheiros do projeto a incluir no commit
  const filesToAdd = [
    '.gitignore',
    '.env.example',
    'README.md',
    'package.json',
    'package-lock.json',
    'server.js',
    'scraper.js',
    'bot.js',
    'clientManager.js',
    'recommendationEngine.js',
    'nlpClientParser.js',
    'geoResolver.js',
    'portalResolvers.js',
    'googleDriveService.js',
    'GoogleAppsScript_SURE.js',
    'importer.js',
    'parishes.js',
    'vercel.json',
    'render.yaml',
    'init_git.js',
    'push_to_github.js',
    'api/index.js',
    'public/index.html',
    'public/main.js',
    'public/style.css',
    'public/capture.js',
    'zohoService.js',
    'todoistService.js',
    'data/.gitkeep',
    'data/clients.json',
    'data/consultants.json',
    'data/assistants.json',
    'data/zoho_config.json',
    'data/todoist_config.json'
  ];

  let totalSize = 0;
  let stagedCount = 0;

  for (const relPath of filesToAdd) {
    const fullPath = path.join(dir, relPath);
    if (!fs.existsSync(fullPath)) {
      console.log(`ℹ️ [Saltado - não existe]: ${relPath}`);
      continue;
    }

    const stat = fs.statSync(fullPath);
    totalSize += stat.size;

    if (stat.size >= MAX_GITHUB_FILE_SIZE) {
      console.error(`🚨 ERRO: O ficheiro ${relPath} tem ${(stat.size / (1024*1024)).toFixed(2)} MB e ULTRAPASSA o limite de 100MB do GitHub!`);
      process.exit(1);
    } else if (stat.size >= WARN_GITHUB_FILE_SIZE) {
      console.warn(`⚠️ AVISO: O ficheiro ${relPath} tem ${(stat.size / (1024*1024)).toFixed(2)} MB (>50MB).`);
    }

    await git.add({ fs, dir, filepath: relPath });
    stagedCount++;
    console.log(`  + [Adicionado]: ${relPath} (${(stat.size / 1024).toFixed(1)} KB)`);
  }

  console.log(`\n📊 Total de ficheiros preparados: ${stagedCount} (${(totalSize / (1024*1024)).toFixed(2)} MB no total)`);

  // 3. Criar commit
  const commitMessage = process.argv[2] || 'Prepare IdealistaFarm for GitHub production deploy';
  const sha = await git.commit({
    fs,
    dir,
    author: {
      name: 'IdealistaFarm Team',
      email: 'geral@sure.pt'
    },
    message: commitMessage
  });

  // 4. Garantir que a branch principal é 'main'
  try {
    await git.branch({ fs, dir, ref: 'main', checkout: true });
    await git.writeRef({
      fs,
      dir,
      ref: 'refs/heads/main',
      value: sha,
      force: true
    });
  } catch (bErr) {
    // Branch creation fallback
  }

  console.log('\n🎉 Commit criado com sucesso!');
  console.log('📌 SHA do commit:', sha);
  console.log('🌿 Branch:', 'main');
  console.log('\n👉 Para enviar para o GitHub, corre:');
  console.log('   node push_to_github.js https://github.com/SEU_USER/SEU_REPO.git SEU_TOKEN_GITHUB\n');
}

main().catch(err => {
  console.error('❌ Erro durante a preparação do Git:', err);
  process.exit(1);
});

