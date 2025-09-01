import createDebug from 'debug';
import { getMssql, closeMssql, convertBoolean, normalizeString } from '../mssql-db';
import sql from 'mssql';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';

const debugMigrate = createDebug('app:migrate');

interface CsvToTableMapping {
  csvFile: string;
  tableName: string;
  columnTransforms: Record<string, (value: any) => any>;
  skipColumns?: string[];
}

// Mapeamento de nomes CSV (camelCase) → SQL Server (snake_case)
const COLUMN_NAME_MAPPING: Record<string, string> = {
  'firstName': 'first_name',
  'lastName': 'last_name', 
  'profileImageUrl': 'profile_image_url',
  'isManager': 'is_manager',
  'managerId': 'manager_id',
  'contractType': 'contract_type',
  'costCenterId': 'cost_center_id',
  'departmentId': 'department_id',
  'contractStartDate': 'contract_start_date',
  'contractEndDate': 'contract_end_date',
  'contractValue': 'contract_value',
  'companyName': 'company_name',
  'tradeName': 'trade_name',
  'monthlyCost': 'monthly_cost',
  'isActive': 'is_active',
  'createdAt': 'created_at',
  'updatedAt': 'updated_at',
  'inactivatedAt': 'inactivated_at',
  'inactivatedBy': 'inactivated_by',
  'economicGroupId': 'economic_group_id',
  'clientId': 'client_id',
  'campaignId': 'campaign_id',
  'taskTypeId': 'task_type_id',
  'userId': 'user_id',
  'timeEntryId': 'time_entry_id',
  'validatedAt': 'validated_at',
  'validatedBy': 'validated_by',
  'isBillable': 'is_billable',
  'categoryId': 'category_id',
  'lastBackupDate': 'last_backup_date',
  'referenceMonth': 'reference_month',
  'cnpjFornecedor': 'cnpj_fornecedor',
  'razaoSocial': 'razao_social',
  'campaignTaskId': 'campaign_task_id',
  'resultCenter': 'result_center',
  'startDate': 'start_date',
  'endDate': 'end_date',
  'hoursWorked': 'hours_worked',
  'hourlyRate': 'hourly_rate',
  'totalCost': 'total_cost',
  'dateWorked': 'date_worked',
  'approvedAt': 'approved_at',
  'approvedBy': 'approved_by',
  'rejectedAt': 'rejected_at',
  'rejectedBy': 'rejected_by',
  'reviewedAt': 'reviewed_at',
  'reviewedBy': 'reviewed_by',
  'reviewComment': 'review_comment',
  'commentType': 'comment_type'
};

// Função para limpar aspas duplas extras dos CSVs
const cleanCsvValue = (value: string): string => {
  if (typeof value === 'string') {
    // Remove aspas duplas no início e fim se estiverem presentes
    return value.replace(/^"(.+)"$/, '$1');
  }
  return value;
};

// Função local para converter datas do CSV (com limpeza de aspas)
const convertDateForCsv = (dateStr: string): string | null => {
  if (!dateStr || dateStr === '') return null;
  
  // Primeiro limpa aspas duplas extras
  const cleaned = cleanCsvValue(dateStr);
  
  try {
    const date = new Date(cleaned);
    if (isNaN(date.getTime())) {
      debugMigrate(`Data inválida ignorada: '${cleaned}' (original: '${dateStr}')`);
      return null;
    }
    return date.toISOString();
  } catch (error) {
    debugMigrate(`Erro ao converter data: '${cleaned}' (original: '${dateStr}')`, error);
    return null;
  }
};

// Mapeamento dos arquivos CSV para tabelas SQL Server (nomes corretos dos arquivos)
const CSV_MAPPINGS: CsvToTableMapping[] = [
  {
    csvFile: 'users-2025-08.csv',
    tableName: 'users',
    columnTransforms: {
      id: (v: string) => parseInt(cleanCsvValue(v)),
      managerId: (v: string) => {
        const cleaned = cleanCsvValue(v);
        return cleaned && cleaned !== '' ? parseInt(cleaned) : null;
      },
      costCenterId: (v: string) => {
        const cleaned = cleanCsvValue(v);
        return cleaned && cleaned !== '' ? parseInt(cleaned) : null;
      },
      departmentId: (v: string) => {
        const cleaned = cleanCsvValue(v);
        return cleaned && cleaned !== '' ? parseInt(cleaned) : null;
      },
      monthlyCost: (v: string) => {
        const cleaned = cleanCsvValue(v);
        return cleaned && cleaned !== '' && cleaned !== '0.00' ? parseFloat(cleaned) : null;
      },
      isActive: (v: string) => convertBoolean(cleanCsvValue(v)),
      createdAt: convertDateForCsv,
      updatedAt: convertDateForCsv
    }
  },
  {
    csvFile: 'economicGroups-2025-08.csv', 
    tableName: 'economic_groups',
    columnTransforms: {
      id: (v: string) => parseInt(v),
      createdAt: convertDateForCsv
    }
  },
  {
    csvFile: 'clients-2025-08.csv',
    tableName: 'clients', 
    columnTransforms: {
      id: (v: string) => parseInt(v),
      economicGroupId: (v: string) => v ? parseInt(v) : null,
      isActive: convertBoolean,
      createdAt: convertDateForCsv
    }
  },
  {
    csvFile: 'campaigns-2025-08.csv',
    tableName: 'campaigns',
    columnTransforms: {
      id: (v: string) => parseInt(v),
      clientId: (v: string) => v ? parseInt(v) : null,
      isActive: convertBoolean,
      createdAt: convertDateForCsv,
      updatedAt: convertDateForCsv
    }
  },
  {
    csvFile: 'campaignTasks-2025-08.csv',
    tableName: 'campaign_tasks',
    columnTransforms: {
      id: (v: string) => parseInt(v),
      campaignId: (v: string) => parseInt(v),
      taskTypeId: (v: string) => parseInt(v)
    }
  },
  {
    csvFile: 'taskTypes-2025-08.csv',
    tableName: 'task_types',
    columnTransforms: {
      id: (v: string) => parseInt(v),
      inactivatedBy: (v: string) => v && v !== '' ? parseInt(v) : null,
      isBillable: convertBoolean,
      isActive: convertBoolean,
      createdAt: convertDateForCsv,
      updatedAt: convertDateForCsv,
      inactivatedAt: convertDateForCsv
    }
  },
  {
    csvFile: 'costCategories-2025-08.csv',
    tableName: 'cost_categories',
    columnTransforms: {
      id: (v: string) => parseInt(v),
      isActive: convertBoolean,
      createdAt: convertDateForCsv
    }
  },
  {
    csvFile: 'costCenters-2025-08.csv', 
    tableName: 'cost_centers',
    columnTransforms: {
      id: (v: string) => parseInt(v),
      managerId: (v: string) => v && v !== '' ? parseInt(v) : null,
      isActive: convertBoolean,
      createdAt: convertDateForCsv,
      updatedAt: convertDateForCsv
    }
  },
  {
    csvFile: 'departments-2025-08.csv',
    tableName: 'departments',
    columnTransforms: {
      id: (v: string) => parseInt(v),
      managerId: (v: string) => v && v !== '' ? parseInt(v) : null,
      isActive: convertBoolean,
      createdAt: convertDateForCsv,
      updatedAt: convertDateForCsv
    }
  },
  {
    csvFile: 'campaignCosts-2025-08.csv',
    tableName: 'campaign_costs',
    columnTransforms: {
      id: (v: string) => parseInt(v),
      campaignId: (v: string) => parseInt(v),
      userId: (v: string) => parseInt(v),
      amount: (v: string) => parseFloat(v),
      inactivatedBy: (v: string) => v && v !== '' ? parseInt(v) : null,
      categoryId: (v: string) => v && v !== '' ? parseInt(v) : null,
      createdAt: convertDateForCsv,
      updatedAt: convertDateForCsv,
      inactivatedAt: convertDateForCsv
    }
  },
  {
    csvFile: 'timeEntries-2025-08.csv',
    tableName: 'time_entries',
    columnTransforms: {
      id: (v: string) => parseInt(v),
      userId: (v: string) => parseInt(v),
      campaignId: (v: string) => parseInt(v),
      taskTypeId: (v: string) => parseInt(v),
      validatedBy: (v: string) => v && v !== '' ? parseInt(v) : null,
      hours: (v: string) => parseFloat(v),
      isBillable: convertBoolean,
      date: convertDateForCsv,
      createdAt: convertDateForCsv,
      updatedAt: convertDateForCsv,
      validatedAt: convertDateForCsv
    }
  },
  {
    csvFile: 'timeEntryComments-2025-08.csv',
    tableName: 'time_entry_comments',
    columnTransforms: {
      id: (v: string) => parseInt(v),
      timeEntryId: (v: string) => parseInt(v),
      userId: (v: string) => parseInt(v),
      createdAt: convertDateForCsv,
      updatedAt: convertDateForCsv
    }
  },
  {
    csvFile: 'systemConfig-2025-08.csv',
    tableName: 'system_config',
    columnTransforms: {
      id: (v: string) => parseInt(v),
      lastBackupDate: convertDateForCsv
    }
  },
  {
    csvFile: 'sessions-2025-08.csv',
    tableName: 'sessions',
    columnTransforms: {
      expires: convertDateForCsv
    }
  }
];

/**
 * Lê um arquivo CSV e retorna os dados como array de objetos
 */
async function readCsvFile(filePath: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const results: any[] = [];
    
    if (!fs.existsSync(filePath)) {
      debugMigrate(`Arquivo CSV não encontrado: ${filePath}`);
      resolve([]);
      return;
    }
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        debugMigrate(`CSV lido: ${filePath} - ${results.length} registros`);
        resolve(results);
      })
      .on('error', reject);
  });
}

/**
 * Converte valores do CSV usando as transformações especificadas
 */
function transformRowData(row: any, transforms: Record<string, (value: any) => any>): any {
  const transformed: any = {};
  
  for (const [csvKey, value] of Object.entries(row)) {
    // Pular campos vazios
    if (value === '' || value === null || value === undefined) {
      continue;
    }
    
    // Mapear nome da coluna CSV para SQL Server
    const sqlKey = COLUMN_NAME_MAPPING[csvKey] || csvKey;
    
    if (transforms[csvKey]) {
      try {
        transformed[sqlKey] = transforms[csvKey](value);
      } catch (error) {
        debugMigrate(`Erro ao transformar ${csvKey}=${value}:`, error);
        // Para datas inválidas, pular o campo
        if (error instanceof Error && error.message.includes('Invalid time value')) {
          continue;
        }
        throw error;
      }
    } else {
      // Normalizar strings e valores nulos (limpar aspas também)
      transformed[sqlKey] = normalizeString(cleanCsvValue(value as string));
    }
  }
  
  return transformed;
}

/**
 * Insere dados de um CSV em uma tabela do SQL Server
 */
async function migrateCsvToTable(
  mapping: CsvToTableMapping,
  mssqlPool: sql.ConnectionPool,
  schema = 'TMS'
): Promise<void> {
  const csvPath = path.join('../backups', mapping.csvFile);
  debugMigrate(`Iniciando migração: ${csvPath} → ${schema}.${mapping.tableName}`);
  
  try {
    // Ler arquivo CSV
    const csvData = await readCsvFile(csvPath);
    
    if (csvData.length === 0) {
      debugMigrate(`Sem dados para migrar: ${mapping.tableName}`);
      return;
    }
    
    // Processar em lotes
    const batchSize = 100;
    let processed = 0;
    
    for (let i = 0; i < csvData.length; i += batchSize) {
      const batch = csvData.slice(i, i + batchSize);
      
      const transaction = new sql.Transaction(mssqlPool);
      await transaction.begin();
      
      try {
        for (const row of batch) {
          // Transformar dados do CSV
          const transformedRow = transformRowData(row, mapping.columnTransforms);
          
          // Filtrar colunas válidas (não vazias)
          const validColumns = Object.entries(transformedRow)
            .filter(([key, value]) => 
              !mapping.skipColumns?.includes(key) && 
              value !== '' && 
              value !== null && 
              value !== undefined
            );
          
          if (validColumns.length === 0) continue;
          
          const request = new sql.Request(transaction);
          
          // Adicionar parâmetros
          for (const [key, value] of validColumns) {
            request.input(key, value);
          }
          
          // Construir query de inserção
          const columnNames = validColumns.map(([key]) => `[${key}]`).join(', ');
          const paramNames = validColumns.map(([key]) => `@${key}`).join(', ');
          
          const insertQuery = `
            INSERT INTO [${schema}].[${mapping.tableName}] (${columnNames})
            VALUES (${paramNames})
          `;
          
          await request.query(insertQuery);
        }
        
        await transaction.commit();
        processed += batch.length;
        debugMigrate(`Processado lote: ${processed}/${csvData.length} (${Math.round(processed/csvData.length*100)}%)`);
        
      } catch (error) {
        await transaction.rollback();
        debugMigrate(`Erro no lote ${i}:`, error);
        throw error;
      }
    }
    
    // Verificar contagem final
    const countResult = await mssqlPool.request().query(`
      SELECT COUNT(*) as count FROM [${schema}].[${mapping.tableName}]
    `);
    const finalCount = countResult.recordset[0].count;
    
    debugMigrate(`✅ ${mapping.tableName}: ${csvData.length} → ${finalCount} registros migrados`);
    
  } catch (error) {
    debugMigrate(`❌ Erro ao migrar ${mapping.tableName}:`, error);
    throw error;
  }
}

/**
 * Função principal de migração de CSVs
 */
async function migrateCsvsToMSSQL(): Promise<void> {
  debugMigrate('=== INICIANDO MIGRAÇÃO CSV → SQL SERVER ===');
  
  let mssqlPool: sql.ConnectionPool | null = null;
  
  try {
    // Conectar ao MSSQL
    debugMigrate('Conectando ao SQL Server...');
    mssqlPool = await getMssql();
    debugMigrate('Conectado ao SQL Server');
    
    // Migrar cada arquivo CSV
    for (const mapping of CSV_MAPPINGS) {
      await migrateCsvToTable(mapping, mssqlPool);
    }
    
    debugMigrate('=== MIGRAÇÃO DE DADOS CONCLUÍDA ===');
    
  } catch (error) {
    debugMigrate('❌ Erro na migração:', error);
    throw error;
    
  } finally {
    if (mssqlPool) {
      debugMigrate('Fechando conexão SQL Server...');
      await closeMssql();
    }
  }
}

// Executar migração
migrateCsvsToMSSQL()
  .then(() => {
    console.log('✅ Migração de CSVs concluída com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro na migração de CSVs:', error);
    process.exit(1);
  });

export { migrateCsvsToMSSQL, CSV_MAPPINGS };