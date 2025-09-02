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

// Test connection function
export async function testMariaDBConnection() {
  let connection;
  try {
    console.log('🔄 Attempting to connect to MariaDB...');
    console.log(`Host: ${mariadbConfig.host}:${mariadbConfig.port}`);
    console.log(`Database: ${mariadbConfig.database}`);
    console.log(`User: ${mariadbConfig.user}`);
    
    connection = await createConnection(mariadbConfig);
    console.log('✅ MariaDB connection successful');
    
    // Test a simple query
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ Test query successful:', rows);
    
    // Show database tables
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('📋 Available tables:', tables);
    
    return {
      success: true,
      message: 'MariaDB connection successful',
      tables: tables
    };
  } catch (error) {
    console.error('❌ MariaDB connection failed:', error);
    return {
      success: false,
      message: 'MariaDB connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}