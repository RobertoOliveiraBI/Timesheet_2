-- Script de verificação pós-migração
-- Execute este script no banco DESTINO após a migração

SELECT 'users' as table_name, COUNT(*) as records FROM users
UNION ALL
SELECT 'clients', COUNT(*) FROM clients  
UNION ALL
SELECT 'campaigns', COUNT(*) FROM campaigns
UNION ALL
SELECT 'time_entries', COUNT(*) FROM time_entries
UNION ALL
SELECT 'Total', COUNT(*) FROM (
  SELECT 1 FROM users UNION ALL
  SELECT 1 FROM clients UNION ALL  
  SELECT 1 FROM campaigns UNION ALL
  SELECT 1 FROM time_entries
) as total;
