#!/usr/bin/env node
import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs/promises';

// Configurações finais confirmadas
const SOURCE_DB = process.env.DATABASE_URL; 
const TARGET_DB = "postgres://roberto:Sf544344$wedf@95.111.233.250:5432/timesheet?sslmode=disable";

// Ordem de migração respeitando foreign keys
const MIGRATION_ORDER = [
  'sessions',
  'departments', 
  'cost_centers',
  'economic_groups',
  'cost_categories',
  'users',
  'clients', 
  'campaigns',
  'task_types',
  'campaign_tasks',
  'campaign_users',
  'time_entries',
  'time_entry_comments',
  'campaign_costs',
  'system_config',
  'time_entries_backup'
];

async function executeMigration() {
  console.log('🚀 MIGRAÇÃO FINAL - Tractionfy Timesheet');
  console.log('Origem → Destino: PostgreSQL → PostgreSQL');
  console.log('═══════════════════════════════════════════');
  
  const sourcePool = new Pool({ connectionString: SOURCE_DB });
  const targetPool = new Pool({ connectionString: TARGET_DB });
  
  const migrationResults = [];
  let totalMigrated = 0;
  
  try {
    // Validar conexões
    console.log('\n🔍 Validando conexões...');
    await sourcePool.query('SELECT 1');
    await targetPool.query('SELECT 1');
    console.log('✅ Ambas as conexões OK');
    
    // Executar migração tabela por tabela
    console.log('\n📊 Iniciando migração de dados...');
    
    for (const tableName of MIGRATION_ORDER) {
      console.log(`\n📤 Processando: ${tableName}`);
      
      try {
        // 1. Contar registros origem
        const sourceCount = await sourcePool.query(`SELECT COUNT(*) FROM ${tableName}`);
        const sourceTotal = parseInt(sourceCount.rows[0].count);
        
        if (sourceTotal === 0) {
          console.log(`   ⏭️  Tabela vazia, pulando...`);
          migrationResults.push({ table: tableName, status: 'empty', records: 0 });
          continue;
        }
        
        // 2. Limpar tabela destino
        await targetPool.query(`DELETE FROM ${tableName}`);
        console.log(`   🧹 Tabela destino limpa`);
        
        // 3. Copiar dados em batch
        const sourceData = await sourcePool.query(`SELECT * FROM ${tableName}`);
        
        if (sourceData.rows.length > 0) {
          const columns = Object.keys(sourceData.rows[0]);
          const values = sourceData.rows.map(row => 
            columns.map(col => row[col])
          );
          
          // Construir query de inserção em lote
          const placeholders = values.map((_, rowIndex) => 
            `(${columns.map((_, colIndex) => `$${rowIndex * columns.length + colIndex + 1}`).join(', ')})`
          ).join(', ');
          
          const insertQuery = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES ${placeholders}`;
          const flatValues = values.flat();
          
          await targetPool.query(insertQuery, flatValues);
          
          // 4. Validar migração
          const targetCount = await targetPool.query(`SELECT COUNT(*) FROM ${tableName}`);
          const targetTotal = parseInt(targetCount.rows[0].count);
          
          if (sourceTotal === targetTotal) {
            console.log(`   ✅ ${targetTotal} registros migrados com sucesso`);
            migrationResults.push({ table: tableName, status: 'success', records: targetTotal });
            totalMigrated += targetTotal;
          } else {
            console.log(`   ❌ Inconsistência: origem=${sourceTotal}, destino=${targetTotal}`);
            migrationResults.push({ table: tableName, status: 'error', records: targetTotal, error: 'Contagem divergente' });
          }
        }
        
      } catch (error) {
        console.log(`   ❌ Erro: ${error.message}`);
        migrationResults.push({ table: tableName, status: 'error', records: 0, error: error.message });
      }
    }
    
    // 5. Relatório final
    console.log('\n📊 RELATÓRIO FINAL DA MIGRAÇÃO');
    console.log('═══════════════════════════════════════');
    
    const successful = migrationResults.filter(r => r.status === 'success');
    const errors = migrationResults.filter(r => r.status === 'error');
    const empty = migrationResults.filter(r => r.status === 'empty');
    
    console.log(`✅ Tabelas migradas: ${successful.length}`);
    console.log(`📭 Tabelas vazias: ${empty.length}`);
    console.log(`❌ Erros: ${errors.length}`);
    console.log(`📊 Total de registros: ${totalMigrated}`);
    
    if (errors.length > 0) {
      console.log('\n❌ TABELAS COM ERRO:');
      errors.forEach(e => console.log(`   - ${e.table}: ${e.error}`));
    }
    
    // Salvar relatório
    const finalReport = {
      timestamp: new Date().toISOString(),
      migration_results: migrationResults,
      summary: {
        total_tables: migrationResults.length,
        successful: successful.length,
        empty: empty.length,
        errors: errors.length,
        total_migrated: totalMigrated
      }
    };
    
    await fs.writeFile('backup_migration/final_migration_report.json', JSON.stringify(finalReport, null, 2));
    
    if (errors.length === 0) {
      console.log('\n🎉 MIGRAÇÃO CONCLUÍDA COM SUCESSO!');
      return true;
    } else {
      console.log('\n⚠️  MIGRAÇÃO CONCLUÍDA COM ERROS');
      return false;
    }
    
  } catch (error) {
    console.error('\n💥 ERRO CRÍTICO:', error.message);
    return false;
  } finally {
    await sourcePool.end();
    await targetPool.end();
  }
}

executeMigration();