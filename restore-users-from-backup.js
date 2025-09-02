// Script para restaurar usuários do backup CSV
import { createConnection } from 'mysql2/promise';
import fs from 'fs';
import csv from 'csv-parser';

const mariadbConfig = {
  host: 'tractionfy.com',
  port: 3306,
  database: 'traction_timesheet',
  user: 'traction_user_timesheet',
  password: '!Qaz@Wsx#Edc741',
  charset: 'latin1',
  connectTimeout: 10000
};

async function restoreUsersFromBackup() {
  let mariadbConnection;
  
  try {
    console.log('🔄 Restaurando usuários do backup CSV...');
    
    // Conectar ao MariaDB
    mariadbConnection = await createConnection(mariadbConfig);
    
    // 1. Primeiro, fazer backup da contagem atual
    const [currentCount] = await mariadbConnection.execute('SELECT COUNT(*) as count FROM users');
    console.log(`📊 Usuários atuais no MariaDB: ${currentCount[0].count}`);
    
    // 2. Limpar tabela de usuários
    console.log('🗑️ Limpando tabela de usuários...');
    await mariadbConnection.execute('SET FOREIGN_KEY_CHECKS = 0');
    await mariadbConnection.execute('DELETE FROM users');
    await mariadbConnection.execute('SET FOREIGN_KEY_CHECKS = 1');
    
    console.log('✅ Tabela de usuários limpa');
    
    // 3. Ler dados do CSV
    const users = [];
    
    return new Promise((resolve, reject) => {
      fs.createReadStream('./backups/users-2025-09.csv')
        .pipe(csv())
        .on('data', (row) => {
          users.push(row);
        })
        .on('end', async () => {
          try {
            console.log(`📊 Usuários encontrados no backup: ${users.length}`);
            
            // 4. Inserir usuários do backup
            let inserted = 0;
            let errors = 0;
            
            for (const user of users) {
              try {
                // Converter valores string para os tipos corretos
                const isManager = user.is_manager === 'true' || user.is_manager === '1';
                const isActive = user.is_active === 'true' || user.is_active === '1';
                const managerId = user.manager_id && user.manager_id !== 'NULL' ? parseInt(user.manager_id) : null;
                const costCenterId = user.cost_center_id && user.cost_center_id !== 'NULL' ? parseInt(user.cost_center_id) : null;
                const departmentId = user.department_id && user.department_id !== 'NULL' ? parseInt(user.department_id) : null;
                const contractValue = user.contract_value && user.contract_value !== 'NULL' ? parseFloat(user.contract_value) : null;
                const monthlyCost = user.monthly_cost && user.monthly_cost !== 'NULL' ? parseFloat(user.monthly_cost) : null;
                
                // Datas
                const contractStartDate = user.contract_start_date && user.contract_start_date !== 'NULL' ? user.contract_start_date : null;
                const contractEndDate = user.contract_end_date && user.contract_end_date !== 'NULL' ? user.contract_end_date : null;
                const createdAt = user.created_at || new Date().toISOString();
                const updatedAt = user.updated_at || new Date().toISOString();
                
                await mariadbConnection.execute(
                  `INSERT INTO users (
                    id, email, password, first_name, last_name, profile_image_url,
                    role, position, is_manager, manager_id, contract_type,
                    cost_center_id, department_id, contract_start_date,
                    contract_end_date, contract_value, company_name, cnpj,
                    monthly_cost, is_active, created_at, updated_at
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    parseInt(user.id),
                    user.email,
                    user.password,
                    user.first_name,
                    user.last_name,
                    user.profile_image_url === 'NULL' ? null : user.profile_image_url,
                    user.role,
                    user.position === 'NULL' ? null : user.position,
                    isManager,
                    managerId,
                    user.contract_type === 'NULL' ? null : user.contract_type,
                    costCenterId,
                    departmentId,
                    contractStartDate,
                    contractEndDate,
                    contractValue,
                    user.company_name === 'NULL' ? null : user.company_name,
                    user.cnpj === 'NULL' ? null : user.cnpj,
                    monthlyCost,
                    isActive,
                    createdAt,
                    updatedAt
                  ]
                );
                
                inserted++;
                console.log(`✅ ${inserted}. Usuário ${user.email} inserido (ID: ${user.id})`);
                
              } catch (error) {
                errors++;
                console.error(`❌ Erro ao inserir usuário ${user.email}:`, error.message);
              }
            }
            
            // 5. Verificar resultado final
            const [finalCount] = await mariadbConnection.execute('SELECT COUNT(*) as count FROM users');
            
            console.log(`\n📊 RESULTADO DA RESTAURAÇÃO:`);
            console.log(`📊 Usuários no backup: ${users.length}`);
            console.log(`✅ Inseridos com sucesso: ${inserted}`);
            console.log(`❌ Erros: ${errors}`);
            console.log(`📊 Total final no MariaDB: ${finalCount[0].count}`);
            
            if (finalCount[0].count === users.length) {
              console.log('🎉 SUCESSO! Todos os usuários do backup foram restaurados!');
            } else {
              console.log(`⚠️ ATENÇÃO: Diferença entre backup (${users.length}) e final (${finalCount[0].count})`);
            }
            
            resolve();
            
          } catch (error) {
            reject(error);
          } finally {
            if (mariadbConnection) {
              await mariadbConnection.end();
            }
          }
        })
        .on('error', (error) => {
          reject(error);
        });
    });
    
  } catch (error) {
    console.error('❌ Erro durante restauração:', error);
    if (mariadbConnection) {
      await mariadbConnection.end();
    }
  }
}

restoreUsersFromBackup();