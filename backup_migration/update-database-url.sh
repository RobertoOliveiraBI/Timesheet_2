#!/bin/bash
# Script para atualizar DATABASE_URL no Replit
# Execute este script quando o novo banco estiver disponível

echo "🔄 Atualizando DATABASE_URL..."
echo "⚠️  ATENÇÃO: Este script irá alterar a conexão do banco de dados"
echo "📋 Banco atual: $DATABASE_URL"
echo "📋 Novo banco: postgres://roberto:Sf544344$wedf@tool_tractionfy_tms:5432/timesheet?sslmode=disable"
echo ""
read -p "Deseja continuar? (digite 'CONFIRMO' para prosseguir): " confirmation

if [ "$confirmation" = "CONFIRMO" ]; then
  echo "🔧 Atualizando variável DATABASE_URL..."
  export DATABASE_URL="postgres://roberto:Sf544344$wedf@tool_tractionfy_tms:5432/timesheet?sslmode=disable"
  echo "✅ DATABASE_URL atualizada!"
  echo "🔄 Reinicie o servidor para aplicar as mudanças"
  echo "⚡ Execute: npm run dev"
else
  echo "❌ Operação cancelada"
  exit 1
fi
