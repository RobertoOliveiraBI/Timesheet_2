// Script para corrigir gestores dos usuários
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

function parseInteger(value, defaultValue = null) {
  const parsed = parseValue(value);
  if (parsed === null || parsed === '') return defaultValue;
  const num = parseInt(parsed);
  return isNaN(num) ? defaultValue : num;
}

async function fixManagers() {
  let mariadbConnection;
  
  try {
    console.log('🔄 Verificando e corrigindo gestores...');
    
    mariadbConnection = await createConnection(mariadbConfig);
    
    // 1. Verificar usuários sem gestor no MariaDB
    const [usersWithoutManager] = await mariadbConnection.execute(`
      SELECT id, email, first_name, last_name, role 
      FROM users 
      WHERE manager_id IS NULL AND role = 'COLABORADOR'
      ORDER BY id
    `);
    
    console.log(`📊 Usuários sem gestor no MariaDB: ${usersWithoutManager.length}`);
    if (usersWithoutManager.length > 0) {
      console.table(usersWithoutManager);
    }
    
    // 2. Ler backup CSV para obter relacionamentos corretos
    const backupUsers = [];
    
    return new Promise((resolve, reject) => {
      fs.createReadStream('./backups/users-2025-09.csv')
        .pipe(csv())
        .on('data', (row) => {
          backupUsers.push({
            id: parseInteger(row.id),
            email: parseValue(row.email),
            managerId: parseInteger(row.managerId)
          });
        })
        .on('end', async () => {
          try {
            console.log(`📊 Usuários no backup: ${backupUsers.length}`);
            
            // 3. Criar mapa de relacionamentos do backup
            const managerMap = {};
            backupUsers.forEach(user => {
              if (user.managerId) {
                managerMap[user.id] = user.managerId;
              }
            });
            
            console.log(`📊 Relacionamentos manager-subordinado no backup: ${Object.keys(managerMap).length}`);
            
            // 4. Verificar quais managers existem no MariaDB
            const [allManagers] = await mariadbConnection.execute('SELECT id FROM users');
            const existingManagerIds = new Set(allManagers.map(m => m.id));
            
            // 5. Corrigir cada usuário sem gestor
            let fixed = 0;
            let notFound = 0;
            
            for (const user of usersWithoutManager) {
              const correctManagerId = managerMap[user.id];
              
              if (correctManagerId && existingManagerIds.has(correctManagerId)) {
                try {
                  // Verificar se o manager realmente existe
                  const [managerCheck] = await mariadbConnection.execute(
                    'SELECT id, email, first_name, last_name FROM users WHERE id = ?',
                    [correctManagerId]
                  );
                  
                  if (managerCheck.length > 0) {
                    await mariadbConnection.execute(
                      'UPDATE users SET manager_id = ? WHERE id = ?',
                      [correctManagerId, user.id]
                    );
                    
                    fixed++;
                    console.log(`✅ ${user.email} → Gestor ID ${correctManagerId} (${managerCheck[0].email})`);
                  }
                  
                } catch (error) {
                  console.error(`❌ Erro ao atualizar ${user.email}:`, error.message);
                }
              } else {
                notFound++;
                console.log(`⚠️ ${user.email} → Gestor ID ${correctManagerId || 'N/A'} não encontrado`);
              }
            }
            
            // 6. Verificar resultado final
            const [finalCheck] = await mariadbConnection.execute(`
              SELECT COUNT(*) as count 
              FROM users 
              WHERE manager_id IS NULL AND role = 'COLABORADOR'
            `);
            
            console.log(`\n📊 RESULTADO DA CORREÇÃO:`);
            console.log(`✅ Gestores corrigidos: ${fixed}`);
            console.log(`⚠️ Gestores não encontrados: ${notFound}`);
            console.log(`📊 Colaboradores ainda sem gestor: ${finalCheck[0].count}`);
            
            // 7. Listar relacionamentos manager-subordinado atuais
            console.log('\n📋 Relacionamentos atuais:');
            const [relationships] = await mariadbConnection.execute(`
              SELECT 
                u.id as subordinado_id,
                u.email as subordinado_email,
                u.first_name as subordinado_nome,
                m.id as gestor_id,
                m.email as gestor_email,
                m.first_name as gestor_nome
              FROM users u
              LEFT JOIN users m ON u.manager_id = m.id
              WHERE u.role = 'COLABORADOR'
              ORDER BY u.id
            `);
            
            const withManager = relationships.filter(r => r.gestor_id);
            const withoutManager = relationships.filter(r => !r.gestor_id);
            
            console.log(`📊 Colaboradores com gestor: ${withManager.length}`);
            console.log(`📊 Colaboradores sem gestor: ${withoutManager.length}`);
            
            if (withoutManager.length > 0) {
              console.log('\n❌ Colaboradores ainda sem gestor:');
              withoutManager.forEach(u => {
                console.log(`   - ID ${u.subordinado_id}: ${u.subordinado_email}`);
              });
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
    console.error('❌ Erro durante correção:', error);
    if (mariadbConnection) {
      await mariadbConnection.end();
    }
  }
}

fixManagers();