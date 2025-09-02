#!/usr/bin/env node
import { Pool } from 'pg';
import fs from 'fs/promises';

// Configurações de conexão
const SOURCE_DB = process.env.DATABASE_URL; // Banco atual (Neon)
const TARGET_DB = "postgres://roberto:Sf544344$wedf@tool_tractionfy_tms:5432/timesheet?sslmode=disable";

// Lista de tabelas na ordem correta (respeitando foreign keys)
const TABLES_ORDER = [
  'sessions',
  'departments', 
  'cost_centers',
  'economic_groups',
  'cost_categories',
  'users',
  'clients',
  'campaigns',
  'campaign_users',
  'task_types',
  'campaign_tasks',
  'time_entries',
  'time_entry_comments',
  'campaign_costs',
  'system_config',
  'time_entries_backup'
];

async function validateConnection(connectionString, label) {
  console.log(`\n🔍 Testando conexão com ${label}...`);
  const pool = new Pool({ connectionString });
  
  try {
    const result = await pool.query('SELECT current_database(), version()');
    console.log(`✅ ${label} conectado: ${result.rows[0].current_database}`);
    return pool;
  } catch (error) {
    console.error(`❌ Erro ao conectar ${label}:`, error.message);
    throw error;
  }
}

async function getTableSchema(pool, tableName) {
  const query = `
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns 
    WHERE table_name = $1 AND table_schema = 'public'
    ORDER BY ordinal_position
  `;
  const result = await pool.query(query, [tableName]);
  return result.rows;
}

async function compareSchemas(sourcePool, targetPool) {
  console.log('\n📊 Comparando schemas...');
  const differences = [];
  
  for (const table of TABLES_ORDER) {
    try {
      const sourceSchema = await getTableSchema(sourcePool, table);
      const targetSchema = await getTableSchema(targetPool, table);
      
      if (sourceSchema.length !== targetSchema.length) {
        differences.push(`Tabela ${table}: diferentes números de colunas`);
      }
      
      console.log(`✅ ${table}: ${sourceSchema.length} colunas`);
    } catch (error) {
      differences.push(`Tabela ${table}: ${error.message}`);
    }
  }
  
  return differences;
}

async function migrateTable(sourcePool, targetPool, tableName) {
  console.log(`\n📤 Migrando tabela: ${tableName}`);
  
  // 1. Contar registros na origem
  const countResult = await sourcePool.query(`SELECT COUNT(*) FROM ${tableName}`);
  const sourceCount = parseInt(countResult.rows[0].count);
  
  if (sourceCount === 0) {
    console.log(`   ⏭️  Tabela ${tableName} vazia, pulando...`);
    return { table: tableName, migrated: 0, status: 'empty' };
  }
  
  // 2. Limpar tabela de destino (cuidado com foreign keys)
  await targetPool.query(`TRUNCATE TABLE ${tableName} RESTART IDENTITY CASCADE`);
  
  // 3. Copiar dados
  const selectQuery = `SELECT * FROM ${tableName}`;
  const sourceData = await sourcePool.query(selectQuery);
  
  if (sourceData.rows.length > 0) {
    // Construir INSERT dinâmico
    const columns = Object.keys(sourceData.rows[0]);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const insertQuery = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
    
    // Inserir linha por linha (pode ser otimizado com batch)
    let migratedCount = 0;
    for (const row of sourceData.rows) {
      const values = columns.map(col => row[col]);
      await targetPool.query(insertQuery, values);
      migratedCount++;
    }
    
    console.log(`   ✅ ${migratedCount} registros migrados`);
    
    // 4. Validar contagem
    const targetCountResult = await targetPool.query(`SELECT COUNT(*) FROM ${tableName}`);
    const targetCount = parseInt(targetCountResult.rows[0].count);
    
    if (sourceCount === targetCount) {
      console.log(`   ✅ Validação OK: ${sourceCount} = ${targetCount}`);
      return { table: tableName, migrated: migratedCount, status: 'success' };
    } else {
      console.log(`   ❌ Erro de validação: origem=${sourceCount}, destino=${targetCount}`);
      return { table: tableName, migrated: migratedCount, status: 'validation_error' };
    }
  }
}

async function validateSampleData(sourcePool, targetPool, tableName, sampleSize = 3) {
  console.log(`\n🔍 Validando amostras da tabela: ${tableName}`);
  
  const sampleQuery = `SELECT * FROM ${tableName} LIMIT ${sampleSize}`;
  
  const sourceData = await sourcePool.query(sampleQuery);
  const targetData = await targetPool.query(sampleQuery);
  
  if (sourceData.rows.length === targetData.rows.length) {
    console.log(`   ✅ Amostras validadas: ${sourceData.rows.length} registros`);
    return true;
  } else {
    console.log(`   ❌ Erro nas amostras: origem=${sourceData.rows.length}, destino=${targetData.rows.length}`);
    return false;
  }
}

async function generateReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTables: results.length,
      successful: results.filter(r => r.status === 'success').length,
      empty: results.filter(r => r.status === 'empty').length,
      errors: results.filter(r => r.status === 'validation_error').length,
      totalRecords: results.reduce((sum, r) => sum + r.migrated, 0)
    },
    details: results
  };
  
  await fs.writeFile('backup_migration/migration_report.json', JSON.stringify(report, null, 2));
  console.log('\n📋 Relatório salvo em: backup_migration/migration_report.json');
  
  return report;
}

async function main() {
  console.log('🚀 Iniciando migração PostgreSQL para PostgreSQL');
  console.log('═════════════════════════════════════════════════');
  
  try {
    // 1. Conectar aos bancos
    const sourcePool = await validateConnection(SOURCE_DB, 'Banco Origem (atual)');
    const targetPool = await validateConnection(TARGET_DB, 'Banco Destino (novo)');
    
    // 2. Comparar schemas
    const schemaDiff = await compareSchemas(sourcePool, targetPool);
    if (schemaDiff.length > 0) {
      console.log('\n⚠️  Diferenças encontradas no schema:');
      schemaDiff.forEach(diff => console.log(`   - ${diff}`));
    }
    
    // 3. Migrar dados
    console.log('\n🔄 Iniciando migração de dados...');
    const results = [];
    
    for (const table of TABLES_ORDER) {
      try {
        const result = await migrateTable(sourcePool, targetPool, table);
        results.push(result);
        
        // Validar amostras
        if (result.status === 'success') {
          await validateSampleData(sourcePool, targetPool, table);
        }
        
      } catch (error) {
        console.error(`❌ Erro na tabela ${table}:`, error.message);
        results.push({ table, migrated: 0, status: 'error', error: error.message });
      }
    }
    
    // 4. Gerar relatório
    const report = await generateReport(results);
    
    // 5. Resumo final
    console.log('\n📊 RESUMO DA MIGRAÇÃO');
    console.log('═══════════════════════');
    console.log(`📦 Tabelas processadas: ${report.summary.totalTables}`);
    console.log(`✅ Migrações bem-sucedidas: ${report.summary.successful}`);
    console.log(`📭 Tabelas vazias: ${report.summary.empty}`);
    console.log(`❌ Erros: ${report.summary.errors}`);
    console.log(`📊 Total de registros migrados: ${report.summary.totalRecords}`);
    
    if (report.summary.errors === 0) {
      console.log('\n🎉 MIGRAÇÃO CONCLUÍDA COM SUCESSO!');
    } else {
      console.log('\n⚠️  MIGRAÇÃO CONCLUÍDA COM ERROS - Verificar relatório');
    }
    
    // 6. Fechar conexões
    await sourcePool.end();
    await targetPool.end();
    
  } catch (error) {
    console.error('\n💥 ERRO CRÍTICO:', error.message);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main as migrateDatabase };