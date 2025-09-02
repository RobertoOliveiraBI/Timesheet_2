// Script para executar a migração de dados PostgreSQL → MariaDB
import { migrateDataFromPostgresToMariaDB } from './server/migrate-data-postgres-to-mariadb.ts';

console.log('🚀 Iniciando migração PostgreSQL → MariaDB...');

migrateDataFromPostgresToMariaDB()
  .then(result => {
    console.log('📋 Resultado final:', JSON.stringify(result, null, 2));
    if (result.success) {
      console.log('🎉 Migração concluída com sucesso!');
    } else {
      console.log('❌ Migração falhou!');
    }
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Erro crítico durante migração:', error);
    process.exit(1);
  });