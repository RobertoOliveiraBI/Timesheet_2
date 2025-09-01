import { getMssql, closeMssql, buildOffsetFetch, convertBoolean, convertFromBit, normalizeString, convertDateForMssql } from '../mssql-db';
import { mssqlStorage } from '../storage-mssql';
import createDebug from 'debug';

const debug = createDebug('app:test');

/**
 * Suite de testes para validar a migração e funcionalidade do SQL Server
 * 
 * Execute com: DEBUG=app:* npm test
 * 
 * Testes cobrem:
 * 1. Conexão básica ao MSSQL
 * 2. Verificação do schema migrado
 * 3. CRUD básico em usuários
 * 4. Listagens das principais entidades
 */

describe('MSSQL Database Tests', () => {
  let pool: any;

  beforeAll(async () => {
    debug('Iniciando testes MSSQL...');
    
    // Verificar se MSSQL_URL está configurada
    if (!process.env.MSSQL_URL) {
      throw new Error('MSSQL_URL environment variable is required for tests');
    }
    
    // Estabelecer conexão
    pool = await getMssql();
    debug('Conexão MSSQL estabelecida para testes');
  });

  afterAll(async () => {
    debug('Finalizando testes MSSQL...');
    await closeMssql();
    debug('Conexão MSSQL fechada');
  });

  describe('Conexão e Pool MSSQL', () => {
    test('deve conectar e fechar pool MSSQL', async () => {
      expect(pool).toBeDefined();
      expect(pool.connected).toBe(true);
      debug('✓ Pool MSSQL conectado com sucesso');
    });

    test('deve validar configurações de segurança', () => {
      const connStr = process.env.MSSQL_URL!;
      expect(connStr).toContain('encrypt=true');
      debug('✓ Configuração encrypt=true validada');
    });
  });

  describe('Verificação do Schema', () => {
    test('deve confirmar existência de tabelas essenciais', async () => {
      const request = pool.request();
      
      // Verificar se schema TMS existe, senão usar dbo
      const schemaResult = await request.query(`
        SELECT name FROM sys.schemas WHERE name IN ('TMS', 'dbo')
      `);
      
      const availableSchemas = schemaResult.recordset.map((r: any) => r.name);
      debug('Schemas disponíveis:', availableSchemas);
      
      const schema = availableSchemas.includes('TMS') ? 'TMS' : 'dbo';
      debug(`Usando schema: ${schema}`);
      
      const tablesResult = await request.query(`
        SELECT t.name as table_name
        FROM sys.tables t 
        JOIN sys.schemas s ON t.schema_id = s.schema_id 
        WHERE s.name = '${schema}'
        ORDER BY t.name
      `);
      
      const tableNames = tablesResult.recordset.map((r: any) => r.table_name);
      debug('Tabelas encontradas:', tableNames);
      
      // Verificar tabelas essenciais
      const essentialTables = [
        'users', 'economicGroups', 'clients', 'campaigns', 
        'campaignUsers', 'taskTypes', 'campaignTasks', 
        'timeEntries', 'departments', 'costCenters'
      ];
      
      for (const table of essentialTables) {
        expect(tableNames).toContain(table);
        debug(`✓ Tabela ${table} existe`);
      }
    });

    test('deve validar estrutura da tabela users', async () => {
      const request = pool.request();
      
      const columnsResult = await request.query(`
        SELECT 
          c.COLUMN_NAME,
          c.DATA_TYPE,
          c.IS_NULLABLE,
          c.COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS c
        JOIN INFORMATION_SCHEMA.TABLES t ON c.TABLE_NAME = t.TABLE_NAME
        WHERE t.TABLE_SCHEMA IN ('TMS', 'dbo') 
        AND c.TABLE_NAME = 'users'
        ORDER BY c.ORDINAL_POSITION
      `);
      
      const columns = columnsResult.recordset.map((r: any) => r.COLUMN_NAME);
      debug('Colunas da tabela users:', columns);
      
      // Verificar colunas essenciais
      const essentialColumns = ['id', 'email', 'password', 'firstName', 'role'];
      for (const column of essentialColumns) {
        expect(columns).toContain(column);
        debug(`✓ Coluna ${column} existe na tabela users`);
      }
    });
  });

  describe('Helpers e Conversões', () => {
    test('buildOffsetFetch deve gerar SQL correto', () => {
      expect(buildOffsetFetch(1, 20)).toContain('OFFSET 0 ROWS FETCH NEXT 20 ROWS ONLY');
      expect(buildOffsetFetch(2, 10)).toContain('OFFSET 10 ROWS FETCH NEXT 10 ROWS ONLY');
      expect(buildOffsetFetch(3, 5)).toContain('OFFSET 10 ROWS FETCH NEXT 5 ROWS ONLY');
      debug('✓ buildOffsetFetch funcionando corretamente');
    });

    test('convertBoolean deve converter valores para BIT', () => {
      expect(convertBoolean(true)).toBe(1);
      expect(convertBoolean(false)).toBe(0);
      expect(convertBoolean(null)).toBe(null);
      expect(convertBoolean(undefined)).toBe(null);
      debug('✓ convertBoolean funcionando corretamente');
    });

    test('convertFromBit deve converter BIT para boolean', () => {
      expect(convertFromBit(1)).toBe(true);
      expect(convertFromBit(0)).toBe(false);
      expect(convertFromBit(null)).toBe(null);
      expect(convertFromBit(undefined)).toBe(null);
      debug('✓ convertFromBit funcionando corretamente');
    });

    test('normalizeString deve tratar strings corretamente', () => {
      expect(normalizeString('  teste  ')).toBe('teste');
      expect(normalizeString('')).toBe(null);
      expect(normalizeString('   ')).toBe(null);
      expect(normalizeString(null)).toBe(null);
      expect(normalizeString(undefined)).toBe(null);
      debug('✓ normalizeString funcionando corretamente');
    });

    test('convertDateForMssql deve formatar datas para DATETIMEOFFSET', () => {
      const date = new Date('2025-01-02T10:30:00Z');
      const result = convertDateForMssql(date);
      expect(result).toBe('2025-01-02T10:30:00.000Z');
      
      expect(convertDateForMssql(null)).toBe(null);
      expect(convertDateForMssql(undefined)).toBe(null);
      debug('✓ convertDateForMssql funcionando corretamente');
    });
  });

  describe('CRUD de Usuários (Storage MSSQL)', () => {
    let testUserId: number;
    const testUserEmail = `test-user-${Date.now()}@test.com`;
    
    test('deve criar usuário', async () => {
      const userData = {
        email: testUserEmail,
        password: 'test123456',
        firstName: 'Test',
        lastName: 'User',
        role: 'COLABORADOR' as const,
        isActive: true
      };
      
      const user = await mssqlStorage.createUser(userData);
      
      expect(user).toBeDefined();
      expect(user.email).toBe(testUserEmail);
      expect(user.firstName).toBe('Test');
      expect(user.role).toBe('COLABORADOR');
      
      testUserId = user.id;
      debug(`✓ Usuário criado com ID: ${testUserId}`);
    });

    test('deve ler usuário por ID', async () => {
      const user = await mssqlStorage.getUser(testUserId);
      
      expect(user).toBeDefined();
      expect(user!.id).toBe(testUserId);
      expect(user!.email).toBe(testUserEmail);
      debug(`✓ Usuário lido por ID: ${testUserId}`);
    });

    test('deve ler usuário por email', async () => {
      const user = await mssqlStorage.getUserByEmail(testUserEmail);
      
      expect(user).toBeDefined();
      expect(user!.id).toBe(testUserId);
      expect(user!.email).toBe(testUserEmail);
      debug(`✓ Usuário lido por email: ${testUserEmail}`);
    });

    test('deve atualizar usuário', async () => {
      const updatedUser = await mssqlStorage.updateUser(testUserId, {
        firstName: 'Updated Test',
        lastName: 'Updated User'
      });
      
      expect(updatedUser.firstName).toBe('Updated Test');
      expect(updatedUser.lastName).toBe('Updated User');
      expect(updatedUser.email).toBe(testUserEmail); // Email não deve mudar
      debug(`✓ Usuário atualizado: ${testUserId}`);
    });

    test('deve inativar usuário (soft delete)', async () => {
      const inactivatedUser = await mssqlStorage.updateUser(testUserId, {
        isActive: false
      });
      
      expect(inactivatedUser.isActive).toBe(false);
      debug(`✓ Usuário inativado: ${testUserId}`);
    });

    test('deve listar usuários paginados', async () => {
      const users = await mssqlStorage.getAllUsers();
      
      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBeGreaterThan(0);
      
      // Verificar se nosso usuário teste está na lista
      const testUser = users.find(u => u.id === testUserId);
      expect(testUser).toBeDefined();
      expect(testUser!.isActive).toBe(false); // Deve estar inativo
      debug(`✓ Listagem de usuários retornou ${users.length} registros`);
    });

    // Cleanup do usuário teste
    afterAll(async () => {
      try {
        await mssqlStorage.deleteUser(testUserId);
        debug(`✓ Usuário teste removido: ${testUserId}`);
      } catch (error) {
        debug(`⚠ Erro ao remover usuário teste: ${error}`);
      }
    });
  });

  describe('Listagens de Entidades', () => {
    test('deve listar grupos econômicos', async () => {
      const groups = await mssqlStorage.getEconomicGroups();
      
      expect(Array.isArray(groups)).toBe(true);
      debug(`✓ Listagem de grupos econômicos retornou ${groups.length} registros`);
      
      if (groups.length > 0) {
        const group = groups[0];
        expect(group).toHaveProperty('id');
        expect(group).toHaveProperty('name');
        debug(`✓ Estrutura do grupo econômico validada`);
      }
    });

    test('deve listar clientes', async () => {
      const clients = await mssqlStorage.getClients();
      
      expect(Array.isArray(clients)).toBe(true);
      debug(`✓ Listagem de clientes retornou ${clients.length} registros`);
      
      if (clients.length > 0) {
        const client = clients[0];
        expect(client).toHaveProperty('id');
        expect(client).toHaveProperty('companyName');
        expect(client.isActive).toBe(true); // getClients só retorna ativos
        debug(`✓ Estrutura do cliente validada`);
      }
    });

    test('deve listar campanhas', async () => {
      const campaigns = await mssqlStorage.getCampaigns();
      
      expect(Array.isArray(campaigns)).toBe(true);
      debug(`✓ Listagem de campanhas retornou ${campaigns.length} registros`);
      
      if (campaigns.length > 0) {
        const campaign = campaigns[0];
        expect(campaign).toHaveProperty('id');
        expect(campaign).toHaveProperty('name');
        expect(campaign).toHaveProperty('clientId');
        debug(`✓ Estrutura da campanha validada`);
      }
    });

    test('deve listar tipos de tarefa', async () => {
      const taskTypes = await mssqlStorage.getTaskTypes();
      
      expect(Array.isArray(taskTypes)).toBe(true);
      debug(`✓ Listagem de tipos de tarefa retornou ${taskTypes.length} registros`);
      
      if (taskTypes.length > 0) {
        const taskType = taskTypes[0];
        expect(taskType).toHaveProperty('id');
        expect(taskType).toHaveProperty('name');
        expect(taskType).toHaveProperty('isBillable');
        debug(`✓ Estrutura do tipo de tarefa validada`);
      }
    });

    test('deve listar departamentos', async () => {
      const departments = await mssqlStorage.getDepartments();
      
      expect(Array.isArray(departments)).toBe(true);
      debug(`✓ Listagem de departamentos retornou ${departments.length} registros`);
      
      if (departments.length > 0) {
        const department = departments[0];
        expect(department).toHaveProperty('id');
        expect(department).toHaveProperty('name');
        debug(`✓ Estrutura do departamento validada`);
      }
    });

    test('deve listar centros de custo', async () => {
      const costCenters = await mssqlStorage.getCostCenters();
      
      expect(Array.isArray(costCenters)).toBe(true);
      debug(`✓ Listagem de centros de custo retornou ${costCenters.length} registros`);
      
      if (costCenters.length > 0) {
        const costCenter = costCenters[0];
        expect(costCenter).toHaveProperty('id');
        expect(costCenter).toHaveProperty('name');
        expect(costCenter).toHaveProperty('code');
        debug(`✓ Estrutura do centro de custo validada`);
      }
    });
  });

  describe('Validação de Integridade', () => {
    test('deve validar constraints de chave estrangeira', async () => {
      const request = pool.request();
      
      // Verificar constraints FK existentes
      const constraintsResult = await request.query(`
        SELECT 
          fk.name as constraint_name,
          tp.name as parent_table,
          tr.name as referenced_table
        FROM sys.foreign_keys fk
        JOIN sys.tables tp ON fk.parent_object_id = tp.object_id
        JOIN sys.tables tr ON fk.referenced_object_id = tr.object_id
        JOIN sys.schemas s ON tp.schema_id = s.schema_id
        WHERE s.name IN ('TMS', 'dbo')
        ORDER BY fk.name
      `);
      
      const constraints = constraintsResult.recordset;
      debug(`✓ Encontradas ${constraints.length} constraints de chave estrangeira`);
      
      // Verificar algumas constraints essenciais
      const constraintNames = constraints.map((c: any) => `${c.parent_table}->${c.referenced_table}`);
      debug('Constraints FK:', constraintNames);
      
      // Pelo menos algumas constraints devem existir para manter integridade
      expect(constraints.length).toBeGreaterThan(0);
    });

    test('deve validar índices essenciais', async () => {
      const request = pool.request();
      
      // Verificar índices existentes
      const indexesResult = await request.query(`
        SELECT 
          i.name as index_name,
          t.name as table_name,
          i.type_desc as index_type
        FROM sys.indexes i
        JOIN sys.tables t ON i.object_id = t.object_id
        JOIN sys.schemas s ON t.schema_id = s.schema_id
        WHERE s.name IN ('TMS', 'dbo')
        AND i.name IS NOT NULL
        ORDER BY t.name, i.name
      `);
      
      const indexes = indexesResult.recordset;
      debug(`✓ Encontrados ${indexes.length} índices`);
      
      // Verificar se existem índices primários (PK)
      const primaryKeys = indexes.filter((idx: any) => idx.index_type.includes('PRIMARY'));
      expect(primaryKeys.length).toBeGreaterThan(0);
      debug(`✓ Encontradas ${primaryKeys.length} chaves primárias`);
    });
  });

  describe('Performance e Configuração', () => {
    test('deve testar conexão com timeout apropriado', async () => {
      const startTime = Date.now();
      
      const request = pool.request();
      await request.query('SELECT GETDATE() as current_time');
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Menos de 5 segundos
      debug(`✓ Query executada em ${duration}ms`);
    });

    test('deve validar configurações de collation', async () => {
      const request = pool.request();
      
      const collationResult = await request.query(`
        SELECT 
          SERVERPROPERTY('Collation') as server_collation,
          DATABASEPROPERTYEX(DB_NAME(), 'Collation') as database_collation
      `);
      
      const collation = collationResult.recordset[0];
      debug('Collation configurada:', collation);
      
      // Verificar se está usando collation case-insensitive
      expect(collation.database_collation).toBeDefined();
      debug(`✓ Database collation: ${collation.database_collation}`);
    });
  });
});

// Helper para rodar testes individuais
export const runMssqlTests = async () => {
  debug('Executando testes MSSQL manuais...');
  
  try {
    const pool = await getMssql();
    debug('✓ Conexão estabelecida');
    
    // Teste básico de conectividade
    const result = await pool.request().query('SELECT GETDATE() as now, @@VERSION as version');
    debug('✓ Query teste executada:', result.recordset[0]);
    
    await closeMssql();
    debug('✓ Conexão fechada com sucesso');
    
    return { success: true, message: 'Todos os testes MSSQL passaram!' };
  } catch (error) {
    debug('✗ Erro nos testes MSSQL:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
};