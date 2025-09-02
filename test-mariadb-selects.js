// Teste de SELECT no MariaDB após migração
import { createConnection } from 'mysql2/promise';

const mariadbConfig = {
  host: 'tractionfy.com',
  port: 3306,
  database: 'traction_timesheet',
  user: 'traction_user_timesheet',
  password: '!Qaz@Wsx#Edc741',
  charset: 'latin1',
  connectTimeout: 10000
};

async function testMariaDBSelects() {
  let connection;
  
  try {
    console.log('🔄 Conectando ao MariaDB para testes...');
    connection = await createConnection(mariadbConfig);
    console.log('✅ Conectado ao MariaDB');
    
    // Teste 1: Users
    console.log('\n📋 TESTE 1 - Usuários:');
    const [users] = await connection.execute('SELECT id, email, first_name, last_name, role FROM users LIMIT 5');
    console.table(users);
    
    // Teste 2: Clients
    console.log('\n📋 TESTE 2 - Clientes:');
    const [clients] = await connection.execute('SELECT id, company_name, trade_name, cnpj FROM clients LIMIT 5');
    console.table(clients);
    
    // Teste 3: Departments
    console.log('\n📋 TESTE 3 - Departamentos:');
    const [departments] = await connection.execute('SELECT id, name, description, is_active FROM departments');
    console.table(departments);
    
    // Teste 4: Campaigns
    console.log('\n📋 TESTE 4 - Campanhas:');
    const [campaigns] = await connection.execute('SELECT id, name, description, client_id FROM campaigns');
    console.table(campaigns);
    
    // Teste 5: Cost Categories
    console.log('\n📋 TESTE 5 - Categorias de Custo:');
    const [costCategories] = await connection.execute('SELECT id, name, is_active FROM cost_categories LIMIT 10');
    console.table(costCategories);
    
    // Teste 6: Join para verificar relações
    console.log('\n📋 TESTE 6 - JOIN Campaigns com Clients:');
    const [joinTest] = await connection.execute(`
      SELECT 
        c.id as campaign_id, 
        c.name as campaign_name, 
        cl.company_name as client_name
      FROM campaigns c 
      JOIN clients cl ON c.client_id = cl.id
    `);
    console.table(joinTest);
    
    console.log('\n✅ Todos os testes de SELECT executados com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro durante os testes:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testMariaDBSelects();