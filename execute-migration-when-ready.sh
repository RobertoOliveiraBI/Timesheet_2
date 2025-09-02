#!/bin/bash
# Script para executar quando o banco estiver acessível
# MIGRAÇÃO COMPLETA - Tractionfy Timesheet

echo "🚀 EXECUTANDO MIGRAÇÃO COMPLETA"
echo "==============================="

# Definir variáveis
SOURCE_DB="$DATABASE_URL"
TARGET_DB="postgres://roberto:Sf544344\$wedf@95.111.233.250:5432/timesheet?sslmode=disable"

echo ""
echo "📊 Dados a migrar: 162 registros em 16 tabelas"
echo "🎯 Destino: 95.111.233.250:5432/timesheet"
echo ""

# Testar conexão
echo "🔍 Testando conexão com banco destino..."
if psql "$TARGET_DB" -c "SELECT current_database();" > /dev/null 2>&1; then
    echo "✅ Conexão OK! Iniciando migração..."
    
    # Executar migração via backup completo
    echo "📤 Restaurando backup completo..."
    psql "$TARGET_DB" < backup_migration/full_backup_20250902_183912.sql
    
    if [ $? -eq 0 ]; then
        echo "✅ Backup restaurado com sucesso!"
        
        # Verificar dados migrados
        echo "🔍 Verificando dados migrados..."
        psql "$TARGET_DB" < backup_migration/verify_migration.sql
        
        echo ""
        echo "🎉 MIGRAÇÃO CONCLUÍDA!"
        echo "✅ Para ativar o novo banco:"
        echo "   1. Vá em Secrets no Replit"  
        echo "   2. Altere DATABASE_URL para: $TARGET_DB"
        echo "   3. Reinicie: npm run dev"
        echo ""
        echo "🔄 Para rollback (se necessário):"
        echo "   DATABASE_URL=$SOURCE_DB"
        
    else
        echo "❌ Erro na restauração do backup"
        exit 1
    fi
    
else
    echo "❌ Não foi possível conectar ao banco destino"
    echo ""
    echo "🔧 PRÓXIMOS PASSOS:"
    echo "1. Verificar se o usuário 'roberto' existe no servidor"
    echo "2. Confirmar senha: Sf544344\$wedf"  
    echo "3. Criar database 'timesheet' se necessário"
    echo "4. Configurar pg_hba.conf para permitir conexões externas"
    echo ""
    echo "📋 Teste manual:"
    echo "psql -h 95.111.233.250 -U roberto -d timesheet"
    exit 1
fi