import { db } from './db';
import { promises as fs, existsSync, mkdirSync } from 'fs';
import { format } from 'date-fns';
import { Parser } from 'json2csv';
import mysql from 'mysql2/promise';
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
  systemConfig, 
  sessions 
} from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Mapeia todas as tabelas do schema para backup automático
 * Ordem: tabelas independentes primeiro, depois as com dependências
 */
const TABLES_TO_BACKUP = {
  // Tabelas de configuração e base
  sessions,
  systemConfig,
  departments,
  costCenters,
  costCategories,
  
  // Usuários e grupos
  economicGroups,
  users,
  
  // Clientes e campanhas
  clients,
  campaigns,
  campaignUsers,
  
  // Tipos e tarefas
  taskTypes,
  campaignTasks,
  
  // Apontamentos e custos
  timeEntries,
  timeEntryComments,
  campaignCosts
} as const;

// Configuração MariaDB para backup espelho
const mariadbConnectionString = "mysql://traction_user_timesheet:!Qaz%40Wsx%23Edc741@tractionfy.com:3306/traction_timesheet";

interface MariaDBBackupResult {
  success: boolean;
  tablesBackedUp: string[];
  recordsBackedUp: number;
  error?: string;
}

/**
 * Função utilitária para sanitizar dados sensíveis para o CSV
 * Remove/mascara campos que podem conter informações sensíveis
 */
function sanitizeDataForBackup(tableName: string, rows: any[]): any[] {
  if (!rows || rows.length === 0) return rows;
  
  return rows.map(row => {
    const sanitized = { ...row };
    
    // Remover senhas de usuários
    if (tableName === 'users' && sanitized.password) {
      sanitized.password = '[MASKED]';
    }
    
    // Remover dados de sessão se necessário (opcional)
    if (tableName === 'sessions' && sanitized.sess) {
      sanitized.sess = '[SESSION_DATA]';
    }
    
    return sanitized;
  });
}

/**
 * Converte valores especiais para formato CSV adequado
 */
function prepareForCsv(data: any[]): any[] {
  return data.map(row => {
    const prepared = { ...row };
    
    // Converter objetos JSON para string
    Object.keys(prepared).forEach(key => {
      const value = prepared[key];
      
      if (value === null || value === undefined) {
        prepared[key] = '';
      } else if (typeof value === 'object') {
        prepared[key] = JSON.stringify(value);
      } else if (typeof value === 'boolean') {
        prepared[key] = value ? 'true' : 'false';
      } else if (value instanceof Date) {
        prepared[key] = value.toISOString();
      }
    });
    
    return prepared;
  });
}

/**
 * Gera backup CSV de todas as tabelas do sistema
 * @returns Promise com resultado da operação
 */
export async function backupAllTables(): Promise<{ ok: true; files: string[] } | { ok: false; error: string }> {
  try {
    const currentMonth = format(new Date(), 'yyyy-MM');
    const currentTime = format(new Date(), 'HH:mm:ss');
    const backupDir = 'backups';
    
    // Criar diretório de backup se não existir
    if (!existsSync(backupDir)) {
      mkdirSync(backupDir, { recursive: true });
    }
    
    const createdFiles: string[] = [];
    const errors: string[] = [];
    const tableCount = Object.keys(TABLES_TO_BACKUP).length;

    console.log(`[BACKUP] 🚀 Iniciando backup de ${tableCount} tabelas - ${currentMonth} ${currentTime}`);

    // Iterar sobre cada tabela e fazer backup
    for (const [tableName, table] of Object.entries(TABLES_TO_BACKUP)) {
      try {
        console.log(`[BACKUP] 📊 Processando tabela: ${tableName}...`);
        
        // Buscar todos os dados da tabela
        const rows = await db.select().from(table);
        
        if (rows.length === 0) {
          console.log(`[BACKUP] ⚠️  Tabela ${tableName}: 0 registros - arquivo não criado`);
          continue;
        }

        // Sanitizar dados sensíveis
        const sanitizedRows = sanitizeDataForBackup(tableName, rows);
        
        // Preparar dados para CSV
        const csvReadyData = prepareForCsv(sanitizedRows);
        
        // Converter para CSV
        const parser = new Parser({
          header: true,
          delimiter: ',',
          quote: '"',
          eol: '\n'
        });
        const csv = parser.parse(csvReadyData);
        
        // Nome do arquivo: tabela-YYYY-MM.csv (formato mensal)
        const fileName = `${tableName}-${currentMonth}.csv`;
        const filePath = `${backupDir}/${fileName}`;
        
        // Salvar arquivo
        await fs.writeFile(filePath, csv, 'utf8');
        createdFiles.push(fileName);
        
        console.log(`[BACKUP] ✅ ${tableName}: ${rows.length} registros → ${fileName}`);
        
      } catch (tableError) {
        const errorMsg = `Erro na tabela ${tableName}: ${tableError instanceof Error ? tableError.message : String(tableError)}`;
        console.error(`[BACKUP] ❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    // Verificar resultado geral
    if (errors.length > 0 && createdFiles.length === 0) {
      return { ok: false, error: `Falha completa no backup: ${errors.join('; ')}` };
    }

    const finalTime = format(new Date(), 'HH:mm:ss');
    console.log(`[BACKUP] 🎉 Backup concluído ${finalTime}: ${createdFiles.length} arquivos criados${errors.length > 0 ? ` (${errors.length} erros parciais)` : ''}`);
    
    return { ok: true, files: createdFiles };

  } catch (error) {
    const errorMsg = `Erro geral no sistema de backup: ${error instanceof Error ? error.message : String(error)}`;
    console.error(`[BACKUP] 💥 ${errorMsg}`);
    return { ok: false, error: errorMsg };
  }
}

/**
 * Espelha dados do PostgreSQL no MariaDB para backup em tempo real
 */
async function backupDataToMariaDB(): Promise<MariaDBBackupResult> {
  let totalRecords = 0;
  const backedUpTables: string[] = [];
  let mariadbConnection: mysql.Connection | null = null;

  try {
    mariadbConnection = await mysql.createConnection(mariadbConnectionString);
    console.log('🔗 Conectado ao MariaDB para backup espelho');

    // ⚠️ DESABILITAR checks de FK temporariamente para evitar problemas com auto-referências
    console.log('🔧 Desabilitando foreign key checks temporariamente...');
    await mariadbConnection.execute('SET FOREIGN_KEY_CHECKS = 0');
    
    console.log('🔄 Iniciando deleção em ordem segura...');
    
    // 1. Deletar dados dependentes primeiro (ordem inversa das dependências)
    await mariadbConnection.execute('DELETE FROM time_entries');
    await mariadbConnection.execute('DELETE FROM time_entry_comments'); 
    await mariadbConnection.execute('DELETE FROM campaign_costs');
    await mariadbConnection.execute('DELETE FROM campaign_tasks');
    await mariadbConnection.execute('DELETE FROM campaign_users');
    await mariadbConnection.execute('DELETE FROM campaigns');
    await mariadbConnection.execute('DELETE FROM clients');
    await mariadbConnection.execute('DELETE FROM users'); // Agora pode deletar devido auto-referência manager_id
    await mariadbConnection.execute('DELETE FROM task_types');
    await mariadbConnection.execute('DELETE FROM cost_categories');
    await mariadbConnection.execute('DELETE FROM economic_groups');
    await mariadbConnection.execute('DELETE FROM departments');
    await mariadbConnection.execute('DELETE FROM cost_centers');
    await mariadbConnection.execute('DELETE FROM sessions');
    
    console.log('✅ Deleção segura concluída, iniciando inserção...');

    // 2. INSERIR na ordem correta: tabelas pai PRIMEIRO
    
    // A. Backup Departments (tabela base)
    const departments = await db.select().from(TABLES_TO_BACKUP.departments);
    if (departments.length > 0) {
      for (const dept of departments) {
        await mariadbConnection.execute(
          'INSERT INTO departments (id, name, description, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
          [dept.id, dept.name, dept.description, dept.isActive, dept.createdAt, dept.updatedAt]
        );
      }
      backedUpTables.push('departments');
      totalRecords += departments.length;
      console.log(`✅ ${departments.length} departamentos inseridos`);
    }

    // B. Backup Cost Centers (tabela base)
    const costCenters = await db.select().from(TABLES_TO_BACKUP.costCenters);
    if (costCenters.length > 0) {
      for (const center of costCenters) {
        await mariadbConnection.execute(
          'INSERT INTO cost_centers (id, name, code, description, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [center.id, center.name, center.code, center.description, center.isActive, center.createdAt, center.updatedAt]
        );
      }
      backedUpTables.push('cost_centers');
      totalRecords += costCenters.length;
      console.log(`✅ ${costCenters.length} centros de custo inseridos`);
    }

    // C. Backup Economic Groups (tabela base)
    const economicGroups = await db.select().from(TABLES_TO_BACKUP.economicGroups);
    if (economicGroups.length > 0) {
      for (const group of economicGroups) {
        await mariadbConnection.execute(
          'INSERT INTO economic_groups (id, name, description, created_at) VALUES (?, ?, ?, ?)',
          [group.id, group.name, group.description, group.createdAt]
        );
      }
      backedUpTables.push('economic_groups');
      totalRecords += economicGroups.length;
      console.log(`✅ ${economicGroups.length} grupos econômicos inseridos`);
    }

    // D. Backup Task Types (tabela base)
    const taskTypes = await db.select().from(TABLES_TO_BACKUP.taskTypes);
    if (taskTypes.length > 0) {
      for (const taskType of taskTypes) {
        await mariadbConnection.execute(
          'INSERT INTO task_types (id, name, description, color, is_billable, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [taskType.id, taskType.name, taskType.description, taskType.color, taskType.isBillable, taskType.isActive, taskType.createdAt]
        );
      }
      backedUpTables.push('task_types');
      totalRecords += taskTypes.length;
      console.log(`✅ ${taskTypes.length} tipos de tarefa inseridos`);
    }

    // E. Backup Cost Categories (tabela base)
    const costCategories = await db.select().from(TABLES_TO_BACKUP.costCategories);
    if (costCategories.length > 0) {
      for (const category of costCategories) {
        await mariadbConnection.execute(
          'INSERT INTO cost_categories (id, name, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
          [category.id, category.name, category.isActive, category.createdAt, category.updatedAt]
        );
      }
      backedUpTables.push('cost_categories');
      totalRecords += costCategories.length;
      console.log(`✅ ${costCategories.length} categorias de custo inseridas`);
    }

    // F. Backup Users (referencia departments e cost_centers)
    const users = await db.select().from(TABLES_TO_BACKUP.users);
    if (users.length > 0) {
      for (const user of users) {
        await mariadbConnection.execute(
          `INSERT INTO users (id, email, password, first_name, last_name, profile_image_url, role, position, 
           is_manager, manager_id, contract_type, cost_center_id, department_id, contract_start_date, 
           contract_end_date, contract_value, company_name, cnpj, monthly_cost, is_active, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            user.id, user.email, '[BACKUP_MASKED]', user.firstName, user.lastName, user.profileImageUrl,
            user.role, user.position, user.isManager, user.managerId, user.contractType,
            user.costCenterId, user.departmentId, user.contractStartDate, user.contractEndDate,
            user.contractValue, user.companyName, user.cnpj, user.monthlyCost, user.isActive,
            user.createdAt, user.updatedAt
          ]
        );
      }
      backedUpTables.push('users');
      totalRecords += users.length;
      console.log(`✅ ${users.length} usuários inseridos`);
    }

    // G. Backup Clients (referencia economic_groups)
    const clients = await db.select().from(TABLES_TO_BACKUP.clients);
    if (clients.length > 0) {
      for (const client of clients) {
        await mariadbConnection.execute(
          'INSERT INTO clients (id, company_name, trade_name, cnpj, email, economic_group_id, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [client.id, client.companyName, client.tradeName, client.cnpj, client.email, client.economicGroupId, client.isActive, client.createdAt]
        );
      }
      backedUpTables.push('clients');
      totalRecords += clients.length;
      console.log(`✅ ${clients.length} clientes inseridos`);
    }

    // H. Backup Campaigns (referencia clients e cost_centers)
    const campaigns = await db.select().from(TABLES_TO_BACKUP.campaigns);
    if (campaigns.length > 0) {
      for (const campaign of campaigns) {
        await mariadbConnection.execute(
          'INSERT INTO campaigns (id, name, description, contract_start_date, contract_end_date, contract_value, client_id, cost_center_id, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [campaign.id, campaign.name, campaign.description, campaign.contractStartDate, campaign.contractEndDate, campaign.contractValue, campaign.clientId, campaign.costCenterId, campaign.isActive, campaign.createdAt]
        );
      }
      backedUpTables.push('campaigns');
      totalRecords += campaigns.length;
      console.log(`✅ ${campaigns.length} campanhas inseridas`);
    }

    // I. Backup Campaign Tasks (referencia campaigns e task_types)
    const campaignTasks = await db.select().from(TABLES_TO_BACKUP.campaignTasks);
    if (campaignTasks.length > 0) {
      for (const task of campaignTasks) {
        await mariadbConnection.execute(
          'INSERT INTO campaign_tasks (id, campaign_id, task_type_id, description, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          [task.id, task.campaignId, task.taskTypeId, task.description, task.isActive, task.createdAt]
        );
      }
      backedUpTables.push('campaign_tasks');
      totalRecords += campaignTasks.length;
      console.log(`✅ ${campaignTasks.length} tarefas de campanha inseridas`);
    }

    // J. Backup Campaign Users (referencia campaigns e users)
    const campaignUsers = await db.select().from(TABLES_TO_BACKUP.campaignUsers);
    if (campaignUsers.length > 0) {
      for (const access of campaignUsers) {
        await mariadbConnection.execute(
          'INSERT INTO campaign_users (id, campaign_id, user_id, created_at) VALUES (?, ?, ?, ?)',
          [access.id, access.campaignId, access.userId, access.createdAt]
        );
      }
      backedUpTables.push('campaign_users');
      totalRecords += campaignUsers.length;
      console.log(`✅ ${campaignUsers.length} acessos de campanha inseridos`);
    }

    // K. Backup Time Entries (referencia users, campaigns, campaign_tasks)
    const timeEntries = await db.select().from(TABLES_TO_BACKUP.timeEntries);
    if (timeEntries.length > 0) {
      for (const entry of timeEntries) {
        await mariadbConnection.execute(
          `INSERT INTO time_entries (id, user_id, date, campaign_id, campaign_task_id, hours, description, 
           result_center, status, submitted_at, reviewed_by, reviewed_at, review_comment, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            entry.id, entry.userId, entry.date, entry.campaignId, entry.campaignTaskId, entry.hours,
            entry.description, entry.resultCenter, entry.status, entry.submittedAt, entry.reviewedBy,
            entry.reviewedAt, entry.reviewComment, entry.createdAt, entry.updatedAt
          ]
        );
      }
      backedUpTables.push('time_entries');
      totalRecords += timeEntries.length;
      console.log(`✅ ${timeEntries.length} lançamentos de tempo inseridos`);
    }

    // L. Backup Time Entry Comments (referencia time_entries)
    const timeEntryComments = await db.select().from(TABLES_TO_BACKUP.timeEntryComments);
    if (timeEntryComments.length > 0) {
      for (const comment of timeEntryComments) {
        await mariadbConnection.execute(
          'INSERT INTO time_entry_comments (id, time_entry_id, user_id, comment, created_at) VALUES (?, ?, ?, ?, ?)',
          [comment.id, comment.timeEntryId, comment.userId, comment.comment, comment.createdAt]
        );
      }
      backedUpTables.push('time_entry_comments');
      totalRecords += timeEntryComments.length;
      console.log(`✅ ${timeEntryComments.length} comentários inseridos`);
    }

    // M. Backup Campaign Costs (referencia campaigns e cost_categories)
    const campaignCosts = await db.select().from(TABLES_TO_BACKUP.campaignCosts);
    if (campaignCosts.length > 0) {
      for (const cost of campaignCosts) {
        await mariadbConnection.execute(
          `INSERT INTO campaign_costs (id, campaign_id, user_id, subject, description, reference_month, amount, notes, 
           cnpj_fornecedor, razao_social, category_id, status, created_at, updated_at, inactivated_at, inactivated_by) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            cost.id, cost.campaignId, cost.userId, cost.subject, cost.description, cost.referenceMonth, 
            cost.amount, cost.notes, cost.cnpjFornecedor, cost.razaoSocial, cost.categoryId, cost.status,
            cost.createdAt, cost.updatedAt, cost.inactivatedAt, cost.inactivatedBy
          ]
        );
      }
      backedUpTables.push('campaign_costs');
      totalRecords += campaignCosts.length;
      console.log(`✅ ${campaignCosts.length} custos de campanha inseridos`);
    }

    // Atualizar registro de último backup no MariaDB
    const now = new Date();
    await mariadbConnection.execute(
      'INSERT INTO system_config (config_key, config_value, updated_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), updated_at = VALUES(updated_at)',
      ['last_backup_date', now.toISOString(), now]
    );

    // ✅ REABILITAR foreign key checks após operação bem-sucedida
    console.log('🔧 Reabilitando foreign key checks...');
    await mariadbConnection.execute('SET FOREIGN_KEY_CHECKS = 1');
    
    console.log(`🎉 Backup MariaDB completo! ${totalRecords} registros espelhados em ${backedUpTables.length} tabelas.`);

    return {
      success: true,
      tablesBackedUp: backedUpTables,
      recordsBackedUp: totalRecords
    };

  } catch (error) {
    console.error('❌ Erro durante backup MariaDB:', error);
    return {
      success: false,
      tablesBackedUp: backedUpTables,
      recordsBackedUp: totalRecords,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  } finally {
    if (mariadbConnection) {
      try {
        // ⚠️ SEMPRE reabilitar FK checks mesmo em caso de erro
        await mariadbConnection.execute('SET FOREIGN_KEY_CHECKS = 1');
      } catch (fkError) {
        console.warn('⚠️ Não foi possível reabilitar FK checks:', fkError);
      }
      await mariadbConnection.end();
    }
  }
}

/**
 * Verifica se deve executar backup diário baseado na data
 */
async function shouldRunDailyMariaDBBackup(): Promise<boolean> {
  try {
    const mariadbConnection = await mysql.createConnection(mariadbConnectionString);
    const [rows] = await mariadbConnection.execute(
      'SELECT config_value FROM system_config WHERE config_key = ?',
      ['last_backup_date']
    ) as any;
    await mariadbConnection.end();

    if (rows.length === 0) return true; // Nunca fez backup

    const lastBackup = new Date(rows[0].config_value);
    const today = new Date();
    
    // Verifica se é um dia diferente
    return today.toDateString() !== lastBackup.toDateString();
  } catch (error) {
    console.error('Erro ao verificar último backup MariaDB:', error);
    return true; // Em caso de erro, executar backup
  }
}

/**
 * Executa backup diário se necessário com suporte a MariaDB
 * @returns Promise com resultado da verificação/execução
 */
async function runMariaDBBackupIfNeeded(): Promise<{ ran: boolean; date: string; type: string } | { ran: false; reason: string }> {
  try {
    const shouldBackup = await shouldRunDailyMariaDBBackup();
    
    if (!shouldBackup) {
      return {
        ran: false,
        reason: 'Backup MariaDB já executado hoje'
      };
    }

    console.log('🔄 Executando backup diário no MariaDB...');
    const backupResult = await backupDataToMariaDB();
    
    if (backupResult.success) {
      return {
        ran: true,
        date: new Date().toISOString(),
        type: 'MariaDB'
      };
    } else {
      return {
        ran: false,
        reason: `Falha no backup MariaDB: ${backupResult.error}`
      };
    }

  } catch (error) {
    console.error('Erro no backup MariaDB:', error);
    return {
      ran: false,
      reason: `Erro no processamento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    };
  }
}

/**
 * Executa backup mensal se necessário (baseado no último mês de backup)
 * @returns Promise com resultado da verificação/execução
 */
export async function runDailyBackupIfNeeded(): Promise<{ ran: boolean; date: string } | { ran: false; reason: string }> {
  try {
    console.log(`[BACKUP] 🔍 Verificando necessidade de backup diário...`);
    
    // Verificar se precisa fazer backup MariaDB (diário)
    const mariadbBackupResult = await runMariaDBBackupIfNeeded();
    
    // Verificar se precisa fazer backup CSV (mensal)
    const currentMonth = format(new Date(), 'yyyy-MM');
    const configRow = await db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.key, 'last_backup_month'))
      .limit(1);

    const lastBackupMonth = configRow[0]?.value as string || null;
    let csvBackupRan = false;
    
    // Executar backup CSV se for um novo mês
    if (lastBackupMonth !== currentMonth) {
      console.log(`[BACKUP] 📅 Último mês de backup CSV: ${lastBackupMonth || 'nunca'} - Executando backup CSV...`);
      
      const csvBackupResult = await backupAllTables();
      
      if (csvBackupResult.ok) {
        csvBackupRan = true;
        
        // Atualizar/criar registro do último mês de backup
        try {
          if (configRow.length > 0) {
            await db
              .update(systemConfig)
              .set({ 
                value: currentMonth, 
                updatedAt: new Date() 
              })
              .where(eq(systemConfig.key, 'last_backup_month'));
          } else {
            await db
              .insert(systemConfig)
              .values({ 
                key: 'last_backup_month', 
                value: currentMonth 
              });
          }
        } catch (configError) {
          console.error(`[BACKUP] ⚠️  Erro ao atualizar mês do backup: ${configError}`);
        }
      }
    }

    // Retornar resultado consolidado
    if (mariadbBackupResult.ran || csvBackupRan) {
      return { 
        ran: true, 
        date: new Date().toISOString()
      };
    } else {
      const reason = 'reason' in mariadbBackupResult ? mariadbBackupResult.reason : 'Backup não necessário hoje';
      return { 
        ran: false, 
        reason
      };
    }

  } catch (error) {
    const errorMsg = `Erro na verificação/execução do backup: ${error instanceof Error ? error.message : String(error)}`;
    console.error(`[BACKUP] ❌ ${errorMsg}`);
    return { ran: false, reason: errorMsg };
  }
}

/**
 * Executa backup manual MariaDB (para botão de admin)
 */
export async function runManualMariaDBBackup(): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    console.log('🔄 Iniciando backup manual MariaDB...');
    
    const backupResult = await backupDataToMariaDB();
    
    if (backupResult.success) {
      return {
        success: true,
        message: `Backup MariaDB executado com sucesso! ${backupResult.recordsBackedUp} registros em ${backupResult.tablesBackedUp.length} tabelas.`,
        details: {
          recordsBackedUp: backupResult.recordsBackedUp,
          tablesBackedUp: backupResult.tablesBackedUp,
          timestamp: new Date().toISOString()
        }
      };
    } else {
      return {
        success: false,
        message: `Falha no backup MariaDB: ${backupResult.error}`,
        details: backupResult
      };
    }

  } catch (error) {
    console.error('Erro no backup manual MariaDB:', error);
    return {
      success: false,
      message: `Erro no processamento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    };
  }
}

/**
 * Executa backup manual CSV (para botão de admin)
 */
export async function runManualCSVBackup(): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    console.log('📄 Iniciando backup manual CSV...');
    
    const backupResult = await backupAllTables();
    
    if (backupResult.ok) {
      return {
        success: true,
        message: `Backup CSV executado com sucesso! ${backupResult.files.length} arquivos criados.`,
        details: {
          files: backupResult.files,
          timestamp: new Date().toISOString()
        }
      };
    } else {
      return {
        success: false,
        message: `Falha no backup CSV: ${backupResult.error}`,
        details: backupResult
      };
    }

  } catch (error) {
    console.error('Erro no backup manual CSV:', error);
    return {
      success: false,
      message: `Erro no processamento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    };
  }
}

/**
 * Função utilitária para inicializar a configuração de backup se necessário
 * Útil para seed inicial do sistema
 */
export async function initializeBackupConfig(): Promise<void> {
  try {
    const configExists = await db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.key, 'last_backup_month'))
      .limit(1);
    
    if (configExists.length === 0) {
      // Criar com mês anterior para forçar primeiro backup
      const lastMonth = format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM');
      
      await db
        .insert(systemConfig)
        .values({
          key: 'last_backup_month',
          value: lastMonth
        });
      
      console.log(`[BACKUP] 🔧 Configuração inicial criada - último mês definido como ${lastMonth}`);
    }
  } catch (error) {
    console.error(`[BACKUP] ❌ Erro ao inicializar configuração: ${error}`);
  }
}