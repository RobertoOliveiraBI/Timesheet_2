-- Script de criação do schema no banco de destino
-- Gerado em: 2025-09-02T18:55:18.623Z

-- Este script deve ser executado no banco destino ANTES da migração de dados

-- Criar database se não existir
CREATE DATABASE IF NOT EXISTS timesheet;
\c timesheet;

-- Criar usuário se não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'roberto') THEN
    CREATE USER roberto WITH PASSWORD 'Sf544344$wedf';
  END IF;
END
$$;

-- Dar permissões
GRANT ALL PRIVILEGES ON DATABASE timesheet TO roberto;
GRANT ALL ON SCHEMA public TO roberto;

-- Copiar schema do backup
\i full_backup_20250902_183912.sql
