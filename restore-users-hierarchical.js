// Script para restaurar usuários respeitando hierarquia
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
  const cleanDate = parsed.replace(/^""|""$/g, '').replace(/^"|"$/g, '');
  if (cleanDate === '' || cleanDate === 'NULL') return defaultValue;
  return cleanDate;
}

async function restoreUsersHierarchical() {
  let mariadbConnection;
  
  try {
    console.log('🔄 Restaurando usuários respeitando hierarquia...');
    
    mariadbConnection = await createConnection(mariadbConfig);
    
    // Verificar departments existentes
    const [departments] = await mariadbConnection.execute('SELECT id, name FROM departments ORDER BY id');
    console.log(`📊 Departments disponíveis: ${departments.length}`);
    const deptIds = new Set(departments.map(d => d.id));
    
    // Limpar tabela de usuários
    console.log('🗑️ Limpando tabela de usuários...');
    await mariadbConnection.execute('SET FOREIGN_KEY_CHECKS = 0');
    await mariadbConnection.execute('DELETE FROM users');
    await mariadbConnection.execute('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✅ Tabela limpa');
    
    // Ler dados do CSV
    const allUsers = [];
    
    return new Promise((resolve, reject) => {
      fs.createReadStream('./backups/users-2025-09.csv')
        .pipe(csv())
        .on('data', (row) => {
          allUsers.push(row);
        })
        .on('end', async () => {
          try {
            console.log(`📊 Usuários no backup: ${allUsers.length}`);
            
            // Parse todos os usuários
            const users = allUsers.map(user => ({
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
            }));
            
            // Separar usuários sem manager (gerentes) e com manager (subordinados)
            const managers = users.filter(u => !u.managerId);
            const subordinates = users.filter(u => u.managerId);
            
            console.log(`📊 Gerentes (sem manager): ${managers.length}`);
            console.log(`📊 Subordinados (com manager): ${subordinates.length}`);
            
            let inserted = 0;
            let errors = 0;
            
            // 1. Inserir primeiro os gerentes (sem manager_id)
            console.log('\n🔄 Inserindo gerentes...');
            for (const user of managers) {
              try {
                // Verificar se department existe
                const finalDeptId = user.departmentId && deptIds.has(user.departmentId) ? user.departmentId : null;
                
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
                    null, // manager_id sempre NULL para gerentes
                    user.contractType, user.costCenterId, finalDeptId,
                    user.contractStartDate, user.contractEndDate, user.contractValue,
                    user.companyName, user.cnpj, user.monthlyCost, user.isActive,
                    user.createdAt, user.updatedAt
                  ]
                );
                
                inserted++;
                console.log(`✅ ${inserted}. Gerente ${user.email} inserido (ID: ${user.id})`);
                
              } catch (error) {
                errors++;
                console.error(`❌ Erro ao inserir gerente ${user.email}:`, error.message);
              }
            }
            
            // 2. Inserir subordinados
            console.log('\n🔄 Inserindo subordinados...');
            let retries = 3;
            let remaining = [...subordinates];
            
            while (remaining.length > 0 && retries > 0) {
              const beforeCount = remaining.length;
              const stillPending = [];
              
              for (const user of remaining) {
                try {
                  // Verificar se manager existe
                  const [managerExists] = await mariadbConnection.execute(
                    'SELECT id FROM users WHERE id = ?',
                    [user.managerId]
                  );
                  
                  if (managerExists.length === 0) {
                    stillPending.push(user);
                    continue;
                  }
                  
                  // Verificar department
                  const finalDeptId = user.departmentId && deptIds.has(user.departmentId) ? user.departmentId : null;
                  
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
                      user.managerId, user.contractType, user.costCenterId, finalDeptId,
                      user.contractStartDate, user.contractEndDate, user.contractValue,
                      user.companyName, user.cnpj, user.monthlyCost, user.isActive,
                      user.createdAt, user.updatedAt
                    ]
                  );
                  
                  inserted++;
                  console.log(`✅ ${inserted}. Subordinado ${user.email} inserido (ID: ${user.id})`);
                  
                } catch (error) {
                  errors++;
                  console.error(`❌ Erro ao inserir subordinado ${user.email}:`, error.message);
                  stillPending.push(user);
                }
              }
              
              remaining = stillPending;
              
              if (remaining.length === beforeCount) {
                // Não conseguiu inserir nenhum, tentar sem manager_id
                console.log(`⚠️ ${remaining.length} usuários não conseguiram ser inseridos com manager_id, tentando sem...`);
                for (const user of remaining) {
                  try {
                    const finalDeptId = user.departmentId && deptIds.has(user.departmentId) ? user.departmentId : null;
                    
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
                        user.contractType, user.costCenterId, finalDeptId,
                        user.contractStartDate, user.contractEndDate, user.contractValue,
                        user.companyName, user.cnpj, user.monthlyCost, user.isActive,
                        user.createdAt, user.updatedAt
                      ]
                    );
                    
                    inserted++;
                    console.log(`✅ ${inserted}. Usuário ${user.email} inserido sem manager (ID: ${user.id})`);
                    
                  } catch (error) {
                    errors++;
                    console.error(`❌ Falha final para ${user.email}:`, error.message);
                  }
                }
                break;
              }
              
              retries--;
            }
            
            // Verificar resultado final
            const [finalCount] = await mariadbConnection.execute('SELECT COUNT(*) as count FROM users');
            
            console.log(`\n📊 RESULTADO FINAL:`);
            console.log(`📊 Usuários no backup: ${allUsers.length}`);
            console.log(`✅ Inseridos com sucesso: ${inserted}`);
            console.log(`❌ Erros: ${errors}`);
            console.log(`📊 Total no MariaDB: ${finalCount[0].count}`);
            
            if (finalCount[0].count >= 40) {
              console.log('🎉 SUCESSO! Maioria dos usuários restaurada!');
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
        .on('error', reject);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error);
    if (mariadbConnection) {
      await mariadbConnection.end();
    }
  }
}

restoreUsersHierarchical();