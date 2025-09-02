// Script para forçar inserção dos 12 usuários ausentes
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

async function forceInsertMissingUsers() {
  let mariadbConnection;
  
  try {
    console.log('🔄 Forçando inserção dos 12 usuários ausentes...');
    
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
        console.log(`🔄 Inserindo usuário ID ${userId}: ${user.email}`);
        
        // Primeiro verificar se o usuário já existe
        const [existingUser] = await mariadbConnection.execute(
          'SELECT id FROM users WHERE id = ?',
          [userId]
        );
        
        if (existingUser.length > 0) {
          console.log(`⏭️ Usuário ID ${userId} já existe no MariaDB`);
          continue;
        }
        
        // Inserir com INSERT INTO sem IGNORE para ver erros
        await mariadbConnection.execute(
          `INSERT INTO users (
            id, email, password, first_name, last_name, profile_image_url, 
            role, position, is_manager, manager_id, contract_type, 
            cost_center_id, department_id, contract_start_date, 
            contract_end_date, contract_value, company_name, cnpj, 
            monthly_cost, is_active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
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
            user.costCenterId,
            user.departmentId,
            user.contractStartDate,
            user.contractEndDate,
            user.contractValue,
            user.companyName,
            user.cnpj,
            user.monthlyCost,
            user.isActive,
            user.createdAt,
            user.updatedAt
          ]
        );
        
        console.log(`✅ Usuário ID ${userId} (${user.email}) inserido com sucesso`);
        
      } catch (error) {
        console.error(`❌ Erro ao inserir usuário ID ${userId}:`, error.message);
        
        // Se for erro de constraint, verificar o que está causando
        if (error.message.includes('foreign key constraint') || error.message.includes('Cannot add or update')) {
          console.log(`   Detalhes do erro de constraint para ID ${userId}:`);
          console.log(`   manager_id: ${user?.managerId}`);
          console.log(`   cost_center_id: ${user?.costCenterId}`);
          console.log(`   department_id: ${user?.departmentId}`);
          
          // Verificar se o department_id existe
          if (user?.departmentId) {
            const [deptCheck] = await mariadbConnection.execute(
              'SELECT id FROM departments WHERE id = ?',
              [user.departmentId]
            );
            console.log(`   Department ID ${user.departmentId} existe: ${deptCheck.length > 0}`);
          }
          
          // Verificar se o cost_center_id existe
          if (user?.costCenterId) {
            const [costCheck] = await mariadbConnection.execute(
              'SELECT id FROM cost_centers WHERE id = ?',
              [user.costCenterId]
            );
            console.log(`   Cost Center ID ${user.costCenterId} existe: ${costCheck.length > 0}`);
          }
          
          // Verificar se o manager_id existe
          if (user?.managerId) {
            const [managerCheck] = await mariadbConnection.execute(
              'SELECT id FROM users WHERE id = ?',
              [user.managerId]
            );
            console.log(`   Manager ID ${user.managerId} existe: ${managerCheck.length > 0}`);
          }
        }
      }
    }
    
    // Verificar contagem final
    const [finalCount] = await mariadbConnection.execute('SELECT COUNT(*) as count FROM users');
    console.log(`\n📊 CONTAGEM FINAL: ${finalCount[0].count} usuários no MariaDB`);
    
    if (finalCount[0].count === 46) {
      console.log('🎉 SUCESSO! Todos os 46 usuários estão agora no MariaDB!');
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

forceInsertMissingUsers();