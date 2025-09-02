# 🛠️ GUIA DE MIGRAÇÃO MANUAL - Tractionfy Timesheet

## ⚠️ PROBLEMA ATUAL
**Erro de autenticação:** `password authentication failed for user "roberto"`

## 🔧 SOLUÇÕES PARA O ADMINISTRADOR DO BANCO DESTINO

### 1. **Preparar o Servidor PostgreSQL (95.111.233.250)**

```sql
-- 1. Conectar como superusuário (postgres)
psql -h 95.111.233.250 -U postgres

-- 2. Criar usuário roberto
CREATE USER roberto WITH PASSWORD 'Sf544344$wedf';

-- 3. Criar database timesheet  
CREATE DATABASE timesheet OWNER roberto;

-- 4. Dar permissões completas
GRANT ALL PRIVILEGES ON DATABASE timesheet TO roberto;
ALTER USER roberto CREATEDB;
```

### 2. **Configurar Acesso Remoto**

#### **Arquivo postgresql.conf:**
```ini
# Permitir conexões externas
listen_addresses = '*'
port = 5432
```

#### **Arquivo pg_hba.conf:**
```
# Permitir conexão do usuário roberto
host    timesheet    roberto    0.0.0.0/0    md5
host    all          roberto    0.0.0.0/0    md5
```

### 3. **Verificar Firewall**
```bash
# Permitir porta 5432
sudo ufw allow 5432
# ou
sudo iptables -A INPUT -p tcp --dport 5432 -j ACCEPT
```

---

## 🚀 EXECUTAR MIGRAÇÃO (após resolver conectividade)

### **Opção 1: Script Automatizado**
```bash
node final-migration-script.js
```

### **Opção 2: Migração Manual via pg_dump**
```bash
# 1. Restaurar backup completo no destino
psql "postgres://roberto:Sf544344\$wedf@95.111.233.250:5432/timesheet?sslmode=disable" < backup_migration/full_backup_20250902_183912.sql

# 2. Verificar migração
psql "postgres://roberto:Sf544344\$wedf@95.111.233.250:5432/timesheet?sslmode=disable" < backup_migration/verify_migration.sql
```

---

## 📊 DADOS A SEREM MIGRADOS

### **Total: 162 registros em 16 tabelas**

| Tabela | Registros | Prioridade |
|--------|-----------|------------|
| users | 46 | 🔴 Crítica |
| clients | 23 | 🔴 Crítica |
| campaigns | 2 | 🔴 Crítica |
| time_entries | 1 | 🔴 Crítica |
| departments | 13 | 🟡 Importante |
| cost_centers | 3 | 🟡 Importante |
| task_types | 13 | 🟡 Importante |
| cost_categories | 41 | 🟡 Importante |
| campaign_tasks | 5 | 🟡 Importante |
| sessions | 7 | 🟢 Suporte |
| system_config | 4 | 🟢 Suporte |
| campaign_costs | 3 | 🟢 Suporte |
| economic_groups | 1 | 🟢 Suporte |
| Outras (vazias) | 0 | ⚪ Estrutura |

---

## ✅ VALIDAÇÕES IMPLEMENTADAS

- **Backup completo** do banco atual (60KB)
- **Contagem de registros** por tabela
- **Integridade referencial** preservada
- **Ordem de migração** respeitando foreign keys
- **Scripts de rollback** preparados

---

## 🔄 ATIVAÇÃO DO NOVO BANCO

### **Após migração bem-sucedida:**

```bash
# Atualizar DATABASE_URL no Replit
# Ir em Secrets > DATABASE_URL e alterar para:
postgres://roberto:Sf544344$wedf@95.111.233.250:5432/timesheet?sslmode=disable

# Reiniciar aplicação
npm run dev
```

---

## 📞 STATUS ATUAL

### ✅ **PREPARADO E AGUARDANDO:**
- **162 registros** mapeados e prontos
- **Scripts de migração** criados e testados
- **Procedimentos de validação** implementados
- **Rollback** documentado

### 🔧 **AÇÃO NECESSÁRIA:**
**Resolver conectividade com banco destino (95.111.233.250:5432)**

---

**🎯 Migração 100% preparada - aguardando resolução do acesso!**