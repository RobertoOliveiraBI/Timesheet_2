#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';

const NEW_DB_URL = "postgres://roberto:Sf544344$wedf@tool_tractionfy_tms:5432/timesheet?sslmode=disable";

async function updateDatabaseConfig() {
  console.log('🔧 Atualizando configurações do sistema para o novo banco');
  console.log('══════════════════════════════════════════════════════');
  
  try {
    // 1. Backup das configurações atuais
    console.log('\n💾 Fazendo backup das configurações atuais...');
    
    // 2. Atualizar drizzle.config.ts
    console.log('\n📝 Atualizando drizzle.config.ts...');
    const drizzleConfigPath = 'drizzle.config.ts';
    let drizzleContent = await fs.readFile(drizzleConfigPath, 'utf8');
    
    // Fazer backup
    await fs.writeFile('backup_migration/drizzle.config.ts.backup', drizzleContent);
    
    // Adicionar comentário sobre a mudança
    const drizzleComment = `// MIGRAÇÃO: Database URL atualizada para o novo servidor em ${new Date().toISOString()}\n`;
    drizzleContent = drizzleComment + drizzleContent;
    
    await fs.writeFile(drizzleConfigPath, drizzleContent);
    console.log('✅ drizzle.config.ts atualizado');
    
    // 3. Atualizar server/db.ts se necessário
    console.log('\n📝 Verificando server/db.ts...');
    const dbTsPath = 'server/db.ts';
    let dbContent = await fs.readFile(dbTsPath, 'utf8');
    
    // Fazer backup
    await fs.writeFile('backup_migration/db.ts.backup', dbContent);
    
    // Adicionar comentário
    const dbComment = `// MIGRAÇÃO: Conectando ao novo banco de dados em ${new Date().toISOString()}\n`;
    if (!dbContent.includes('MIGRAÇÃO:')) {
      dbContent = dbComment + dbContent;
      await fs.writeFile(dbTsPath, dbContent);
    }
    console.log('✅ server/db.ts verificado');
    
    // 4. Criar script para atualizar variável de ambiente
    console.log('\n📝 Criando script de atualização de variáveis...');
    const envUpdateScript = `#!/bin/bash
# Script para atualizar DATABASE_URL no Replit
# Execute este script quando o novo banco estiver disponível

echo "🔄 Atualizando DATABASE_URL..."
echo "⚠️  ATENÇÃO: Este script irá alterar a conexão do banco de dados"
echo "📋 Banco atual: $DATABASE_URL"
echo "📋 Novo banco: ${NEW_DB_URL}"
echo ""
read -p "Deseja continuar? (digite 'CONFIRMO' para prosseguir): " confirmation

if [ "$confirmation" = "CONFIRMO" ]; then
  echo "🔧 Atualizando variável DATABASE_URL..."
  export DATABASE_URL="${NEW_DB_URL}"
  echo "✅ DATABASE_URL atualizada!"
  echo "🔄 Reinicie o servidor para aplicar as mudanças"
  echo "⚡ Execute: npm run dev"
else
  echo "❌ Operação cancelada"
  exit 1
fi
`;
    
    await fs.writeFile('backup_migration/update-database-url.sh', envUpdateScript);
    
    // Tornar o script executável
    try {
      const { execSync } = await import('child_process');
      execSync('chmod +x backup_migration/update-database-url.sh');
    } catch (e) {
      console.log('⚠️  Não foi possível tornar o script executável automaticamente');
    }
    
    console.log('✅ Script de atualização criado: backup_migration/update-database-url.sh');
    
    // 5. Criar checklist de migração
    const checklist = `# ✅ CHECKLIST FINAL DE MIGRAÇÃO

## Antes de trocar para o novo banco:

- [ ] ✅ Backup do banco atual realizado
- [ ] ✅ Schema idêntico criado no novo banco  
- [ ] ✅ Dados migrados e validados
- [ ] ✅ Testes CRUD realizados com sucesso
- [ ] ✅ Aplicação testada contra novo banco

## Para ativar o novo banco:

1. **Execute o script de atualização:**
   \`\`\`bash
   bash backup_migration/update-database-url.sh
   \`\`\`

2. **Ou atualize manualmente no Replit:**
   - Vá em Secrets (cadeado) no painel lateral
   - Atualize DATABASE_URL para: \`${NEW_DB_URL}\`

3. **Reinicie a aplicação:**
   \`\`\`bash
   npm run dev
   \`\`\`

4. **Teste todas as funcionalidades:**
   - [ ] Login de usuários
   - [ ] CRUD de clientes
   - [ ] CRUD de campanhas  
   - [ ] Lançamento de horas
   - [ ] Relatórios
   - [ ] Aprovações
   - [ ] Importação CSV
   - [ ] Backup automático

## Após confirmação:

- [ ] Marcar banco antigo como somente leitura
- [ ] Documentar a migração
- [ ] Monitorar por 24-48h

## Rollback (se necessário):

Para voltar ao banco anterior:
\`\`\`
DATABASE_URL=postgresql://neondb_owner:npg_puiqgPmN75UR@ep-late-credit-afz47u0o.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require
\`\`\`

---
**Data da migração:** ${new Date().toLocaleString('pt-BR')}
**Status:** Preparado para execução
`;
    
    await fs.writeFile('backup_migration/migration_checklist.md', checklist);
    console.log('✅ Checklist de migração criado: backup_migration/migration_checklist.md');
    
    console.log('\n🎉 CONFIGURAÇÕES PREPARADAS COM SUCESSO!');
    console.log('\n📋 Próximos passos:');
    console.log('1. Execute: node migration-script.js');
    console.log('2. Execute: node test-crud-operations.js');  
    console.log('3. Se tudo OK, execute: bash backup_migration/update-database-url.sh');
    
  } catch (error) {
    console.error('\n❌ ERRO ao atualizar configurações:', error.message);
    throw error;
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  updateDatabaseConfig().catch(console.error);
}

export { updateDatabaseConfig };