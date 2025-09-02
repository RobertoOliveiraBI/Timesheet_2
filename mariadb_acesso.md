# Documentação MariaDB - Tractionfy Timesheet

## Informações de Conexão

### Credenciais do Banco
- **Host**: tractionfy.com
- **Porta**: 3306
- **Banco de Dados**: traction_timesheet
- **Usuário**: traction_user_timesheet
- **Senha**: !Qaz@Wsx#Edc741
- **Charset**: latin1
- **Timeout de Conexão**: 10000ms

### String de Conexão
```
mysql://traction_user_timesheet:!Qaz@Wsx#Edc741@tractionfy.com:3306/traction_timesheet
```

## Estrutura do Banco de Dados

### Tabelas Principais

#### 1. **users** - Usuários do Sistema
```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    profile_image_url TEXT,
    role ENUM('MASTER', 'ADMIN', 'GESTOR', 'COLABORADOR') DEFAULT 'COLABORADOR',
    position VARCHAR(255),
    is_manager BOOLEAN DEFAULT FALSE,
    manager_id INT,
    contract_type ENUM('CLT', 'PJ'),
    cost_center_id INT,
    department_id INT,
    contract_start_date DATE,
    contract_end_date DATE,
    contract_value DECIMAL(10,2),
    company_name VARCHAR(255),
    cnpj VARCHAR(18),
    monthly_cost DECIMAL(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (manager_id) REFERENCES users(id),
    FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id),
    FOREIGN KEY (department_id) REFERENCES departments(id)
);
```

#### 2. **departments** - Departamentos
```sql
CREATE TABLE departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### 3. **cost_centers** - Centros de Custo
```sql
CREATE TABLE cost_centers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### 4. **economic_groups** - Grupos Econômicos
```sql
CREATE TABLE economic_groups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### 5. **clients** - Clientes
```sql
CREATE TABLE clients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    cnpj VARCHAR(18),
    email VARCHAR(255),
    economic_group_id INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (economic_group_id) REFERENCES economic_groups(id)
);
```

#### 6. **campaigns** - Campanhas
```sql
CREATE TABLE campaigns (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    client_id INT,
    start_date DATE,
    end_date DATE,
    budget DECIMAL(12,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id)
);
```

#### 7. **task_types** - Tipos de Tarefa
```sql
CREATE TABLE task_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    hourly_rate DECIMAL(8,2),
    is_billable BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### 8. **campaign_tasks** - Tarefas de Campanha
```sql
CREATE TABLE campaign_tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    campaign_id INT NOT NULL,
    task_type_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    estimated_hours DECIMAL(8,2),
    hourly_rate DECIMAL(8,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
    FOREIGN KEY (task_type_id) REFERENCES task_types(id)
);
```

#### 9. **time_entries** - Lançamentos de Tempo
```sql
CREATE TABLE time_entries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    campaign_task_id INT NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    total_hours DECIMAL(4,2) NOT NULL,
    description TEXT,
    is_billable BOOLEAN DEFAULT TRUE,
    status ENUM('RASCUNHO', 'SALVO', 'VALIDACAO', 'APROVADO', 'REJEITADO') DEFAULT 'RASCUNHO',
    approved_by INT,
    approved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (campaign_task_id) REFERENCES campaign_tasks(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);
```

#### 10. **time_entry_comments** - Comentários nos Lançamentos
```sql
CREATE TABLE time_entry_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    time_entry_id INT NOT NULL,
    user_id INT NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (time_entry_id) REFERENCES time_entries(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### 11. **campaign_costs** - Custos de Campanha
```sql
CREATE TABLE campaign_costs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    campaign_id INT NOT NULL,
    cost_category_id INT NOT NULL,
    description VARCHAR(255) NOT NULL,
    cost_value DECIMAL(12,2) NOT NULL,
    cost_date DATE NOT NULL,
    supplier VARCHAR(255),
    invoice_number VARCHAR(100),
    notes TEXT,
    created_by INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
    FOREIGN KEY (cost_category_id) REFERENCES cost_categories(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);
```

#### 12. **cost_categories** - Categorias de Custo
```sql
CREATE TABLE cost_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### 13. **system_config** - Configurações do Sistema
```sql
CREATE TABLE system_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(255) UNIQUE NOT NULL,
    config_value TEXT,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### 14. **sessions** - Sessões de Usuário
```sql
CREATE TABLE sessions (
    session_id VARCHAR(255) PRIMARY KEY,
    expires TIMESTAMP NOT NULL,
    data TEXT
);
```

## Dados Atuais do Sistema

### Contadores por Tabela
- **users**: 46 usuários
- **departments**: 11 departamentos
- **cost_centers**: 3 centros de custo
- **economic_groups**: 1 grupo ("Não Informado")
- **clients**: Múltiplos clientes ativos
- **campaigns**: 2 campanhas ativas
- **task_types**: Vários tipos de tarefa
- **campaign_tasks**: Tarefas vinculadas às campanhas
- **time_entries**: Lançamentos de tempo dos usuários

### Usuários por Perfil
- **MASTER**: 2 usuários
- **ADMIN**: 0 usuários  
- **GESTOR**: 12 usuários
- **COLABORADOR**: 32 usuários

### Relacionamentos Hierárquicos
- Todos os 32 colaboradores têm gestores definidos
- 12 gestores sem manager_id (diretores/coordenadores)
- Estrutura organizacional completa

## Comandos SQL Úteis

### Verificar Conexão
```sql
SELECT 'Conexão estabelecida' as status, NOW() as timestamp;
```

### Listar Todas as Tabelas
```sql
SHOW TABLES;
```

### Verificar Estrutura de uma Tabela
```sql
DESCRIBE users;
```

### Contar Registros por Tabela
```sql
SELECT 
    'users' as tabela, COUNT(*) as registros FROM users
UNION ALL
SELECT 
    'campaigns' as tabela, COUNT(*) as registros FROM campaigns
UNION ALL
SELECT 
    'time_entries' as tabela, COUNT(*) as registros FROM time_entries;
```

### Verificar Relacionamentos Manager-Subordinado
```sql
SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.role,
    m.email as manager_email,
    m.first_name as manager_name
FROM users u
LEFT JOIN users m ON u.manager_id = m.id
WHERE u.role = 'COLABORADOR'
ORDER BY u.id;
```

### Backup de uma Tabela
```sql
-- Exemplo para exportar usuários
SELECT * FROM users 
INTO OUTFILE '/tmp/users_backup.csv'
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n';
```

## Configuração de Charset

O banco utiliza charset `latin1` para compatibilidade. Comandos para verificar:

```sql
-- Verificar charset do banco
SELECT @@character_set_database;

-- Verificar charset de uma tabela
SHOW CREATE TABLE users;

-- Alterar charset se necessário (cuidado!)
ALTER TABLE users CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## Foreign Keys e Constraints

### Principais Relacionamentos
1. **users.manager_id** → **users.id** (auto-referência hierárquica)
2. **users.department_id** → **departments.id**
3. **users.cost_center_id** → **cost_centers.id**
4. **clients.economic_group_id** → **economic_groups.id**
5. **campaigns.client_id** → **clients.id**
6. **campaign_tasks.campaign_id** → **campaigns.id**
7. **campaign_tasks.task_type_id** → **task_types.id**
8. **time_entries.user_id** → **users.id**
9. **time_entries.campaign_task_id** → **campaign_tasks.id**

### Verificar Foreign Keys
```sql
SELECT 
    CONSTRAINT_NAME,
    TABLE_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'traction_timesheet'
AND REFERENCED_TABLE_NAME IS NOT NULL;
```

## Migração de Dados

### Última Migração Realizada
- **Data**: 2025-09-02
- **Origem**: PostgreSQL (Neon)
- **Destino**: MariaDB (tractionfy.com)
- **Status**: ✅ Completa
- **Registros migrados**: 46 usuários com relacionamentos hierárquicos

### Scripts de Migração Utilizados
- `restore-users-hierarchical.js` - Migração respeitando hierarquia
- `fix-managers.js` - Correção dos relacionamentos manager-subordinado
- Backup de referência: `backups/users-2025-09.csv`

## Monitoramento e Manutenção

### Verificações Diárias Recomendadas
```sql
-- Verificar usuários ativos
SELECT role, COUNT(*) as total, SUM(is_active) as ativos 
FROM users GROUP BY role;

-- Verificar lançamentos recentes
SELECT DATE(created_at) as data, COUNT(*) as lancamentos
FROM time_entries 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY DATE(created_at)
ORDER BY data DESC;

-- Verificar campanhas ativas
SELECT COUNT(*) as campanhas_ativas FROM campaigns WHERE is_active = 1;
```

### Backup Automático
O sistema possui backups mensais automáticos localizados em `backups/` com formato:
- `users-YYYY-MM.csv`
- `campaigns-YYYY-MM.csv`
- `time_entries-YYYY-MM.csv`
- etc.

---

**Última atualização**: 2025-09-02
**Responsável**: Sistema Tractionfy Timesheet
**Versão do documento**: 1.0