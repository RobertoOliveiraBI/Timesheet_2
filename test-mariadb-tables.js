// Script simples para testar a criação das tabelas MariaDB
import { createMariaDBTables } from './server/create-mariadb-tables.ts';

console.log('🔄 Iniciando criação das tabelas MariaDB...');

createMariaDBTables()
  .then(result => {
    console.log('📋 Resultado:', JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Erro:', error);
    process.exit(1);
  });