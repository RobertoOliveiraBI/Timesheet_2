# 🔍 DIAGNÓSTICO: Por que DBeaver funciona mas Node.js não?

## ✅ **FUNCIONA:**
- **DBeaver** conecta perfeitamente
- **Tabela teste** visível e acessível
- **JDBC URL:** `jdbc:postgresql://95.111.233.250:5432/timesheet?sslmode=disable`

## ❌ **NÃO FUNCIONA:**
- **Node.js pg** → `password authentication failed`
- **psql** → `password authentication failed`
- **Todas as variações** de escape falharam

## 🧐 **POSSÍVEIS CAUSAS:**

### 1. **Método de Autenticação Diferente**
- DBeaver pode usar **JDBC driver** com autenticação específica
- psql/Node.js usam **libpq** (biblioteca PostgreSQL padrão)
- Servidor pode estar configurado diferente para cada método

### 2. **Configuração pg_hba.conf**
- Servidor pode aceitar conexões JDBC mas rejeitar libpq
- Diferentes métodos de autenticação por tipo de cliente

### 3. **Versão do Driver**
- DBeaver usa driver JDBC específico
- Node.js/psql usam versões diferentes do cliente PostgreSQL

## 🔧 **SOLUÇÕES PARA TESTAR:**

### **No Servidor PostgreSQL (95.111.233.250):**

1. **Verificar pg_hba.conf:**
```
# Permitir diferentes tipos de conexão
host    timesheet    roberto    0.0.0.0/0    md5
host    timesheet    roberto    0.0.0.0/0    scram-sha-256
host    timesheet    roberto    0.0.0.0/0    trust
```

2. **Verificar se usuário existe com senha correta:**
```sql
-- No servidor
SELECT usename, passwd FROM pg_shadow WHERE usename = 'roberto';
```

3. **Recriar usuário forçando método:**
```sql
DROP USER IF EXISTS roberto;
CREATE USER roberto WITH PASSWORD 'Sf544344$wedf';
ALTER USER roberto WITH ENCRYPTED PASSWORD 'Sf544344$wedf';
```

### **Alternativas:**

1. **Usar conexão via JDBC no Node.js** (através de wrapper)
2. **Configurar tunnel SSH** se DBeaver estiver usando
3. **Usar proxy/gateway** que aceite ambos os tipos de conexão

---

## 🎯 **PRÓXIMOS PASSOS:**
1. Verificar configuração do servidor PostgreSQL
2. Testar se DBeaver usa algum método especial de conexão
3. Configurar servidor para aceitar conexões libpq também