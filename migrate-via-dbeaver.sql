-- MIGRAÇÃO MANUAL VIA DBEAVER
-- Execute este script no DBeaver conectado ao banco destino (95.111.233.250:5432/timesheet)

-- 1. LIMPAR TABELA DE TESTE PRIMEIRO
DROP TABLE IF EXISTS teste;

-- 2. EXECUTAR O BACKUP COMPLETO
-- Copie e cole o conteúdo do arquivo: backup_migration/full_backup_20250902_183912.sql

-- 3. VERIFICAÇÃO FINAL
-- Após executar o backup, execute estas queries para verificar:

-- Contar registros por tabela
SELECT 'users' as tabela, COUNT(*) as registros FROM users
UNION ALL
SELECT 'clients', COUNT(*) FROM clients  
UNION ALL
SELECT 'campaigns', COUNT(*) FROM campaigns
UNION ALL
SELECT 'time_entries', COUNT(*) FROM time_entries
UNION ALL
SELECT 'departments', COUNT(*) FROM departments
UNION ALL
SELECT 'cost_centers', COUNT(*) FROM cost_centers
UNION ALL
SELECT 'task_types', COUNT(*) FROM task_types
UNION ALL
SELECT 'cost_categories', COUNT(*) FROM cost_categories
UNION ALL
SELECT 'campaign_tasks', COUNT(*) FROM campaign_tasks
UNION ALL
SELECT 'sessions', COUNT(*) FROM sessions
UNION ALL  
SELECT 'system_config', COUNT(*) FROM system_config
UNION ALL
SELECT 'campaign_costs', COUNT(*) FROM campaign_costs
UNION ALL
SELECT 'economic_groups', COUNT(*) FROM economic_groups
UNION ALL
SELECT 'campaign_users', COUNT(*) FROM campaign_users
UNION ALL
SELECT 'time_entry_comments', COUNT(*) FROM time_entry_comments
UNION ALL
SELECT 'time_entries_backup', COUNT(*) FROM time_entries_backup
ORDER BY registros DESC;

-- 4. VERIFICAR INTEGRIDADE DOS DADOS PRINCIPAIS
SELECT 'Usuário principal' as verificacao, email, first_name, role 
FROM users WHERE id = 1;

SELECT 'Primeiro cliente' as verificacao, company_name, trade_name, cnpj
FROM clients LIMIT 1;

SELECT 'Campanhas' as verificacao, name, description
FROM campaigns;

-- 5. RESULTADO ESPERADO:
-- users: 46 registros
-- clients: 23 registros  
-- campaigns: 2 registros
-- time_entries: 1 registro
-- departments: 13 registros
-- cost_centers: 3 registros
-- task_types: 13 registros
-- cost_categories: 41 registros
-- campaign_tasks: 5 registros
-- sessions: 7 registros
-- system_config: 4 registros
-- campaign_costs: 3 registros
-- economic_groups: 1 registro
-- campaign_users: 0 registros
-- time_entry_comments: 0 registros  
-- time_entries_backup: 0 registros

-- TOTAL ESPERADO: 162 registros