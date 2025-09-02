import { db } from "./db";
import { createConnection } from 'mysql2/promise';
import { 
  users, 
  departments, 
  costCenters, 
  economicGroups, 
  clients, 
  campaigns, 
  campaignUsers, 
  taskTypes, 
  campaignTasks, 
  timeEntries, 
  timeEntryComments, 
  costCategories, 
  campaignCosts,
  sessions
} from "@shared/schema";

// MariaDB connection configuration
const mariadbConfig = {
  host: 'tractionfy.com',
  port: 3306,
  database: 'traction_timesheet',
  user: 'traction_user_timesheet',
  password: '!Qaz@Wsx#Edc741',
  charset: 'latin1',
  connectTimeout: 10000
};

export async function migrateDataFromPostgresToMariaDB() {
  let mariadbConnection;
  
  try {
    console.log('🔄 Iniciando migração de dados PostgreSQL → MariaDB');
    
    // Conectar ao MariaDB
    mariadbConnection = await createConnection(mariadbConfig);
    console.log('✅ Conectado ao MariaDB');
    
    // Limpar todas as tabelas primeiro (ordem inversa para respeitar FK)
    console.log('🗑️ Limpando tabelas existentes...');
    const clearTablesOrder = [
      'campaign_costs', 'time_entry_comments', 'time_entries', 'campaign_tasks', 
      'campaign_users', 'campaigns', 'clients', 'users', 'cost_categories', 
      'task_types', 'economic_groups', 'cost_centers', 'departments', 'sessions'
    ];
    
    // Desabilitar verificação de foreign keys temporariamente
    await mariadbConnection.execute('SET FOREIGN_KEY_CHECKS = 0');
    
    for (const table of clearTablesOrder) {
      await mariadbConnection.execute(`TRUNCATE TABLE ${table}`);
      console.log(`🗑️ Tabela ${table} truncada`);
    }
    
    // Reabilitar verificação de foreign keys
    await mariadbConnection.execute('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✅ Todas as tabelas foram truncadas');
    
    // Ordem de inserção respeitando as chaves estrangeiras:
    // 1. Tabelas independentes primeiro
    // 2. Tabelas que dependem de outras depois
    
    // 1. Sessions (independente)
    console.log('🔄 Migrando sessions...');
    const sessionsData = await db.select().from(sessions);
    if (sessionsData.length > 0) {
      for (const session of sessionsData) {
        await mariadbConnection.execute(
          'INSERT IGNORE INTO sessions (sid, sess, expire) VALUES (?, ?, ?)',
          [session.sid, JSON.stringify(session.sess), session.expire]
        );
      }
    }
    console.log(`✅ Sessions migradas: ${sessionsData.length} registros`);

    // 2. Departments (independente)
    console.log('🔄 Migrando departments...');
    const departmentsData = await db.select().from(departments);
    if (departmentsData.length > 0) {
      for (const dept of departmentsData) {
        await mariadbConnection.execute(
          'INSERT IGNORE INTO departments (id, name, description, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
          [dept.id, dept.name, dept.description, dept.isActive, dept.createdAt, dept.updatedAt]
        );
      }
    }
    console.log(`✅ Departments migrados: ${departmentsData.length} registros`);

    // 3. Cost Centers (independente)
    console.log('🔄 Migrando cost_centers...');
    const costCentersData = await db.select().from(costCenters);
    if (costCentersData.length > 0) {
      for (const center of costCentersData) {
        await mariadbConnection.execute(
          'INSERT IGNORE INTO cost_centers (id, name, code, description, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [center.id, center.name, center.code, center.description, center.isActive, center.createdAt, center.updatedAt]
        );
      }
    }
    console.log(`✅ Cost Centers migrados: ${costCentersData.length} registros`);

    // 4. Economic Groups (independente)
    console.log('🔄 Migrando economic_groups...');
    const economicGroupsData = await db.select().from(economicGroups);
    if (economicGroupsData.length > 0) {
      for (const group of economicGroupsData) {
        await mariadbConnection.execute(
          'INSERT IGNORE INTO economic_groups (id, name, description, created_at) VALUES (?, ?, ?, ?)',
          [group.id, group.name, group.description, group.createdAt]
        );
      }
    }
    console.log(`✅ Economic Groups migrados: ${economicGroupsData.length} registros`);

    // 5. Clients (depende de economic_groups)
    console.log('🔄 Migrando clients...');
    const clientsData = await db.select().from(clients);
    if (clientsData.length > 0) {
      for (const client of clientsData) {
        await mariadbConnection.execute(
          'INSERT IGNORE INTO clients (id, company_name, trade_name, cnpj, email, economic_group_id, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [client.id, client.companyName, client.tradeName, client.cnpj, client.email, client.economicGroupId, client.isActive, client.createdAt]
        );
      }
    }
    console.log(`✅ Clients migrados: ${clientsData.length} registros`);

    // 6. Users (depende de departments, cost_centers e pode ter manager_id auto-referencia)
    console.log('🔄 Migrando users...');
    const usersData = await db.select().from(users);
    if (usersData.length > 0) {
      for (const user of usersData) {
        await mariadbConnection.execute(
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
      }
    }
    console.log(`✅ Users migrados: ${usersData.length} registros`);

    // 7. Campaigns (depende de clients e cost_centers)
    console.log('🔄 Migrando campaigns...');
    const campaignsData = await db.select().from(campaigns);
    if (campaignsData.length > 0) {
      for (const campaign of campaignsData) {
        await mariadbConnection.execute(
          'INSERT IGNORE INTO campaigns (id, name, description, contract_start_date, contract_end_date, contract_value, client_id, cost_center_id, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            campaign.id, campaign.name, campaign.description, 
            campaign.contractStartDate, campaign.contractEndDate, campaign.contractValue, 
            campaign.clientId, campaign.costCenterId, campaign.isActive, campaign.createdAt
          ]
        );
      }
    }
    console.log(`✅ Campaigns migradas: ${campaignsData.length} registros`);

    // 8. Campaign Users (depende de campaigns e users)
    console.log('🔄 Migrando campaign_users...');
    const campaignUsersData = await db.select().from(campaignUsers);
    if (campaignUsersData.length > 0) {
      for (const campUser of campaignUsersData) {
        await mariadbConnection.execute(
          'INSERT IGNORE INTO campaign_users (id, campaign_id, user_id, created_at) VALUES (?, ?, ?, ?)',
          [campUser.id, campUser.campaignId, campUser.userId, campUser.createdAt]
        );
      }
    }
    console.log(`✅ Campaign Users migrados: ${campaignUsersData.length} registros`);

    // 9. Task Types (independente)
    console.log('🔄 Migrando task_types...');
    const taskTypesData = await db.select().from(taskTypes);
    if (taskTypesData.length > 0) {
      for (const taskType of taskTypesData) {
        await mariadbConnection.execute(
          'INSERT IGNORE INTO task_types (id, name, description, color, is_billable, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [taskType.id, taskType.name, taskType.description, taskType.color, taskType.isBillable, taskType.isActive, taskType.createdAt]
        );
      }
    }
    console.log(`✅ Task Types migrados: ${taskTypesData.length} registros`);

    // 10. Campaign Tasks (depende de campaigns e task_types)
    console.log('🔄 Migrando campaign_tasks...');
    const campaignTasksData = await db.select().from(campaignTasks);
    if (campaignTasksData.length > 0) {
      for (const campTask of campaignTasksData) {
        await mariadbConnection.execute(
          'INSERT IGNORE INTO campaign_tasks (id, campaign_id, task_type_id, description, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          [campTask.id, campTask.campaignId, campTask.taskTypeId, campTask.description, campTask.isActive, campTask.createdAt]
        );
      }
    }
    console.log(`✅ Campaign Tasks migradas: ${campaignTasksData.length} registros`);

    // 11. Cost Categories (independente)
    console.log('🔄 Migrando cost_categories...');
    const costCategoriesData = await db.select().from(costCategories);
    if (costCategoriesData.length > 0) {
      for (const category of costCategoriesData) {
        await mariadbConnection.execute(
          'INSERT IGNORE INTO cost_categories (id, name, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
          [category.id, category.name, category.isActive, category.createdAt, category.updatedAt]
        );
      }
    }
    console.log(`✅ Cost Categories migradas: ${costCategoriesData.length} registros`);

    // 12. Time Entries (depende de users, campaigns, campaign_tasks)
    console.log('🔄 Migrando time_entries...');
    const timeEntriesData = await db.select().from(timeEntries);
    if (timeEntriesData.length > 0) {
      for (const entry of timeEntriesData) {
        await mariadbConnection.execute(
          'INSERT IGNORE INTO time_entries (id, user_id, date, campaign_id, campaign_task_id, hours, description, result_center, status, submitted_at, reviewed_by, reviewed_at, review_comment, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            entry.id, entry.userId, entry.date, entry.campaignId, 
            entry.campaignTaskId, entry.hours, entry.description, entry.resultCenter, 
            entry.status, entry.submittedAt, entry.reviewedBy, entry.reviewedAt, 
            entry.reviewComment, entry.createdAt, entry.updatedAt
          ]
        );
      }
    }
    console.log(`✅ Time Entries migradas: ${timeEntriesData.length} registros`);

    // 13. Time Entry Comments (depende de time_entries e users)
    console.log('🔄 Migrando time_entry_comments...');
    const timeEntryCommentsData = await db.select().from(timeEntryComments);
    if (timeEntryCommentsData.length > 0) {
      for (const comment of timeEntryCommentsData) {
        await mariadbConnection.execute(
          'INSERT IGNORE INTO time_entry_comments (id, time_entry_id, user_id, comment, comment_type, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          [comment.id, comment.timeEntryId, comment.userId, comment.comment, comment.commentType, comment.createdAt]
        );
      }
    }
    console.log(`✅ Time Entry Comments migrados: ${timeEntryCommentsData.length} registros`);

    // 14. Campaign Costs (depende de campaigns, users, cost_categories)
    console.log('🔄 Migrando campaign_costs...');
    const campaignCostsData = await db.select().from(campaignCosts);
    if (campaignCostsData.length > 0) {
      for (const cost of campaignCostsData) {
        await mariadbConnection.execute(
          'INSERT IGNORE INTO campaign_costs (id, campaign_id, user_id, subject, description, reference_month, amount, notes, cnpj_fornecedor, razao_social, category_id, status, created_at, updated_at, inactivated_at, inactivated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            cost.id, cost.campaignId, cost.userId, cost.subject, 
            cost.description, cost.referenceMonth, cost.amount, cost.notes, 
            cost.cnpjFornecedor, cost.razaoSocial, cost.categoryId, cost.status, 
            cost.createdAt, cost.updatedAt, cost.inactivatedAt, cost.inactivatedBy
          ]
        );
      }
    }
    console.log(`✅ Campaign Costs migrados: ${campaignCostsData.length} registros`);

    // Teste final: verificar contagem das tabelas no MariaDB
    console.log('🔄 Verificando migração com SELECT COUNT...');
    const tables = [
      'sessions', 'departments', 'cost_centers', 'economic_groups', 
      'clients', 'users', 'campaigns', 'campaign_users', 'task_types', 
      'campaign_tasks', 'time_entries', 'time_entry_comments', 
      'cost_categories', 'campaign_costs'
    ];
    
    const counts: Record<string, number> = {};
    for (const table of tables) {
      const [result] = await mariadbConnection.execute(`SELECT COUNT(*) as count FROM ${table}`);
      counts[table] = (result as any)[0].count;
    }

    console.log('📊 Contagem final das tabelas no MariaDB:', counts);

    return {
      success: true,
      message: 'Migração concluída com sucesso',
      tableCounts: counts
    };

  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    return {
      success: false,
      message: 'Erro durante a migração',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  } finally {
    if (mariadbConnection) {
      await mariadbConnection.end();
    }
  }
}