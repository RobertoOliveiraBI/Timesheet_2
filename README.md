# Tractionfy Timesheet - Sistema de Gestão de Horas

## 📋 Visão Geral

O **Tractionfy Timesheet** é um sistema SaaS completo de gestão de horas desenvolvido especificamente para agências de marketing. O sistema permite o controle preciso de horas trabalhadas, gestão de clientes e campanhas, e workflows de aprovação com diferentes níveis de acesso baseados em roles.

### Status Atual
- ✅ Sistema de autenticação completo (email/senha)
- ✅ Formulário de timesheet semanal com seleção hierárquica (Cliente → Campanha → Tarefa)
- ✅ Workflow de status: RASCUNHO → SALVO → VALIDACAO → APROVADO → REJEITADO
- ✅ Interface de aprovação para gestores e administradores
- ✅ Painel administrativo completo
- ✅ Controle de acesso baseado em roles (MASTER, ADMIN, GESTOR, COLABORADOR)
- ✅ **RESOLVIDO**: Select de clientes agora popula corretamente

## 🏗️ Arquitetura Técnica

### Frontend
- **Framework**: React 18 com TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Roteamento**: Wouter
- **State Management**: TanStack Query (React Query) para estado de servidor
- **Build**: Vite para desenvolvimento e produção

### Backend
- **Runtime**: Node.js com Express.js
- **ORM**: Drizzle ORM
- **Banco de Dados**: PostgreSQL (Neon Serverless)
- **Autenticação**: Sistema duplo (Replit OIDC + Email/Senha)
- **Sessões**: PostgreSQL com connect-pg-simple

### Estrutura de Diretórios
```
├── client/src/
│   ├── components/       # Componentes React
│   ├── pages/           # Páginas da aplicação
│   ├── hooks/           # Custom hooks
│   └── lib/             # Utilitários
├── server/              # Backend Express
├── shared/              # Schemas compartilhados (Drizzle/Zod)
└── attached_assets/     # Assets fornecidos pelo usuário
```

## 🔐 Sistema de Autenticação

### Roles de Usuário
- **MASTER**: Acesso total ao sistema (super admin)
- **ADMIN**: Gestão de usuários, relatórios, fechamento mensal
- **GESTOR**: Gestão de time, aprovações, relatórios de equipe
- **COLABORADOR**: Entrada de horas pessoais e visualização

### Credenciais de Teste
- **Colaborador**: roberto@cappei.com / 123mudar
- **Master**: roberto@tractionfy.com / 123mudar
- **Admin**: luciano@tractionfy.com / 123mudar

## 📊 Modelo de Dados

### Entidades Principais
- **users**: Perfis de usuário com detalhes contratuais e hierarquia
- **economic_groups**: Estrutura organizacional para agrupar clientes
- **clients**: Entidades cliente individuais
- **campaigns**: Containers de projeto com atribuições de usuário
- **campaign_tasks**: Tarefas específicas dentro de campanhas
- **time_entries**: Dados centrais de timesheet com workflows de aprovação
- **task_types**: Categorias de atividade configuráveis

### Status de Time Entries
```
RASCUNHO → SALVO → VALIDACAO → APROVADO
                              ↓
                          REJEITADO
```

## 🔧 APIs e Endpoints

### Endpoints de Autenticação
- `POST /api/login` - Login com email/senha
- `GET /api/user` - Dados do usuário atual
- `POST /api/logout` - Logout

### Endpoints de Dados
- `GET /api/clientes` - Lista clientes (ativo)
- `GET /api/campaigns` - Lista campanhas (filtrado por role)
- `GET /api/campaign-tasks` - Lista tarefas de campanha
- `GET /api/economic-groups` - Lista grupos econômicos
- `GET /api/task-types` - Lista tipos de tarefa

### Endpoints de Gestão (Admin/Master)
- `POST /api/clientes` - Criar cliente
- `POST /api/campaigns` - Criar campanha
- `POST /api/users` - Criar usuário
- `PATCH /api/campaigns/:id` - Atualizar campanha
- `POST /api/admin/clear-data` - Limpar dados de teste (requer confirmação por senha)

## ✅ Problema Resolvido: Select de Clientes

### Solução Implementada
**Duas correções foram necessárias:**
1. **Padronização de endpoints**: Frontend e backend agora usam `/api/clientes` ✅
2. **Correção de credenciais**: Hash da senha do colaborador estava corrompido ✅

### Problema Identificado
- **Usuário Master**: Funcionava corretamente (senha hash válida)
- **Usuário Colaborador**: Falha na autenticação (senha hash corrompida)
- **Endpoint**: Inconsistência entre `/api/clients` (backend) e `/api/clientes` (frontend)

### Alterações Realizadas
- **Backend**: `server/routes.ts` - Endpoint padronizado para `/api/clientes`
- **Banco**: Hash da senha do colaborador roberto@cappei.com corrigido
- **Testes**: Confirmado que colaboradores agora acessam a API corretamente

### Dados no Banco (4 clientes ativos)
```json
[
  {"companyName": "Cappei Marketing LTDA", "tradeName": "Cappei"},
  {"companyName": "Cliente teste", "tradeName": "Teste Ltda"},
  {"companyName": "Gotcha", "tradeName": "G"},
  {"companyName": "Zaeli", "tradeName": "Zaeli Ltda"}
]
```

## 🚀 Como Executar

### Desenvolvimento
```bash
npm run dev  # Inicia servidor na porta 5000
```

### Banco de Dados
```bash
npm run db:push    # Aplica mudanças do schema
npm run db:studio  # Interface visual do banco
```

### Estrutura de Sessão
- Sessions armazenadas no PostgreSQL
- Cookies HTTPOnly para segurança
- Middleware de autenticação em todas rotas protegidas

## 🔍 Debugging

### Logs Importantes
- Console do navegador mostra status de carregamento
- Logs do servidor mostram tentativas de acesso a endpoints
- Verificar se usuário está autenticado: `GET /api/user`

### Comandos Úteis
```bash
# Testar autenticação
curl -X GET http://localhost:5000/api/user

# Testar endpoint de clientes (com sessão)
curl -X GET http://localhost:5000/api/clients \
  -H "Cookie: connect.sid=SESSION_ID"

# Verificar dados no banco
# Use a ferramenta SQL integrada do Replit
```

## 📚 Dependências Principais

### Produção
- `@neondatabase/serverless` - Conexão PostgreSQL
- `drizzle-orm` - ORM type-safe
- `express` + `express-session` - Servidor web
- `passport` + `passport-local` - Autenticação
- `@tanstack/react-query` - Cache de estado servidor
- `wouter` - Roteamento client-side
- `zod` - Validação de schemas

### Desenvolvimento
- `vite` - Build tool e dev server
- `typescript` - Type safety
- `tailwindcss` - CSS utility-first
- `@types/*` - Definições de tipo

## 🎯 Status do Sistema

### Funcionalidades Ativas
1. ✅ **Autenticação funcionando** - Login/logout com sessões persistentes
2. ✅ **API de clientes funcionando** - Endpoint `/api/clientes` ativo
3. ✅ **Select de clientes corrigido** - Dados carregam corretamente
4. ✅ **Interface administrativa** - Gestão completa de entidades
5. ✅ **Workflow de aprovação** - Sistema de 5 status implementado

### Funcionalidade de Limpeza de Dados (Nova)
- ✅ **Sistema de limpeza com confirmação**: Permite deletar dados de teste com senha de confirmação
- ✅ **Proteção por senha**: Requer senha "123mudar" para confirmar exclusões
- ✅ **Interface administrativa**: Disponível apenas para roles MASTER e ADMIN
- ✅ **Limpeza seletiva**: Remove entradas cadastradas durante testes

### Próximos Desenvolvimentos Sugeridos
1. **Teste completo do fluxo de timesheet** - Validar criação de entradas
2. **Relatórios funcionais** - Implementar geração de relatórios
3. **Notificações** - Sistema de alertas para aprovações
4. **Performance** - Otimização de queries e cache
5. **Mobile responsivo** - Ajustes para dispositivos móveis

---

## 💡 Notas para Desenvolvimento

- Sistema usa Drizzle ORM - evitar SQL direto
- Sessions persistem entre reinicializações
- Hot reload ativo no desenvolvimento
- Logs de debug ativos nos componentes
- Componentes shadcn/ui já configurados

## 🔗 Links Úteis

- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [TanStack Query](https://tanstack.com/query/latest)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)

---

**Último Update**: 25 de Janeiro, 2025
**Versão**: 1.0.0
**Status**: Sistema operacional - Select de clientes funcionando corretamente