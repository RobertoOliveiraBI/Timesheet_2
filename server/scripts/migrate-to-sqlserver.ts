import { getMssql } from '../mssql-db';
import { db } from '../db';
import bcrypt from 'bcryptjs';
import createDebug from 'debug';

const debug = createDebug('migrate');

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function createTablesInSQLServer() {
  const pool = await getMssql();
  
  console.log('🔧 Criando tabelas no SQL Server...');
  
  // Script para criar todas as tabelas necessárias
  const createTablesSQL = `
    -- Criar schema se não existir
    IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'dbo')
    BEGIN
        EXEC('CREATE SCHEMA dbo')
    END;

    -- Tabela economic_groups
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='economic_groups' AND xtype='U')
    CREATE TABLE economic_groups (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(255) NOT NULL,
        created_at DATETIME2 DEFAULT GETDATE()
    );

    -- Tabela departments  
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='departments' AND xtype='U')
    CREATE TABLE departments (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(255) NOT NULL,
        created_at DATETIME2 DEFAULT GETDATE()
    );

    -- Tabela cost_centers
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='cost_centers' AND xtype='U')
    CREATE TABLE cost_centers (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(255) NOT NULL,
        department_id INT,
        created_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (department_id) REFERENCES departments(id)
    );

    -- Tabela users (principal)
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')
    CREATE TABLE users (
        id INT IDENTITY(1,1) PRIMARY KEY,
        email NVARCHAR(255) UNIQUE NOT NULL,
        password NVARCHAR(255) NOT NULL,
        first_name NVARCHAR(255),
        last_name NVARCHAR(255),
        role NVARCHAR(50) DEFAULT 'COLABORADOR',
        profile NVARCHAR(50),
        is_active BIT DEFAULT 1,
        department_id INT,
        cost_center_id INT,
        manager_id INT,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (department_id) REFERENCES departments(id),
        FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id),
        FOREIGN KEY (manager_id) REFERENCES users(id)
    );

    -- Tabela clients
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='clients' AND xtype='U')
    CREATE TABLE clients (
        id INT IDENTITY(1,1) PRIMARY KEY,
        company_name NVARCHAR(255) NOT NULL,
        trade_name NVARCHAR(255),
        cnpj NVARCHAR(20),
        email NVARCHAR(255),
        economic_group_id INT,
        is_active BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (economic_group_id) REFERENCES economic_groups(id)
    );

    -- Tabela task_types
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='task_types' AND xtype='U')
    CREATE TABLE task_types (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(255) NOT NULL,
        description NVARCHAR(MAX),
        is_billable BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE()
    );

    -- Tabela campaigns
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='campaigns' AND xtype='U')
    CREATE TABLE campaigns (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(255) NOT NULL,
        description NVARCHAR(MAX),
        client_id INT,
        is_active BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (client_id) REFERENCES clients(id)
    );

    -- Tabela campaign_tasks
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='campaign_tasks' AND xtype='U')
    CREATE TABLE campaign_tasks (
        id INT IDENTITY(1,1) PRIMARY KEY,
        campaign_id INT NOT NULL,
        task_type_id INT NOT NULL,
        name NVARCHAR(255) NOT NULL,
        description NVARCHAR(MAX),
        is_active BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
        FOREIGN KEY (task_type_id) REFERENCES task_types(id)
    );

    -- Tabela campaign_users
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='campaign_users' AND xtype='U')
    CREATE TABLE campaign_users (
        id INT IDENTITY(1,1) PRIMARY KEY,
        campaign_id INT NOT NULL,
        user_id INT NOT NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Tabela time_entries
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='time_entries' AND xtype='U')
    CREATE TABLE time_entries (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL,
        campaign_id INT,
        campaign_task_id INT,
        date DATE NOT NULL,
        start_time TIME,
        end_time TIME,
        total_minutes INT DEFAULT 0,
        description NVARCHAR(MAX),
        status NVARCHAR(50) DEFAULT 'RASCUNHO',
        is_billable BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
        FOREIGN KEY (campaign_task_id) REFERENCES campaign_tasks(id)
    );

    -- Tabela time_entry_comments
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='time_entry_comments' AND xtype='U')
    CREATE TABLE time_entry_comments (
        id INT IDENTITY(1,1) PRIMARY KEY,
        time_entry_id INT NOT NULL,
        user_id INT NOT NULL,
        comment NVARCHAR(MAX) NOT NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (time_entry_id) REFERENCES time_entries(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Tabela cost_categories
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='cost_categories' AND xtype='U')
    CREATE TABLE cost_categories (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(255) NOT NULL,
        description NVARCHAR(MAX),
        created_at DATETIME2 DEFAULT GETDATE()
    );

    -- Tabela campaign_costs
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='campaign_costs' AND xtype='U')
    CREATE TABLE campaign_costs (
        id INT IDENTITY(1,1) PRIMARY KEY,
        campaign_id INT NOT NULL,
        cost_category_id INT,
        description NVARCHAR(MAX),
        amount DECIMAL(10,2) DEFAULT 0,
        cost_date DATE,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
        FOREIGN KEY (cost_category_id) REFERENCES cost_categories(id)
    );

    -- Tabela system_config
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='system_config' AND xtype='U')
    CREATE TABLE system_config (
        id INT IDENTITY(1,1) PRIMARY KEY,
        config_key NVARCHAR(255) UNIQUE NOT NULL,
        config_value NVARCHAR(MAX),
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
    );

    -- Tabela sessions para autenticação
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='sessions' AND xtype='U')
    CREATE TABLE sessions (
        sid NVARCHAR(255) PRIMARY KEY,
        sess NVARCHAR(MAX),
        expire DATETIME2
    );
  `;

  await pool.request().query(createTablesSQL);
  console.log('✅ Tabelas criadas com sucesso!');
}

async function migrateData() {
  console.log('📊 Iniciando migração dos dados...');
  
  const pool = await getMssql();

  // 1. Migrar economic_groups
  console.log('📁 Migrando grupos econômicos...');
  const groups = await db.execute(`SELECT * FROM economic_groups ORDER BY id`);
  for (const group of groups as any[]) {
    await pool.request()
      .input('id', group.id)
      .input('name', group.name)
      .input('created_at', group.created_at)
      .query(`
        SET IDENTITY_INSERT economic_groups ON;
        INSERT INTO economic_groups (id, name, created_at) 
        VALUES (@id, @name, @created_at);
        SET IDENTITY_INSERT economic_groups OFF;
      `);
  }

  // 2. Migrar departments
  console.log('🏢 Migrando departamentos...');
  const departments = await db.execute(`SELECT * FROM departments ORDER BY id`);
  for (const dept of departments as any[]) {
    await pool.request()
      .input('id', dept.id)
      .input('name', dept.name)
      .input('created_at', dept.created_at)
      .query(`
        SET IDENTITY_INSERT departments ON;
        INSERT INTO departments (id, name, created_at) 
        VALUES (@id, @name, @created_at);
        SET IDENTITY_INSERT departments OFF;
      `);
  }

  // 3. Migrar cost_centers
  console.log('💰 Migrando centros de custo...');
  const costCenters = await db.execute(`SELECT * FROM cost_centers ORDER BY id`);
  for (const cc of costCenters as any[]) {
    await pool.request()
      .input('id', cc.id)
      .input('name', cc.name)
      .input('department_id', cc.department_id)
      .input('created_at', cc.created_at)
      .query(`
        SET IDENTITY_INSERT cost_centers ON;
        INSERT INTO cost_centers (id, name, department_id, created_at) 
        VALUES (@id, @name, @department_id, @created_at);
        SET IDENTITY_INSERT cost_centers OFF;
      `);
  }

  // 4. Migrar users (COM HASH DAS SENHAS!)
  console.log('👥 Migrando usuários e hasheando senhas...');
  const users = await db.execute(`SELECT * FROM users ORDER BY id`);
  for (const user of users as any[]) {
    // Hashear a senha se ela não estiver já hasheada
    let hashedPassword = user.password;
    if (user.password && !user.password.startsWith('$2')) {
      console.log(`🔐 Hasheando senha para usuário: ${user.email}`);
      hashedPassword = await hashPassword(user.password);
    }

    await pool.request()
      .input('id', user.id)
      .input('email', user.email)
      .input('password', hashedPassword)
      .input('first_name', user.first_name)
      .input('last_name', user.last_name)
      .input('role', user.role)
      .input('profile', user.profile)
      .input('is_active', user.is_active ? 1 : 0)
      .input('department_id', user.department_id)
      .input('cost_center_id', user.cost_center_id)
      .input('manager_id', user.manager_id)
      .input('created_at', user.created_at)
      .input('updated_at', user.updated_at)
      .query(`
        SET IDENTITY_INSERT users ON;
        INSERT INTO users (id, email, password, first_name, last_name, role, profile, is_active, department_id, cost_center_id, manager_id, created_at, updated_at) 
        VALUES (@id, @email, @password, @first_name, @last_name, @role, @profile, @is_active, @department_id, @cost_center_id, @manager_id, @created_at, @updated_at);
        SET IDENTITY_INSERT users OFF;
      `);
  }

  // 5. Migrar clients
  console.log('🏪 Migrando clientes...');
  const clients = await db.execute(`SELECT * FROM clients ORDER BY id`);
  for (const client of clients as any[]) {
    await pool.request()
      .input('id', client.id)
      .input('company_name', client.company_name)
      .input('trade_name', client.trade_name)
      .input('cnpj', client.cnpj)
      .input('email', client.email)
      .input('economic_group_id', client.economic_group_id)
      .input('is_active', client.is_active ? 1 : 0)
      .input('created_at', client.created_at)
      .query(`
        SET IDENTITY_INSERT clients ON;
        INSERT INTO clients (id, company_name, trade_name, cnpj, email, economic_group_id, is_active, created_at) 
        VALUES (@id, @company_name, @trade_name, @cnpj, @email, @economic_group_id, @is_active, @created_at);
        SET IDENTITY_INSERT clients OFF;
      `);
  }

  // 6. Migrar task_types
  console.log('📋 Migrando tipos de tarefa...');
  const taskTypes = await db.execute(`SELECT * FROM task_types ORDER BY id`);
  for (const tt of taskTypes as any[]) {
    await pool.request()
      .input('id', tt.id)
      .input('name', tt.name)
      .input('description', tt.description)
      .input('is_billable', tt.is_billable ? 1 : 0)
      .input('created_at', tt.created_at)
      .query(`
        SET IDENTITY_INSERT task_types ON;
        INSERT INTO task_types (id, name, description, is_billable, created_at) 
        VALUES (@id, @name, @description, @is_billable, @created_at);
        SET IDENTITY_INSERT task_types OFF;
      `);
  }

  // 7. Migrar campaigns
  console.log('📢 Migrando campanhas...');
  const campaigns = await db.execute(`SELECT * FROM campaigns ORDER BY id`);
  for (const campaign of campaigns as any[]) {
    await pool.request()
      .input('id', campaign.id)
      .input('name', campaign.name)
      .input('description', campaign.description)
      .input('client_id', campaign.client_id)
      .input('is_active', campaign.is_active ? 1 : 0)
      .input('created_at', campaign.created_at)
      .query(`
        SET IDENTITY_INSERT campaigns ON;
        INSERT INTO campaigns (id, name, description, client_id, is_active, created_at) 
        VALUES (@id, @name, @description, @client_id, @is_active, @created_at);
        SET IDENTITY_INSERT campaigns OFF;
      `);
  }

  // 8. Migrar campaign_tasks
  console.log('🎯 Migrando tarefas de campanha...');
  const campaignTasks = await db.execute(`SELECT * FROM campaign_tasks ORDER BY id`);
  for (const ct of campaignTasks as any[]) {
    await pool.request()
      .input('id', ct.id)
      .input('campaign_id', ct.campaign_id)
      .input('task_type_id', ct.task_type_id)
      .input('name', ct.name)
      .input('description', ct.description)
      .input('is_active', ct.is_active ? 1 : 0)
      .input('created_at', ct.created_at)
      .query(`
        SET IDENTITY_INSERT campaign_tasks ON;
        INSERT INTO campaign_tasks (id, campaign_id, task_type_id, name, description, is_active, created_at) 
        VALUES (@id, @campaign_id, @task_type_id, @name, @description, @is_active, @created_at);
        SET IDENTITY_INSERT campaign_tasks OFF;
      `);
  }

  // 9. Migrar campaign_users
  console.log('👥📢 Migrando usuários de campanha...');
  const campaignUsers = await db.execute(`SELECT * FROM campaign_users ORDER BY id`);
  for (const cu of campaignUsers as any[]) {
    await pool.request()
      .input('id', cu.id)
      .input('campaign_id', cu.campaign_id)
      .input('user_id', cu.user_id)
      .input('created_at', cu.created_at)
      .query(`
        SET IDENTITY_INSERT campaign_users ON;
        INSERT INTO campaign_users (id, campaign_id, user_id, created_at) 
        VALUES (@id, @campaign_id, @user_id, @created_at);
        SET IDENTITY_INSERT campaign_users OFF;
      `);
  }

  // 10. Migrar time_entries
  console.log('⏰ Migrando entradas de tempo...');
  const timeEntries = await db.execute(`SELECT * FROM time_entries ORDER BY id`);
  for (const te of timeEntries as any[]) {
    await pool.request()
      .input('id', te.id)
      .input('user_id', te.user_id)
      .input('campaign_id', te.campaign_id)
      .input('campaign_task_id', te.campaign_task_id)
      .input('date', te.date)
      .input('start_time', te.start_time)
      .input('end_time', te.end_time)
      .input('total_minutes', te.total_minutes)
      .input('description', te.description)
      .input('status', te.status)
      .input('is_billable', te.is_billable ? 1 : 0)
      .input('created_at', te.created_at)
      .input('updated_at', te.updated_at)
      .query(`
        SET IDENTITY_INSERT time_entries ON;
        INSERT INTO time_entries (id, user_id, campaign_id, campaign_task_id, date, start_time, end_time, total_minutes, description, status, is_billable, created_at, updated_at) 
        VALUES (@id, @user_id, @campaign_id, @campaign_task_id, @date, @start_time, @end_time, @total_minutes, @description, @status, @is_billable, @created_at, @updated_at);
        SET IDENTITY_INSERT time_entries OFF;
      `);
  }

  console.log('✅ Migração de dados concluída com sucesso!');
}

async function verifyMigration() {
  console.log('🔍 Verificando migração...');
  
  const pool = await getMssql();
  
  const result = await pool.request().query(`
    SELECT 
      'users' as table_name, COUNT(*) as count FROM users
    UNION ALL SELECT 'clients', COUNT(*) FROM clients
    UNION ALL SELECT 'campaigns', COUNT(*) FROM campaigns  
    UNION ALL SELECT 'time_entries', COUNT(*) FROM time_entries
    ORDER BY table_name
  `);
  
  console.log('📊 Contagem de registros migrados:');
  result.recordset.forEach(row => {
    console.log(`  ${row.table_name}: ${row.count} registros`);
  });

  // Testar login de um usuário específico
  const testUser = await pool.request()
    .input('email', 'roberto@tractionfy.com')
    .query('SELECT email, first_name, last_name, role FROM users WHERE email = @email');
  
  if (testUser.recordset.length > 0) {
    console.log('✅ Usuário de teste encontrado:', testUser.recordset[0]);
  } else {
    console.log('⚠️  Usuário de teste não encontrado');
  }
}

async function main() {
  try {
    console.log('🚀 Iniciando migração completa para SQL Server...');
    
    await createTablesInSQLServer();
    await migrateData();
    await verifyMigration();
    
    console.log('🎉 Migração concluída com sucesso!');
    console.log('💡 Todas as senhas foram hasheadas adequadamente para segurança.');
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    throw error;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main().catch(console.error);
}

export { main as migrateToSQLServer };