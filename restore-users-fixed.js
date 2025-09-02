// Script corrigido para restaurar usuários do backup CSV
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

function parseValue(value, defaultValue = null) {
  if (value === undefined || value === null || value === '' || value === 'NULL' || value === '""') {
    return defaultValue;
  }
  
  // Remove aspas duplas extras
  if (typeof value === 'string') {
    return value.replace(/^""|""$/g, '').replace(/^"|"$/g, '');
  }
  
  return value;
}

function parseNumber(value, defaultValue = null) {
  const parsed = parseValue(value);
  if (parsed === null || parsed === '') return defaultValue;
  const num = parseFloat(parsed);
  return isNaN(num) ? defaultValue : num;
}

function parseInteger(value, defaultValue = null) {
  const parsed = parseValue(value);
  if (parsed === null || parsed === '') return defaultValue;
  const num = parseInt(parsed);
  return isNaN(num) ? defaultValue : num;
}

function parseBoolean(value, defaultValue = false) {
  const parsed = parseValue(value);
  if (parsed === null) return defaultValue;
  return parsed === 'true' || parsed === '1' || parsed === 1;
}

function parseDate(value, defaultValue = null) {
  const parsed = parseValue(value);
  if (parsed === null || parsed === '') return defaultValue;
  
  // Remove aspas duplas extras das datas
  const cleanDate = parsed.replace(/^""|""$/g, '').replace(/^"|"$/g, '');
  
  if (cleanDate === '' || cleanDate === 'NULL') return defaultValue;
  
  return cleanDate;
}

async function restoreUsersFixed() {
  let mariadbConnection;
  
  try {
    console.log('🔄 Restaurando usuários do backup CSV (versão corrigida)...');
    
    // Conectar ao MariaDB
    mariadbConnection = await createConnection(mariadbConfig);
    
    // Limpar tabela de usuários
    console.log('🗑️ Limpando tabela de usuários...');
    await mariadbConnection.execute('SET FOREIGN_KEY_CHECKS = 0');
    await mariadbConnection.execute('DELETE FROM users');
    await mariadbConnection.execute('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✅ Tabela de usuários limpa');
    
    // Ler dados do CSV
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
            
            let inserted = 0;
            let errors = 0;
            
            for (const user of users) {
              try {
                // Parse todos os campos com tratamento de valores vazios/NULL
                const userData = {
                  id: parseInteger(user.id),
                  email: parseValue(user.email),
                  password: parseValue(user.password),
                  firstName: parseValue(user.firstName),
                  lastName: parseValue(user.lastName),
                  profileImageUrl: parseValue(user.profileImageUrl),
                  role: parseValue(user.role),
                  position: parseValue(user.position),
                  isManager: parseBoolean(user.isManager),
                  managerId: parseInteger(user.managerId),
                  contractType: parseValue(user.contractType),
                  costCenterId: parseInteger(user.costCenterId),
                  departmentId: parseInteger(user.departmentId),
                  contractStartDate: parseDate(user.contractStartDate),
                  contractEndDate: parseDate(user.contractEndDate),
                  contractValue: parseNumber(user.contractValue),
                  companyName: parseValue(user.companyName),
                  cnpj: parseValue(user.cnpj),
                  monthlyCost: parseNumber(user.monthlyCost),
                  isActive: parseBoolean(user.isActive, true),
                  createdAt: parseDate(user.createdAt, new Date().toISOString()),
                  updatedAt: parseDate(user.updatedAt, new Date().toISOString())
                };
                
                await mariadbConnection.execute(
                  `INSERT INTO users (
                    id, email, password, first_name, last_name, profile_image_url,
                    role, position, is_manager, manager_id, contract_type,
                    cost_center_id, department_id, contract_start_date,
                    contract_end_date, contract_value, company_name, cnpj,
                    monthly_cost, is_active, created_at, updated_at
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    userData.id,
                    userData.email,
                    userData.password,
                    userData.firstName,
                    userData.lastName,
                    userData.profileImageUrl,
                    userData.role,
                    userData.position,
                    userData.isManager,
                    userData.managerId,
                    userData.contractType,
                    userData.costCenterId,
                    userData.departmentId,
                    userData.contractStartDate,
                    userData.contractEndDate,
                    userData.contractValue,
                    userData.companyName,
                    userData.cnpj,
                    userData.monthlyCost,
                    userData.isActive,
                    userData.createdAt,
                    userData.updatedAt
                  ]
                );
                
                inserted++;
                console.log(`✅ ${inserted}. Usuário ${userData.email} inserido (ID: ${userData.id})`);
                
              } catch (error) {
                errors++;
                console.error(`❌ Erro ao inserir usuário ${user.email}:`, error.message);
              }
            }
            
            // Verificar resultado final
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

restoreUsersFixed();