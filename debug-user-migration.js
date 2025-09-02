// Script para debugar a migração de usuários
import { db } from './server/db.ts';
import { users } from './shared/schema.ts';
import { createConnection } from 'mysql2/promise';
import { eq } from 'drizzle-orm';

const mariadbConfig = {
  host: 'tractionfy.com',
  port: 3306,
  database: 'traction_timesheet',
  user: 'traction_user_timesheet',
  password: '!Qaz@Wsx#Edc741',
  charset: 'latin1',
  connectTimeout: 10000
};

async function debugUserMigration() {
  let mariadbConnection;
  
  try {
    console.log('🔄 Verificando diferenças na migração de usuários...');
    
    // Conectar ao MariaDB
    mariadbConnection = await createConnection(mariadbConfig);
    
    // 1. Listar todos os usuários do PostgreSQL
    console.log('\n📋 Todos os usuários no PostgreSQL:');
    const pgUsers = await db.select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      isActive: users.isActive
    }).from(users).orderBy(users.id);
    
    console.log(`Total PostgreSQL: ${pgUsers.length}`);
    
    // 2. Listar todos os usuários do MariaDB
    console.log('\n📋 Todos os usuários no MariaDB:');
    const [mariaUsers] = await mariadbConnection.execute(
      'SELECT id, email, first_name, last_name, role, is_active FROM users ORDER BY id'
    );
    
    console.log(`Total MariaDB: ${mariaUsers.length}`);
    
    // 3. Encontrar usuários que estão no PostgreSQL mas não no MariaDB
    const pgUserIds = new Set(pgUsers.map(u => u.id));
    const mariaUserIds = new Set(mariaUsers.map(u => u.id));
    
    const missingUsers = pgUsers.filter(u => !mariaUserIds.has(u.id));
    
    console.log(`\n❌ Usuários ausentes no MariaDB: ${missingUsers.length}`);
    
    if (missingUsers.length > 0) {
      console.table(missingUsers);
      
      // Tentar inserir os usuários ausentes
      console.log('\n🔄 Inserindo usuários ausentes...');
      
      for (const user of missingUsers) {
        try {
          // Buscar dados completos do usuário no PostgreSQL
          const fullUserData = await db.select().from(users).where(eq(users.id, user.id));
          const fullUser = fullUserData[0];
          
          await mariadbConnection.execute(
            'INSERT IGNORE INTO users (id, email, password, first_name, last_name, profile_image_url, role, position, is_manager, manager_id, contract_type, cost_center_id, department_id, contract_start_date, contract_end_date, contract_value, company_name, cnpj, monthly_cost, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
              fullUser.id, fullUser.email, fullUser.password, fullUser.firstName, fullUser.lastName,
              fullUser.profileImageUrl, fullUser.role, fullUser.position, fullUser.isManager,
              fullUser.managerId, fullUser.contractType, fullUser.costCenterId, fullUser.departmentId,
              fullUser.contractStartDate, fullUser.contractEndDate, fullUser.contractValue,
              fullUser.companyName, fullUser.cnpj, fullUser.monthlyCost, fullUser.isActive,
              fullUser.createdAt, fullUser.updatedAt
            ]
          );
          
          console.log(`✅ Usuário ${fullUser.email} inserido`);
          
        } catch (error) {
          console.error(`❌ Erro ao inserir usuário ${user.email}:`, error.message);
        }
      }
      
      // Verificar contagem final
      const [finalCount] = await mariadbConnection.execute('SELECT COUNT(*) as count FROM users');
      console.log(`\n📊 Total final de usuários no MariaDB: ${finalCount[0].count}`);
    }
    
  } catch (error) {
    console.error('❌ Erro durante debug:', error);
  } finally {
    if (mariadbConnection) {
      await mariadbConnection.end();
    }
  }
}

debugUserMigration();