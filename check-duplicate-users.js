// Script para verificar usuários duplicados no PostgreSQL
import { db } from './server/db.ts';
import { users } from './shared/schema.ts';
import { sql } from 'drizzle-orm';

async function checkDuplicateUsers() {
  try {
    console.log('🔄 Verificando usuários duplicados no PostgreSQL...');
    
    // Query para encontrar emails duplicados
    const duplicateEmails = await db
      .select({
        email: users.email,
        count: sql`COUNT(*)`.as('count')
      })
      .from(users)
      .groupBy(users.email)
      .having(sql`COUNT(*) > 1`);
    
    console.log('📊 Emails duplicados encontrados:', duplicateEmails.length);
    
    if (duplicateEmails.length > 0) {
      console.table(duplicateEmails);
      
      // Para cada email duplicado, mostrar os detalhes dos usuários
      for (const duplicate of duplicateEmails) {
        console.log(`\n📋 Detalhes dos usuários com email: ${duplicate.email}`);
        
        const duplicateUsers = await db
          .select({
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
            role: users.role,
            isActive: users.isActive,
            createdAt: users.createdAt
          })
          .from(users)
          .where(sql`${users.email} = ${duplicate.email}`);
        
        console.table(duplicateUsers);
      }
    } else {
      console.log('✅ Nenhum email duplicado encontrado no PostgreSQL');
    }
    
    // Verificar também total de usuários
    const totalUsers = await db
      .select({
        total: sql`COUNT(*)`.as('total')
      })
      .from(users);
    
    console.log(`\n📊 Total de usuários no PostgreSQL: ${totalUsers[0].total}`);
    
    // Verificar usuários únicos por email
    const uniqueEmails = await db
      .select({
        uniqueEmails: sql`COUNT(DISTINCT ${users.email})`.as('uniqueEmails')
      })
      .from(users);
    
    console.log(`📊 Total de emails únicos: ${uniqueEmails[0].uniqueEmails}`);
    
  } catch (error) {
    console.error('❌ Erro ao verificar usuários duplicados:', error);
  }
}

checkDuplicateUsers();