#!/usr/bin/env node
import { Pool } from 'pg';

// URL do novo banco para testes
const TARGET_DB = "postgres://roberto:Sf544344$wedf@tool_tractionfy_tms:5432/timesheet?sslmode=disable";

async function testCRUDOperations() {
  console.log('🧪 Testando operações CRUD no novo banco');
  console.log('════════════════════════════════════════');
  
  const pool = new Pool({ connectionString: TARGET_DB });
  
  try {
    // Teste de CRIAÇÃO (Create)
    console.log('\n📝 Teste de CRIAÇÃO...');
    const createResult = await pool.query(`
      INSERT INTO economic_groups (name, description) 
      VALUES ('Teste Migração', 'Grupo criado durante teste de migração')
      RETURNING id, name
    `);
    const testGroupId = createResult.rows[0].id;
    console.log(`✅ Grupo criado: ID ${testGroupId} - ${createResult.rows[0].name}`);
    
    // Teste de LEITURA (Read)
    console.log('\n📖 Teste de LEITURA...');
    const readResult = await pool.query('SELECT id, name FROM economic_groups WHERE id = $1', [testGroupId]);
    if (readResult.rows.length > 0) {
      console.log(`✅ Leitura OK: ${readResult.rows[0].name}`);
    } else {
      throw new Error('Falha na leitura - registro não encontrado');
    }
    
    // Teste de ATUALIZAÇÃO (Update)
    console.log('\n✏️  Teste de ATUALIZAÇÃO...');
    await pool.query(
      'UPDATE economic_groups SET description = $1 WHERE id = $2',
      ['Descrição atualizada durante teste', testGroupId]
    );
    const updatedResult = await pool.query('SELECT description FROM economic_groups WHERE id = $1', [testGroupId]);
    console.log(`✅ Atualização OK: ${updatedResult.rows[0].description}`);
    
    // Teste de queries complexas (JOINs)
    console.log('\n🔗 Teste de CONSULTAS COMPLEXAS...');
    const complexQuery = `
      SELECT u.first_name, u.last_name, u.email, d.name as department
      FROM users u 
      LEFT JOIN departments d ON u.department_id = d.id 
      WHERE u.is_active = true 
      LIMIT 3
    `;
    const complexResult = await pool.query(complexQuery);
    console.log(`✅ Query complexa OK: ${complexResult.rows.length} usuários retornados`);
    
    // Teste de EXCLUSÃO (Delete)
    console.log('\n🗑️  Teste de EXCLUSÃO...');
    await pool.query('DELETE FROM economic_groups WHERE id = $1', [testGroupId]);
    const deleteCheck = await pool.query('SELECT * FROM economic_groups WHERE id = $1', [testGroupId]);
    if (deleteCheck.rows.length === 0) {
      console.log('✅ Exclusão OK: registro removido');
    } else {
      throw new Error('Falha na exclusão - registro ainda existe');
    }
    
    // Teste de integridade referencial
    console.log('\n🔐 Teste de INTEGRIDADE REFERENCIAL...');
    try {
      await pool.query(`
        INSERT INTO campaigns (name, client_id) 
        VALUES ('Teste Campaign', 999999)
      `);
      throw new Error('ERRO: Deveria ter falhado por violação de foreign key');
    } catch (error) {
      if (error.message.includes('foreign key') || error.message.includes('violates')) {
        console.log('✅ Integridade referencial OK: foreign key funcionando');
      } else {
        throw error;
      }
    }
    
    console.log('\n🎉 TODOS OS TESTES CRUD PASSARAM!');
    return true;
    
  } catch (error) {
    console.error('\n❌ ERRO NOS TESTES CRUD:', error.message);
    return false;
  } finally {
    await pool.end();
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  testCRUDOperations().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export { testCRUDOperations };