import { db } from './db';
import { promises as fs, existsSync, mkdirSync } from 'fs';
import { format } from 'date-fns';
import { Parser } from 'json2csv';
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
 * Executa backup mensal se necessário (baseado no último mês de backup)
 * @returns Promise com resultado da verificação/execução
 */
export async function runDailyBackupIfNeeded(): Promise<{ ran: boolean; date: string } | { ran: false; reason: string }> {
  try {
    const currentMonth = format(new Date(), 'yyyy-MM');
    const now = format(new Date(), 'HH:mm:ss');
    
    console.log(`[BACKUP] 🔍 Verificando necessidade de backup mensal - ${currentMonth} ${now}`);
    
    // Buscar configuração do último mês de backup
    const configRow = await db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.key, 'last_backup_month'))
      .limit(1);

    const lastBackupMonth = configRow[0]?.value as string || null;
    
    // Se já foi executado neste mês, pular
    if (lastBackupMonth === currentMonth) {
      return { ran: false, reason: `Backup mensal já executado neste mês (${currentMonth})` };
    }

    console.log(`[BACKUP] 📅 Último mês de backup: ${lastBackupMonth || 'nunca'} - Executando backup...`);
    
    // Executar backup completo
    const backupResult = await backupAllTables();
    
    if (!backupResult.ok) {
      return { ran: false, reason: `Falha na execução do backup: ${backupResult.error}` };
    }

    // Atualizar/criar registro do último mês de backup
    try {
      if (configRow.length > 0) {
        // Atualizar registro existente
        await db
          .update(systemConfig)
          .set({ 
            value: currentMonth, 
            updatedAt: new Date() 
          })
          .where(eq(systemConfig.key, 'last_backup_month'));
      } else {
        // Criar novo registro
        await db
          .insert(systemConfig)
          .values({ 
            key: 'last_backup_month', 
            value: currentMonth 
          });
      }
    } catch (configError) {
      console.error(`[BACKUP] ⚠️  Erro ao atualizar mês do backup: ${configError}`);
      // Não falhar todo o processo por conta disso
    }

    const finalTime = format(new Date(), 'HH:mm:ss');
    console.log(`[BACKUP] ✅ Backup mensal concluído com sucesso ${finalTime}: ${backupResult.files.length} arquivos`);
    
    return { ran: true, date: currentMonth };

  } catch (error) {
    const errorMsg = `Erro na verificação/execução do backup mensal: ${error instanceof Error ? error.message : String(error)}`;
    console.error(`[BACKUP] ❌ ${errorMsg}`);
    return { ran: false, reason: errorMsg };
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