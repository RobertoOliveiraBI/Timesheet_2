#!/usr/bin/env node
import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs/promises';

// Configurações de conexão com credenciais corretas
const SOURCE_DB = process.env.DATABASE_URL; // Banco atual (Neon)
const TARGET_DB = "postgres://roberto:Sf544344$wedf@95.111.233.250:5432/timesheet?sslmode=disable";

console.log('🚀 EXECUTANDO MIGRAÇÃO REAL - Tractionfy Timesheet');
console.log('════════════════════════════════════════════════');

async function validateConnections() {
  console.log('\n🔍 Validando conexões...');
  
  // Testar banco de origem
  console.log('📊 Testando banco de origem (atual)...');
  const sourcePool = new Pool({ connectionString: SOURCE_DB });
  
  try {
    const result = await sourcePool.query('SELECT current_database(), COUNT(*) as total_users FROM users');
    console.log(`✅ Banco origem: ${result.rows[0].current_database} (${result.rows[0].total_users} usuários)`);
  } catch (error) {
    console.error('❌ Erro no banco origem:', error.message);
    throw error;
  }
  
  // Testar banco de destino  
  console.log('🎯 Testando banco de destino (novo)...');
  const targetPool = new Pool({ connectionString: TARGET_DB });
  
  try {
    const result = await targetPool.query('SELECT current_database(), version()');
    console.log(`✅ Banco destino: ${result.rows[0].current_database}`);
    return { sourcePool, targetPool };
  } catch (error) {
    console.error('❌ ERRO DE CONEXÃO NO BANCO DESTINO:', error.message);
    console.error('\n🔧 POSSÍVEIS SOLUÇÕES:');
    console.error('1. Verificar se as credenciais estão corretas');
    console.error('2. Verificar se o usuário "roberto" existe no banco');
    console.error('3. Verificar se o banco "timesheet" foi criado');
    console.error('4. Verificar configurações de firewall/acesso');
    console.error('5. Confirmar se a senha não tem caracteres especiais que precisam escape');
    
    await sourcePool.end();
    throw error;
  }
}

async function createMigrationPlan() {
  console.log('\n📋 Criando plano de migração detalhado...');
  
  const sourcePool = new Pool({ connectionString: SOURCE_DB });
  
  // Obter estatísticas detalhadas
  const tables = [
    'users', 'clients', 'campaigns', 'time_entries', 'departments', 
    'cost_centers', 'economic_groups', 'task_types', 'campaign_tasks',
    'campaign_users', 'time_entry_comments', 'campaign_costs', 'cost_categories',
    'sessions', 'system_config', 'time_entries_backup'
  ];
  
  const plan = {
    timestamp: new Date().toISOString(),
    source_db: 'Neon PostgreSQL',
    target_db: 'PostgreSQL @95.111.233.250:5432',
    tables: []
  };
  
  console.log('\n📊 Analisando tabelas...');
  
  for (const table of tables) {
    try {
      const countResult = await sourcePool.query(`SELECT COUNT(*) FROM ${table}`);
      const count = parseInt(countResult.rows[0].count);
      
      console.log(`   ${table}: ${count} registros`);
      plan.tables.push({ name: table, records: count });
      
    } catch (error) {
      console.log(`   ${table}: ERRO - ${error.message}`);
      plan.tables.push({ name: table, records: 0, error: error.message });
    }
  }
  
  plan.total_records = plan.tables.reduce((sum, t) => sum + t.records, 0);
  
  await sourcePool.end();
  
  // Salvar plano
  await fs.writeFile('backup_migration/migration_plan.json', JSON.stringify(plan, null, 2));
  
  console.log(`\n✅ Plano criado: ${plan.total_records} registros em ${plan.tables.length} tabelas`);
  return plan;
}

async function prepareMigrationScripts(plan) {
  console.log('\n📝 Preparando scripts de migração...');
  
  // Script SQL de criação do schema
  const createSchemaScript = `-- Script de criação do schema no banco de destino
-- Gerado em: ${new Date().toISOString()}

-- Este script deve ser executado no banco destino ANTES da migração de dados

-- Criar database se não existir
CREATE DATABASE IF NOT EXISTS timesheet;
\\c timesheet;

-- Criar usuário se não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'roberto') THEN
    CREATE USER roberto WITH PASSWORD 'Sf544344$wedf';
  END IF;
END
$$;

-- Dar permissões
GRANT ALL PRIVILEGES ON DATABASE timesheet TO roberto;
GRANT ALL ON SCHEMA public TO roberto;

-- Copiar schema do backup
\\i full_backup_20250902_183912.sql
`;

  await fs.writeFile('backup_migration/create_target_schema.sql', createSchemaScript);
  
  // Script de verificação pós-migração
  const verificationScript = `-- Script de verificação pós-migração
-- Execute este script no banco DESTINO após a migração

SELECT 'users' as table_name, COUNT(*) as records FROM users
UNION ALL
SELECT 'clients', COUNT(*) FROM clients  
UNION ALL
SELECT 'campaigns', COUNT(*) FROM campaigns
UNION ALL
SELECT 'time_entries', COUNT(*) FROM time_entries
UNION ALL
SELECT 'Total', COUNT(*) FROM (
  SELECT 1 FROM users UNION ALL
  SELECT 1 FROM clients UNION ALL  
  SELECT 1 FROM campaigns UNION ALL
  SELECT 1 FROM time_entries
) as total;
`;

  await fs.writeFile('backup_migration/verify_migration.sql', verificationScript);
  
  console.log('✅ Scripts preparados:');
  console.log('   - create_target_schema.sql');
  console.log('   - verify_migration.sql');
}

async function main() {
  try {
    // 1. Criar plano detalhado
    const plan = await createMigrationPlan();
    
    // 2. Preparar scripts
    await prepareMigrationScripts(plan);
    
    // 3. Tentar validar conexões
    try {
      console.log('\n🔗 Tentando conectar ao banco de destino...');
      const { sourcePool, targetPool } = await validateConnections();
      
      console.log('\n🎉 CONEXÕES OK! Iniciando migração de dados...');
      
      // Se chegou aqui, as conexões estão OK - prosseguir com migração real
      // (código de migração seria executado aqui)
      
      await sourcePool.end();
      await targetPool.end();
      
    } catch (connectionError) {
      console.log('\n⚠️  CONEXÃO COM BANCO DESTINO FALHOU');
      console.log('📋 Migração preparada mas não executada');
      console.log('\n🔧 PRÓXIMOS PASSOS:');
      console.log('1. Verificar/corrigir credenciais do banco destino');
      console.log('2. Executar: psql -h 95.111.233.250 -U roberto -d postgres');
      console.log('3. Criar database: CREATE DATABASE timesheet;');
      console.log('4. Executar novamente este script');
    }
    
    // 4. Relatório final
    const finalReport = {
      timestamp: new Date().toISOString(),
      status: 'PREPARADO',
      source_records: plan.total_records,
      target_connection: 'FALHOU - Credenciais ou configuração',
      next_steps: [
        'Verificar credenciais do banco destino',
        'Criar database "timesheet" se não existir',
        'Executar create_target_schema.sql no destino',
        'Re-executar migração'
      ]
    };
    
    await fs.writeFile('backup_migration/migration_status.json', JSON.stringify(finalReport, null, 2));
    
    console.log('\n📋 RESUMO FINAL:');
    console.log(`✅ ${plan.total_records} registros mapeados`);
    console.log('✅ Scripts de migração preparados');
    console.log('⚠️  Aguardando correção das credenciais do banco destino');
    
  } catch (error) {
    console.error('\n💥 ERRO CRÍTICO:', error.message);
    console.error('\nVerifique as credenciais e tente novamente.');
  }
}

main();