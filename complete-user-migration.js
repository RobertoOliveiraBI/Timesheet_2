// Script para completar a migração dos 46 usuários
import { db } from './server/db.ts';
import { users } from './shared/schema.ts';
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

async function completeUserMigration() {
  let mariadbConnection;
  
  try {
    console.log('🔄 Completando migração de todos os 46 usuários...');
    
    // Conectar ao MariaDB
    mariadbConnection = await createConnection(mariadbConfig);
    
    // Buscar TODOS os usuários do PostgreSQL
    const allPgUsers = await db.select().from(users).orderBy(users.id);
    console.log(`📊 Total de usuários no PostgreSQL: ${allPgUsers.length}`);
    
    // Verificar quantos já existem no MariaDB
    const [mariaCount] = await mariadbConnection.execute('SELECT COUNT(*) as count FROM users');
    console.log(`📊 Usuários já no MariaDB: ${mariaCount[0].count}`);
    
    // Inserir todos os usuários usando INSERT IGNORE
    let inserted = 0;
    let skipped = 0;
    
    for (const user of allPgUsers) {
      try {
        const result = await mariadbConnection.execute(
          'INSERT IGNORE INTO users (id, email, password, first_name, last_name, profile_image_url, role, position, is_manager, manager_id, contract_type, cost_center_id, department_id, contract_start_date, contract_end_date, contract_value, company_name, cnpj, monthly_cost, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            user.id, user.email, user.password, user.firstName, user.lastName,
            user.profileImageUrl, user.role, user.position, user.isManager,
            user.managerId, user.contractType, user.costCenterId, user.departmentId,
            user.contractStartDate, user.contractEndDate, user.contractValue,
            user.companyName, user.cnpj, user.monthlyCost, user.isActive,
            user.createdAt, user.updatedAt
          ]
        );
        
        if (result[0].affectedRows > 0) {
          inserted++;
          console.log(`✅ ${inserted}. Usuário ${user.email} inserido (ID: ${user.id})`);
        } else {
          skipped++;
          // console.log(`⏭️ ${skipped}. Usuário ${user.email} já existia (ID: ${user.id})`);
        }
        
      } catch (error) {
        console.error(`❌ Erro ao inserir usuário ${user.email} (ID: ${user.id}):`, error.message);
      }
    }
    
    // Verificar contagem final
    const [finalCount] = await mariadbConnection.execute('SELECT COUNT(*) as count FROM users');
    console.log(`\n📊 RESULTADO FINAL:`);
    console.log(`📊 Total PostgreSQL: ${allPgUsers.length}`);
    console.log(`📊 Total MariaDB: ${finalCount[0].count}`);
    console.log(`✅ Inseridos agora: ${inserted}`);
    console.log(`⏭️ Já existiam: ${skipped}`);
    
    if (finalCount[0].count === allPgUsers.length) {
      console.log('🎉 SUCESSO! Todos os 46 usuários estão no MariaDB');
    } else {
      console.log(`❌ DIFERENÇA: Faltam ${allPgUsers.length - finalCount[0].count} usuários`);
      
      // Verificar quais ainda estão faltando
      const [mariaUsers] = await mariadbConnection.execute('SELECT id FROM users ORDER BY id');
      const mariaIds = new Set(mariaUsers.map(u => u.id));
      const missingUsers = allPgUsers.filter(u => !mariaIds.has(u.id));
      
      if (missingUsers.length > 0) {
        console.log('\n❌ Usuários ainda ausentes:');
        missingUsers.forEach(u => console.log(`   - ID ${u.id}: ${u.email}`));
      }
    }
    
  } catch (error) {
    console.error('❌ Erro durante migração completa:', error);
  } finally {
    if (mariadbConnection) {
      await mariadbConnection.end();
    }
  }
}

completeUserMigration();