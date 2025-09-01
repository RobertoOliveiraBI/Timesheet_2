import sql from 'mssql';

const config = {
  server: 'sql-prod-tractionfy.database.windows.net',
  database: 'plataforma-tractionfy',
  user: 'roberto',
  password: 'Sf544344$wedf',
  options: {
    encrypt: true,
    trustServerCertificate: false,
  },
  port: 1433,
};

async function verificarTabelas() {
  try {
    console.log('🔌 Conectando ao SQL Server...');
    const pool = await sql.connect(config);
    
    const result = await pool.request().query(`
      SELECT 
        s.name as schema_name,
        t.name as table_name,
        COUNT(c.column_id) as column_count
      FROM sys.tables t
      JOIN sys.schemas s ON t.schema_id = s.schema_id
      LEFT JOIN sys.columns c ON t.object_id = c.object_id
      WHERE s.name = 'TMS'
      GROUP BY s.name, t.name
      ORDER BY t.name
    `);
    
    console.log('\n📊 TABELAS CRIADAS NO SCHEMA TMS:');
    console.table(result.recordset);
    
    console.log(`\n✅ TOTAL: ${result.recordset.length} tabelas criadas com sucesso!`);
    
    await pool.close();
    console.log('\n🎉 Verificação concluída!');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

verificarTabelas();