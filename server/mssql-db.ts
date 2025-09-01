import sql from 'mssql';
import createDebug from 'debug';

const debug = createDebug('app:db');

let pool: sql.ConnectionPool | null = null;

/**
 * Parseia uma URL MSSQL para objeto de configuração
 * Formato: mssql://usuario:senha@servidor:porta/database?opções
 */
function parseMssqlUrl(url: string): sql.config {
  try {
    const parsed = new URL(url);
    
    // Extrair componentes básicos
    const server = parsed.hostname;
    const port = parsed.port ? parseInt(parsed.port) : 1433;
    const database = parsed.pathname.replace('/', '');
    const user = decodeURIComponent(parsed.username);
    const password = decodeURIComponent(parsed.password);
    
    // Extrair opções da query string
    const options = parsed.searchParams;
    const encrypt = options.get('encrypt') === 'true';
    const trustServerCertificate = options.get('trustServerCertificate') === 'true';
    
    debug('Parsando URL MSSQL:', { server, port, database, user: user.substring(0, 3) + '***' });
    
    return {
      server,
      port,
      database,
      user,
      password,
      options: {
        encrypt,
        trustServerCertificate,
        connectionTimeout: 30000,
        requestTimeout: 30000,
        pool: {
          max: 10,
          min: 0,
          idleTimeoutMillis: 30000
        }
      }
    } as sql.config;
  } catch (error) {
    throw new Error(`Erro ao parsear MSSQL_URL: ${error instanceof Error ? error.message : 'URL inválida'}`);
  }
}

/**
 * Obtém ou cria um pool de conexão MSSQL reutilizável
 * Usa a variável de ambiente MSSQL_URL para conectar ao Azure SQL Server
 */
export async function getMssql(): Promise<sql.ConnectionPool> {
  if (pool) {
    debug('Retornando pool MSSQL existente');
    return pool;
  }

  const connStr = process.env.MSSQL_URL;
  if (!connStr) {
    throw new Error('MSSQL_URL ausente no .env - configure a string de conexão do Azure SQL Server');
  }

  // Validar configurações de segurança necessárias
  if (!connStr.includes('encrypt=true')) {
    throw new Error('MSSQL_URL deve incluir encrypt=true para conexões seguras');
  }

  debug('Conectando ao MSSQL (Azure SQL Server)...');
  
  try {
    // Parsear URL do SQL Server para configuração
    const config = parseMssqlUrl(connStr);
    debug('Configuração SQL Server:', { server: config.server, database: config.database, user: config.user });
    
    // Criar pool de conexão
    pool = new sql.ConnectionPool(config);
    
    // Eventos de debug
    pool.on('connect', () => {
      debug('Pool MSSQL conectado com sucesso');
    });
    
    pool.on('error', (err: Error) => {
      debug('Erro no pool MSSQL:', err.message);
      pool = null; // Reset pool em caso de erro
    });

    await pool.connect();
    debug('MSSQL conectado com sucesso');
    
    return pool;
  } catch (error) {
    debug('Erro ao conectar ao MSSQL:', error);
    pool = null;
    throw new Error(`Falha na conexão MSSQL: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

/**
 * Fecha o pool de conexão MSSQL
 */
export async function closeMssql(): Promise<void> {
  if (pool) {
    debug('Fechando pool MSSQL...');
    try {
      await pool.close();
      debug('Pool MSSQL fechado com sucesso');
    } catch (error) {
      debug('Erro ao fechar pool MSSQL:', error);
    } finally {
      pool = null;
    }
  }
}

/**
 * Helper para construir query de paginação compatible com SQL Server
 * Converte LIMIT/OFFSET do PostgreSQL para OFFSET/FETCH do SQL Server
 */
export function buildOffsetFetch(page = 1, pageSize = 20): string {
  const p = Math.max(1, page);
  const ps = Math.max(1, pageSize);
  const offset = (p - 1) * ps;
  return ` OFFSET ${offset} ROWS FETCH NEXT ${ps} ROWS ONLY `;
}

/**
 * Helper para converter booleanos para BIT (SQL Server)
 */
export function convertBoolean(value: boolean | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return value ? 1 : 0;
}

/**
 * Helper para converter BIT para boolean (SQL Server para JavaScript)
 */
export function convertFromBit(value: number | boolean | null | undefined): boolean | null {
  if (value === null || value === undefined) return null;
  return Boolean(value);
}

/**
 * Helper para normalizar strings (trim e converter null)
 */
export function normalizeString(value: string | null | undefined): string | null {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * Helper para converter datas para DATETIMEOFFSET (SQL Server)
 */
export function convertDateForMssql(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  const dateObj = date instanceof Date ? date : new Date(date);
  return dateObj.toISOString();
}

/**
 * Helper para criar queries de UPSERT usando MERGE (equivalente ao ON CONFLICT)
 */
export function buildMergeQuery(
  tableName: string,
  keyColumns: string[],
  dataColumns: Record<string, any>,
  schema = 'TMS'
): string {
  const fullTableName = `[${schema}].[${tableName}]`;
  const keyConditions = keyColumns.map(col => `tgt.[${col}] = src.[${col}]`).join(' AND ');
  
  const insertColumns = Object.keys(dataColumns).map(col => `[${col}]`).join(', ');
  const insertValues = Object.keys(dataColumns).map(col => `src.[${col}]`).join(', ');
  
  const updateSets = Object.keys(dataColumns)
    .filter(col => !keyColumns.includes(col))
    .map(col => `[${col}] = src.[${col}]`)
    .join(', ');

  return `
    MERGE ${fullTableName} AS tgt
    USING (SELECT ${Object.keys(dataColumns).map(col => `@${col} AS [${col}]`).join(', ')}) AS src
    ON (${keyConditions})
    WHEN MATCHED THEN UPDATE SET ${updateSets}
    WHEN NOT MATCHED THEN INSERT (${insertColumns}) VALUES (${insertValues});
  `;
}

/**
 * Helper para executar query com retry em caso de falha temporária
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Erro desconhecido');
      debug(`Tentativa ${attempt}/${maxRetries} falhou:`, lastError.message);
      
      if (attempt < maxRetries) {
        debug(`Aguardando ${delayMs}ms antes da próxima tentativa...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs *= 2; // Backoff exponencial
      }
    }
  }
  
  throw lastError;
}

// Graceful shutdown
process.on('SIGINT', async () => {
  debug('Recebido SIGINT, fechando conexões MSSQL...');
  await closeMssql();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  debug('Recebido SIGTERM, fechando conexões MSSQL...');
  await closeMssql();
  process.exit(0);
});

export default { getMssql, closeMssql, buildOffsetFetch, convertBoolean, convertFromBit, normalizeString, convertDateForMssql, buildMergeQuery, executeWithRetry };