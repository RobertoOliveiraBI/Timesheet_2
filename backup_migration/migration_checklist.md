# ✅ CHECKLIST FINAL DE MIGRAÇÃO

## Antes de trocar para o novo banco:

- [ ] ✅ Backup do banco atual realizado
- [ ] ✅ Schema idêntico criado no novo banco  
- [ ] ✅ Dados migrados e validados
- [ ] ✅ Testes CRUD realizados com sucesso
- [ ] ✅ Aplicação testada contra novo banco

## Para ativar o novo banco:

1. **Execute o script de atualização:**
   ```bash
   bash backup_migration/update-database-url.sh
   ```

2. **Ou atualize manualmente no Replit:**
   - Vá em Secrets (cadeado) no painel lateral
   - Atualize DATABASE_URL para: `postgres://roberto:Sf544344$wedf@tool_tractionfy_tms:5432/timesheet?sslmode=disable`

3. **Reinicie a aplicação:**
   ```bash
   npm run dev
   ```

4. **Teste todas as funcionalidades:**
   - [ ] Login de usuários
   - [ ] CRUD de clientes
   - [ ] CRUD de campanhas  
   - [ ] Lançamento de horas
   - [ ] Relatórios
   - [ ] Aprovações
   - [ ] Importação CSV
   - [ ] Backup automático

## Após confirmação:

- [ ] Marcar banco antigo como somente leitura
- [ ] Documentar a migração
- [ ] Monitorar por 24-48h

## Rollback (se necessário):

Para voltar ao banco anterior:
```
DATABASE_URL=postgresql://neondb_owner:npg_puiqgPmN75UR@ep-late-credit-afz47u0o.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require
```

---
**Data da migração:** 02/09/2025, 18:47:37
**Status:** Preparado para execução
