import { createConnection } from 'mysql2/promise';

// MariaDB connection configuration
const mariadbConfig = {
  host: 'tractionfy.com',
  port: 3306,
  database: 'traction_timesheet',
  user: 'traction_user_timesheet',
  password: '!Qaz@Wsx#Edc741',
  charset: 'latin1',
  connectTimeout: 10000,
  acquireTimeout: 10000,
  timeout: 10000
};

// SQL para criar as tabelas no MariaDB (convertendo do PostgreSQL)
const createTablesSQL = [
  // 1. Sessions (para autenticação)
  `CREATE TABLE IF NOT EXISTS sessions (
    sid VARCHAR(255) PRIMARY KEY,
    sess JSON NOT NULL,
    expire TIMESTAMP NOT NULL,
    INDEX IDX_session_expire (expire)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 2. Departments
  `CREATE TABLE IF NOT EXISTS departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 3. Cost Centers
  `CREATE TABLE IF NOT EXISTS cost_centers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 4. Economic Groups
  `CREATE TABLE IF NOT EXISTS economic_groups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 5. Clients
  `CREATE TABLE IF NOT EXISTS clients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    cnpj VARCHAR(18),
    email VARCHAR(255),
    economic_group_id INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (economic_group_id) REFERENCES economic_groups(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 6. Users
  `CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    profile_image_url VARCHAR(500),
    role ENUM('MASTER', 'ADMIN', 'GESTOR', 'COLABORADOR') NOT NULL DEFAULT 'COLABORADOR',
    position VARCHAR(255),
    is_manager BOOLEAN DEFAULT FALSE,
    manager_id INT,
    contract_type ENUM('CLT', 'PJ'),
    cost_center_id INT,
    department_id INT,
    contract_start_date DATE,
    contract_end_date DATE,
    contract_value DECIMAL(10, 2),
    company_name VARCHAR(255),
    cnpj VARCHAR(18),
    monthly_cost DECIMAL(10, 2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id),
    FOREIGN KEY (department_id) REFERENCES departments(id),
    FOREIGN KEY (manager_id) REFERENCES users(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 7. Campaigns
  `CREATE TABLE IF NOT EXISTS campaigns (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    contract_start_date DATE,
    contract_end_date DATE,
    contract_value DECIMAL(12, 2),
    client_id INT NOT NULL,
    cost_center_id INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 8. Campaign Users
  `CREATE TABLE IF NOT EXISTS campaign_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    campaign_id INT NOT NULL,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 9. Task Types
  `CREATE TABLE IF NOT EXISTS task_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3b82f6',
    is_billable BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 10. Campaign Tasks
  `CREATE TABLE IF NOT EXISTS campaign_tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    campaign_id INT NOT NULL,
    task_type_id INT NOT NULL,
    description TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
    FOREIGN KEY (task_type_id) REFERENCES task_types(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 11. Time Entries
  `CREATE TABLE IF NOT EXISTS time_entries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    date DATE NOT NULL,
    campaign_id INT NOT NULL,
    campaign_task_id INT NOT NULL,
    hours VARCHAR(10) NOT NULL,
    description TEXT,
    result_center VARCHAR(255) DEFAULT 'Todos',
    status ENUM('RASCUNHO', 'SALVO', 'VALIDACAO', 'APROVADO', 'REJEITADO') DEFAULT 'RASCUNHO',
    submitted_at TIMESTAMP NULL,
    reviewed_by INT,
    reviewed_at TIMESTAMP NULL,
    review_comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
    FOREIGN KEY (campaign_task_id) REFERENCES campaign_tasks(id),
    FOREIGN KEY (reviewed_by) REFERENCES users(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 12. Time Entry Comments
  `CREATE TABLE IF NOT EXISTS time_entry_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    time_entry_id INT NOT NULL,
    user_id INT NOT NULL,
    comment TEXT NOT NULL,
    comment_type ENUM('MANAGER_FEEDBACK', 'COLLABORATOR_RESPONSE') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (time_entry_id) REFERENCES time_entries(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_time_entry_comments_entry (time_entry_id),
    INDEX idx_time_entry_comments_user (user_id),
    INDEX idx_time_entry_comments_created (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 13. Cost Categories
  `CREATE TABLE IF NOT EXISTS cost_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 14. Campaign Costs
  `CREATE TABLE IF NOT EXISTS campaign_costs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    campaign_id INT NOT NULL,
    user_id INT NOT NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT,
    reference_month VARCHAR(7) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    notes TEXT,
    cnpj_fornecedor VARCHAR(18),
    razao_social VARCHAR(255),
    category_id INT,
    status ENUM('ATIVO', 'INATIVO') DEFAULT 'ATIVO',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    inactivated_at TIMESTAMP NULL,
    inactivated_by INT,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (category_id) REFERENCES cost_categories(id),
    FOREIGN KEY (inactivated_by) REFERENCES users(id),
    INDEX idx_campaign_costs_campaign (campaign_id),
    INDEX idx_campaign_costs_month (reference_month),
    INDEX idx_campaign_costs_status (status),
    INDEX idx_campaign_costs_user (user_id),
    INDEX idx_campaign_costs_category (category_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
];

export async function createMariaDBTables() {
  let connection;
  try {
    console.log('🔄 Conectando ao MariaDB...');
    connection = await createConnection(mariadbConfig);
    console.log('✅ Conectado ao MariaDB');
    
    console.log('🔄 Criando tabelas...');
    
    for (let i = 0; i < createTablesSQL.length; i++) {
      const sql = createTablesSQL[i];
      const tableName = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1];
      
      try {
        await connection.execute(sql);
        console.log(`✅ Tabela ${tableName} criada com sucesso`);
      } catch (error) {
        console.error(`❌ Erro ao criar tabela ${tableName}:`, error);
        throw error;
      }
    }
    
    // Verificar tabelas criadas
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('📋 Tabelas criadas:', tables);
    
    return {
      success: true,
      message: 'Todas as tabelas foram criadas com sucesso no MariaDB',
      tables: tables,
      totalTables: createTablesSQL.length
    };
    
  } catch (error) {
    console.error('❌ Erro ao criar tabelas:', error);
    return {
      success: false,
      message: 'Erro ao criar tabelas no MariaDB',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Principais diferenças tratadas entre PostgreSQL e MariaDB:
// 1. serial -> INT AUTO_INCREMENT
// 2. varchar() com enum -> ENUM()
// 3. text -> TEXT
// 4. timestamp com timezone -> TIMESTAMP
// 5. jsonb -> JSON
// 6. boolean -> BOOLEAN
// 7. decimal(precision, scale) -> DECIMAL(precision, scale)
// 8. date -> DATE
// 9. Índices adaptados para sintaxe MySQL
// 10. ENGINE=InnoDB para suporte a foreign keys
// 11. CHARSET=utf8mb4 para suporte completo a Unicode