import createDebug from 'debug';
import { getMssql, closeMssql, buildMergeQuery, convertBoolean, normalizeString, convertDateForMssql } from '../mssql-db';
import { db } from '../db';
import { sql as drizzleSql } from 'drizzle-orm';
import sql from 'mssql';

// Configurar debug namespaces
const debugDb = createDebug('app:db');
const debugMigrate = createDebug('app:migrate');

// Mapeamento de tipos PostgreSQL → SQL Server
const TYPE_MAPPINGS: Record<string, string> = {
  'serial': 'INT IDENTITY(1,1)',
  'bigserial': 'BIGINT IDENTITY(1,1)',
  'integer': 'INT',
  'bigint': 'BIGINT',
  'varchar': 'NVARCHAR',
  'character varying': 'NVARCHAR',
  'text': 'NVARCHAR(MAX)',
  'boolean': 'BIT',
  'json': 'NVARCHAR(MAX)',
  'jsonb': 'NVARCHAR(MAX)',
  'timestamp': 'DATETIME2',
  'timestamp without time zone': 'DATETIME2',
  'timestamp with time zone': 'DATETIMEOFFSET',
  'timestamptz': 'DATETIMEOFFSET',
  'date': 'DATE',
  'decimal': 'DECIMAL',
  'numeric': 'DECIMAL',
  'uuid': 'UNIQUEIDENTIFIER'
};

interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: 'YES' | 'NO';
  column_default: string | null;
  character_maximum_length: number | null;
  numeric_precision: number | null;
  numeric_scale: number | null;
}

interface TableInfo {
  table_name: string;
  columns: ColumnInfo[];
}

/**
 * Lê metadados das tabelas do PostgreSQL
 */
async function getPostgresTableMetadata(): Promise<TableInfo[]> {
  debugMigrate('Lendo metadados das tabelas do PostgreSQL...');
  
  try {
    const tablesResult = await db.execute(drizzleSql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const tables: TableInfo[] = [];
    
    // Verificar estrutura do resultado
    debugMigrate('Estrutura do resultado das tabelas:', tablesResult);
    const tableRows = Array.isArray(tablesResult) ? tablesResult : (tablesResult as any).rows || [];

    for (const table of tableRows) {
      const tableName = table.table_name as string;
      debugMigrate(`Lendo colunas da tabela: ${tableName}`);

      const columnsResult = await db.execute(drizzleSql`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length,
          numeric_precision,
          numeric_scale
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = ${tableName}
        ORDER BY ordinal_position
      `);

      const columnRows = Array.isArray(columnsResult) ? columnsResult : (columnsResult as any).rows || [];
      
      tables.push({
        table_name: tableName,
        columns: columnRows as ColumnInfo[]
      });
    }

    debugMigrate(`Encontradas ${tables.length} tabelas`);
    return tables;
  } catch (error) {
    debugMigrate('Erro ao ler metadados do PostgreSQL:', error);
    throw error;
  }
}

/**
 * Limpa valores padrão específicos do PostgreSQL
 */
function cleanDefaultValue(defaultValue: string | null): string | null {
  if (!defaultValue) return null;
  
  // Lista de valores problemáticos para remover completamente
  const problematicPatterns = [
    /without\s+time\s+zone/gi,
    /with\s+time\s+zone/gi,
    /nextval\([^)]+\)/gi,
    /::[\w\s\(\)]+/g, // Cast operators mais amplos
    /'[^']*'::[\w\s]+/g, // Strings com cast
  ];
  
  // Se contém padrões problemáticos, remover completamente
  for (const pattern of problematicPatterns) {
    if (pattern.test(defaultValue)) {
      debugMigrate(`Removendo valor padrão problemático: ${defaultValue}`);
      return null;
    }
  }
  
  // Substituições simples para valores seguros
  let cleaned = defaultValue
    .replace(/now\(\)/gi, 'SYSUTCDATETIME()')
    .replace(/current_timestamp/gi, 'SYSUTCDATETIME()')
    .replace(/gen_random_uuid\(\)/gi, 'NEWID()')
    .replace(/\btrue\b/gi, '1') // Boolean true → 1
    .replace(/\bfalse\b/gi, '0') // Boolean false → 0
    .trim();
  
  // Se ficou vazio após limpeza, retornar null
  if (!cleaned || cleaned === "''" || cleaned === 'NULL') return null;
  
  return cleaned;
}

/**
 * Converte tipo PostgreSQL para SQL Server
 */
function convertColumnType(column: ColumnInfo): string {
  let sqlServerType = TYPE_MAPPINGS[column.data_type] || column.data_type.toUpperCase();
  
  // Adicionar especificações de tamanho/precisão
  if (column.character_maximum_length && sqlServerType.includes('NVARCHAR')) {
    if (column.character_maximum_length <= 4000) {
      sqlServerType = `NVARCHAR(${column.character_maximum_length})`;
    } else {
      sqlServerType = 'NVARCHAR(MAX)';
    }
  }
  
  if (column.numeric_precision && column.numeric_scale !== null && sqlServerType === 'DECIMAL') {
    sqlServerType = `DECIMAL(${column.numeric_precision}, ${column.numeric_scale})`;
  }
  
  return sqlServerType;
}

/**
 * Gera DDL para criar tabela no SQL Server
 */
function generateCreateTableDDL(table: TableInfo, schema = 'TMS'): string {
  debugMigrate(`Gerando DDL para tabela: ${table.table_name}`);
  
  const columns = table.columns.map(column => {
    const sqlServerType = convertColumnType(column);
    const nullable = column.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
    
    let columnDef = `    [${column.column_name}] ${sqlServerType} ${nullable}`;
    
    // Adicionar valores padrão limpos
    const cleanDefault = cleanDefaultValue(column.column_default);
    if (cleanDefault && !sqlServerType.includes('IDENTITY')) {
      debugMigrate(`Default para ${column.column_name}: "${column.column_default}" → "${cleanDefault}"`);
      columnDef += ` DEFAULT ${cleanDefault}`;
    }
    
    // Adicionar constraints especiais
    if (column.column_name === 'id' && sqlServerType.includes('IDENTITY')) {
      columnDef += ' PRIMARY KEY';
    }
    
    return columnDef;
  }).join(',\n');

  const ddl = `
IF NOT EXISTS (SELECT * FROM sys.tables t 
               JOIN sys.schemas s ON t.schema_id = s.schema_id 
               WHERE s.name = '${schema}' AND t.name = '${table.table_name}')
BEGIN
    CREATE TABLE [${schema}].[${table.table_name}] (
${columns}
    );
    PRINT 'Tabela [${schema}].[${table.table_name}] criada com sucesso';
END
ELSE
    PRINT 'Tabela [${schema}].[${table.table_name}] já existe';
`;

  debugMigrate(`DDL gerado para ${table.table_name}:`, ddl);
  return ddl;
}

/**
 * Cria schema TMS se não existir
 */
async function createSchemaIfNotExists(mssqlPool: sql.ConnectionPool, schema = 'TMS'): Promise<void> {
  debugMigrate(`Verificando/criando schema: ${schema}`);
  
  try {
    await mssqlPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = '${schema}')
      BEGIN
        EXEC('CREATE SCHEMA [${schema}]');
        PRINT 'Schema [${schema}] criado com sucesso';
      END
      ELSE
        PRINT 'Schema [${schema}] já existe';
    `);
    debugMigrate(`Schema ${schema} verificado/criado`);
  } catch (error) {
    debugMigrate(`Erro ao criar schema ${schema}:`, error);
    throw error;
  }
}

/**
 * Cria tabelas no SQL Server baseado na estrutura do PostgreSQL
 */
async function createTablesInSqlServer(tables: TableInfo[], mssqlPool: sql.ConnectionPool, schema = 'TMS'): Promise<void> {
  debugMigrate('Criando tabelas no SQL Server...');
  
  // Criar schema primeiro
  await createSchemaIfNotExists(mssqlPool, schema);
  
  for (const table of tables) {
    try {
      const ddl = generateCreateTableDDL(table, schema);
      debugMigrate(`Executando DDL para: ${table.table_name}`);
      await mssqlPool.request().query(ddl);
      debugMigrate(`Tabela ${table.table_name} processada`);
    } catch (error) {
      debugMigrate(`Erro ao criar tabela ${table.table_name}:`, error);
      throw error;
    }
  }
  
  debugMigrate('Todas as tabelas foram processadas');
}

/**
 * Converte valores do PostgreSQL para SQL Server
 */
function convertValue(value: any, dataType: string): any {
  if (value === null || value === undefined) {
    return null;
  }
  
  switch (dataType) {
    case 'boolean':
      return convertBoolean(value);
    case 'text':
    case 'varchar':
      return normalizeString(value);
    case 'timestamp':
    case 'timestamptz':
      return convertDateForMssql(value);
    case 'json':
    case 'jsonb':
      return typeof value === 'string' ? value : JSON.stringify(value);
    default:
      return value;
  }
}

/**
 * Migra dados de uma tabela específica
 */
async function migrateTableData(
  table: TableInfo,
  mssqlPool: sql.ConnectionPool,
  batchSize = 1000,
  schema = 'TMS'
): Promise<void> {
  debugMigrate(`Iniciando migração de dados: ${table.table_name}`);
  
  try {
    // Contar registros no PostgreSQL
    const countResult = await db.execute(drizzleSql`SELECT COUNT(*) as count FROM ${drizzleSql.identifier(table.table_name)}`);
    const totalRows = Number((countResult as any)[0]?.count || 0);
    
    if (totalRows === 0) {
      debugMigrate(`Tabela ${table.table_name} está vazia, pulando migração de dados`);
      return;
    }
    
    debugMigrate(`Migrando ${totalRows} registros da tabela ${table.table_name} em lotes de ${batchSize}`);
    
    let offset = 0;
    let migratedRows = 0;
    
    while (offset < totalRows) {
      // Buscar lote do PostgreSQL
      const batchResult = await db.execute(drizzleSql`
        SELECT * FROM ${drizzleSql.identifier(table.table_name)}
        LIMIT ${batchSize} OFFSET ${offset}
      `);
      
      const batchArray = batchResult as unknown as any[];
      if (batchArray.length === 0) break;
      
      // Iniciar transação
      const transaction = new sql.Transaction(mssqlPool);
      await transaction.begin();
      
      try {
        for (const row of batchArray) {
          const request = new sql.Request(transaction);
          
          // Preparar dados convertidos
          const convertedRow: Record<string, any> = {};
          for (const column of table.columns) {
            const value = (row as any)[column.column_name];
            convertedRow[column.column_name] = convertValue(value, column.data_type);
          }
          
          // Adicionar parâmetros
          for (const [key, value] of Object.entries(convertedRow)) {
            request.input(key, value);
          }
          
          // Construir query de inserção
          const columnNames = table.columns.map(c => `[${c.column_name}]`).join(', ');
          const paramNames = table.columns.map(c => `@${c.column_name}`).join(', ');
          
          const insertQuery = `
            INSERT INTO [${schema}].[${table.table_name}] (${columnNames})
            VALUES (${paramNames})
          `;
          
          await request.query(insertQuery);
        }
        
        await transaction.commit();
        migratedRows += batchArray.length;
        debugMigrate(`Migrado lote: ${migratedRows}/${totalRows} (${Math.round(migratedRows/totalRows*100)}%)`);
        
      } catch (error) {
        await transaction.rollback();
        debugMigrate(`Erro no lote offset ${offset}:`, error);
        throw error;
      }
      
      offset += batchSize;
    }
    
    // Verificar contagem final
    const finalCountResult = await mssqlPool.request().query(`
      SELECT COUNT(*) as count FROM [${schema}].[${table.table_name}]
    `);
    const finalCount = finalCountResult.recordset[0].count;
    
    debugMigrate(`Migração da tabela ${table.table_name} concluída: ${migratedRows} → ${finalCount} registros`);
    
    if (finalCount !== totalRows) {
      debugMigrate(`AVISO: Contagem diferente origem (${totalRows}) vs destino (${finalCount})`);
    }
    
  } catch (error) {
    debugMigrate(`Erro ao migrar dados da tabela ${table.table_name}:`, error);
    throw error;
  }
}

/**
 * Função principal de migração
 */
async function migrateToMSSQL(): Promise<void> {
  debugMigrate('=== INICIANDO MIGRAÇÃO POSTGRESQL → SQL SERVER ===');
  
  let mssqlPool: sql.ConnectionPool | null = null;
  
  try {
    // Conectar ao MSSQL
    debugMigrate('Conectando ao SQL Server...');
    mssqlPool = await getMssql();
    debugDb('Conexão SQL Server estabelecida');
    
    // Ler estrutura do PostgreSQL
    debugMigrate('Lendo estrutura do PostgreSQL...');
    const tables = await getPostgresTableMetadata();
    
    // Criar tabelas no SQL Server
    debugMigrate('Criando estrutura no SQL Server...');
    await createTablesInSqlServer(tables, mssqlPool);
    
    // Migrar dados
    debugMigrate('Iniciando migração de dados...');
    for (const table of tables) {
      await migrateTableData(table, mssqlPool);
    }
    
    debugMigrate('=== MIGRAÇÃO CONCLUÍDA COM SUCESSO ===');
    
  } catch (error) {
    debugMigrate('=== ERRO NA MIGRAÇÃO ===');
    debugMigrate('Erro:', error);
    throw error;
    
  } finally {
    if (mssqlPool) {
      debugMigrate('Fechando conexão SQL Server...');
      await closeMssql();
    }
  }
}

// Executar migração diretamente
migrateToMSSQL()
  .then(() => {
    console.log('✅ Migração concluída com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro na migração:', error);
    process.exit(1);
  });

export { migrateToMSSQL, getPostgresTableMetadata, createTablesInSqlServer, migrateTableData };