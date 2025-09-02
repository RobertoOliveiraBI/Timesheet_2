// Script final para inserir os 12 usuários ausentes
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

const missingUserIds = [8, 15, 20, 21, 22, 23, 27, 34, 35, 39, 42, 43];

async function finalUserMigration() {
  let mariadbConnection;
  
  try {
    console.log('🔄 Inserção final dos 12 usuários ausentes...');
    
    // Conectar ao MariaDB
    mariadbConnection = await createConnection(mariadbConfig);
    
    for (const userId of missingUserIds) {
      try {
        // Buscar dados completos do usuário no PostgreSQL
        const userData = await db.select().from(users).where(eq(users.id, userId));
        
        if (userData.length === 0) {
          console.log(`❌ Usuário ID ${userId} não encontrado no PostgreSQL`);
          continue;
        }
        
        const user = userData[0];
        console.log(`🔄 Processando usuário ID ${userId}: ${user.email}`);
        
        // Verificar se já existe
        const [existingUser] = await mariadbConnection.execute(
          'SELECT id FROM users WHERE id = ?',
          [userId]
        );
        
        if (existingUser.length > 0) {
          console.log(`⏭️ Usuário ID ${userId} já existe no MariaDB`);
          continue;
        }
        
        // Inserir com valores NULL para foreign keys problemáticas se necessário
        const insertData = [
          user.id,
          user.email,
          user.password,
          user.firstName,
          user.lastName,
          user.profileImageUrl,
          user.role,
          user.position,
          user.isManager,
          user.managerId,
          user.contractType,
          user.costCenterId || null,  // Se não existe cost center, usar NULL
          user.departmentId || null,  // Se não existe department, usar NULL
          user.contractStartDate,
          user.contractEndDate,
          user.contractValue,
          user.companyName,
          user.cnpj,
          user.monthlyCost,
          user.isActive,
          user.createdAt,
          user.updatedAt
        ];
        
        await mariadbConnection.execute(
          `INSERT INTO users (
            id, email, password, first_name, last_name, profile_image_url, 
            role, position, is_manager, manager_id, contract_type, 
            cost_center_id, department_id, contract_start_date, 
            contract_end_date, contract_value, company_name, cnpj, 
            monthly_cost, is_active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          insertData
        );
        
        console.log(`✅ Usuário ID ${userId} (${user.email}) inserido com sucesso`);
        
      } catch (error) {
        console.error(`❌ Erro ao inserir usuário ID ${userId}:`, error.message);
        
        // Tentar inserir sem as foreign keys problemáticas
        try {
          const userData = await db.select().from(users).where(eq(users.id, userId));
          const user = userData[0];
          
          console.log(`🔄 Tentando inserir sem foreign keys: ${user.email}`);
          
          await mariadbConnection.execute(
            `INSERT INTO users (
              id, email, password, first_name, last_name, profile_image_url, 
              role, position, is_manager, manager_id, contract_type, 
              cost_center_id, department_id, contract_start_date, 
              contract_end_date, contract_value, company_name, cnpj, 
              monthly_cost, is_active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              user.id, user.email, user.password, user.firstName, user.lastName,
              user.profileImageUrl, user.role, user.position, user.isManager,
              null, // manager_id como NULL
              user.contractType,
              null, // cost_center_id como NULL
              null, // department_id como NULL
              user.contractStartDate, user.contractEndDate, user.contractValue,
              user.companyName, user.cnpj, user.monthlyCost, user.isActive,
              user.createdAt, user.updatedAt
            ]
          );
          
          console.log(`✅ Usuário ID ${userId} inserido sem foreign keys`);
          
        } catch (error2) {
          console.error(`❌ Falha total para usuário ID ${userId}:`, error2.message);
        }
      }
    }
    
    // Verificar contagem final
    const [finalCount] = await mariadbConnection.execute('SELECT COUNT(*) as count FROM users');
    console.log(`\n📊 CONTAGEM FINAL: ${finalCount[0].count} usuários no MariaDB`);
    
    if (finalCount[0].count >= 46) {
      console.log('🎉 SUCESSO! Todos os 46 usuários (ou mais) estão no MariaDB!');
    } else {
      console.log(`❌ Ainda faltam ${46 - finalCount[0].count} usuários`);
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  } finally {
    if (mariadbConnection) {
      await mariadbConnection.end();
    }
  }
}

finalUserMigration();