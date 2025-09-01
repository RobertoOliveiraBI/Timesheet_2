import {
  users,
  economic_groups,
  clients,
  campaigns,
  campaign_users,
  task_types,
  campaign_tasks,
  time_entries,
  time_entry_comments,
  campaign_costs,
  departments,
  cost_centers,
  cost_categories,
  type User,
  type InsertUser,
  type InsertEconomicGroup,
  type EconomicGroup,
  type InsertClient,
  type Client,
  type InsertCampaign,
  type Campaign,
  type InsertTaskType,
  type TaskType,
  type InsertCampaignTask,
  type CampaignTask,
  type CampaignTaskWithRelations,
  type InsertTimeEntry,
  type TimeEntry,
  type InsertTimeEntryComment,
  type TimeEntryComment,
  type InsertCampaignUser,
  type CampaignUser,
  type TimeEntryWithRelations,
  type CampaignWithRelations,
  type InsertCampaignCost,
  type CampaignCost,
  type CampaignCostWithRelations,
  type InsertCostCategory,
  type CostCategory,
  system_config,
  type SystemConfig,
  type InsertSystemConfig,
  type Department,
  type InsertDepartment,
  type CostCenter,
  type InsertCostCenter,
} from "@shared/schema";
import { getMssql, buildOffsetFetch, convertBoolean, normalizeString, convertDateForMssql, buildMergeQuery } from './mssql-db';
import sql from 'mssql';
import createDebug from 'debug';
import { IStorage } from './storage';

const debug = createDebug('app:db');

/**
 * Implementação do IStorage para SQL Server
 * Converte operations Drizzle para queries SQL Server nativas
 */
export class MssqlStorage implements IStorage {
  private schema = 'TMS'; // Usar schema TMS onde estão as tabelas no Azure SQL Server

  /**
   * Helper para executar query parametrizada
   */
  private async executeQuery<T = any>(queryText: string, params: Record<string, any> = {}): Promise<T[]> {
    const pool = await getMssql();
    const request = pool.request();
    
    // Adicionar parâmetros
    for (const [key, value] of Object.entries(params)) {
      request.input(key, value);
    }
    
    debug('Executando query MSSQL:', queryText.replace(/\s+/g, ' ').trim());
    const result = await request.query(queryText);
    return result.recordset || [];
  }

  /**
   * Helper para executar insert e retornar o registro criado
   */
  private async executeInsert<T = any>(
    tableName: string, 
    data: Record<string, any>,
    returningFields: string[] = ['*']
  ): Promise<T> {
    const pool = await getMssql();
    const request = pool.request();
    
    // Adicionar parâmetros
    for (const [key, value] of Object.entries(data)) {
      request.input(key, this.convertValueForMssql(value));
    }
    
    const columns = Object.keys(data).map(k => `[${k}]`).join(', ');
    const values = Object.keys(data).map(k => `@${k}`).join(', ');
    const outputFields = returningFields.includes('*') ? '*' : returningFields.map(f => `[${f}]`).join(', ');
    
    const queryText = `
      INSERT INTO [${this.schema}].[${tableName}] (${columns})
      OUTPUT INSERTED.${outputFields}
      VALUES (${values})
    `;
    
    debug('Executando insert MSSQL:', queryText.replace(/\s+/g, ' ').trim());
    const result = await request.query(queryText);
    return result.recordset[0];
  }

  /**
   * Helper para executar update e retornar o registro atualizado
   */
  private async executeUpdate<T = any>(
    tableName: string,
    id: number,
    data: Record<string, any>,
    returningFields: string[] = ['*']
  ): Promise<T> {
    const pool = await getMssql();
    const request = pool.request();
    
    request.input('id', id);
    
    // Adicionar parâmetros
    for (const [key, value] of Object.entries(data)) {
      request.input(key, this.convertValueForMssql(value));
    }
    
    const sets = Object.keys(data).map(k => `[${k}] = @${k}`).join(', ');
    const outputFields = returningFields.includes('*') ? '*' : returningFields.map(f => `[${f}]`).join(', ');
    
    const queryText = `
      UPDATE [${this.schema}].[${tableName}]
      SET ${sets}
      OUTPUT INSERTED.${outputFields}
      WHERE [id] = @id
    `;
    
    debug('Executando update MSSQL:', queryText.replace(/\s+/g, ' ').trim());
    const result = await request.query(queryText);
    return result.recordset[0];
  }

  /**
   * Converte valores JavaScript para tipos SQL Server
   */
  private convertValueForMssql(value: any): any {
    if (value === null || value === undefined) return null;
    
    if (typeof value === 'boolean') {
      return convertBoolean(value);
    }
    
    if (typeof value === 'string') {
      return normalizeString(value);
    }
    
    if (value instanceof Date) {
      return convertDateForMssql(value);
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    return value;
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    try {
      const users = await this.executeQuery<User>(`
        SELECT u.*
        FROM [${this.schema}].[users] u
        WHERE u.id = @id
      `, { id });
      
      return users[0];
    } catch (error) {
      debug('Erro ao buscar usuário:', error);
      throw new Error(`Erro ao buscar usuário: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const users = await this.executeQuery<User>(`
        SELECT u.*
        FROM [${this.schema}].[users] u
        WHERE u.email = @email
      `, { email });
      
      return users[0];
    } catch (error) {
      debug('Erro ao buscar usuário por email:', error);
      throw new Error(`Erro ao buscar usuário por email: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  async createUser(userData: InsertUser): Promise<User> {
    return await this.executeInsert<User>('users', userData);
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User> {
    return await this.executeUpdate<User>('users', id, {
      ...updates,
      updated_at: new Date()
    });
  }

  async upsertUser(userData: any): Promise<User> {
    // Implementar MERGE para upsert
    const pool = await getMssql();
    const request = pool.request();
    
    // Adicionar parâmetros
    for (const [key, value] of Object.entries(userData)) {
      request.input(key, this.convertValueForMssql(value));
    }
    
    const mergeQuery = buildMergeQuery('users', ['email'], userData, this.schema);
    
    debug('Executando upsert MSSQL:', mergeQuery.replace(/\s+/g, ' ').trim());
    const result = await request.query(mergeQuery + ' OUTPUT INSERTED.*;');
    return result.recordset[0];
  }

  // Economic Groups
  async createEconomicGroup(group: InsertEconomicGroup): Promise<EconomicGroup> {
    return await this.executeInsert<EconomicGroup>('economic_groups', group);
  }

  async getEconomicGroups(): Promise<EconomicGroup[]> {
    return await this.executeQuery<EconomicGroup>(`
      SELECT * FROM [${this.schema}].[economic_groups]
      ORDER BY [name]
    `);
  }

  async updateEconomicGroup(id: number, group: Partial<InsertEconomicGroup>): Promise<EconomicGroup> {
    return await this.executeUpdate<EconomicGroup>('economic_groups', id, group);
  }

  // Clients
  async createClient(client: InsertClient): Promise<Client> {
    return await this.executeInsert<Client>('clients', client);
  }

  async getClients(): Promise<Client[]> {
    return await this.executeQuery<Client>(`
      SELECT * FROM [${this.schema}].[clients]
      WHERE [is_active] = 1
      ORDER BY [company_name]
    `);
  }

  async getClientsByEconomicGroup(groupId: number): Promise<Client[]> {
    return await this.executeQuery<Client>(`
      SELECT * FROM [${this.schema}].[clients]
      WHERE [economic_group_id] = @groupId AND [is_active] = 1
      ORDER BY [company_name]
    `, { groupId });
  }

  async updateClient(id: number, client: Partial<InsertClient>): Promise<Client> {
    return await this.executeUpdate<Client>('clients', id, client);
  }

  // Campaigns - implementação básica (relacionamentos complexos precisariam de joins manuais)
  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    return await this.executeInsert<Campaign>('campaigns', campaign);
  }

  async getCampaigns(): Promise<CampaignWithRelations[]> {
    // Query complexa com joins para simular relações Drizzle
    return await this.executeQuery<CampaignWithRelations>(`
      SELECT 
        c.*,
        cl.company_name as client_company_name,
        cl.trade_name as client_trade_name,
        eg.name as economicGroup_name
      FROM [${this.schema}].[campaigns] c
      INNER JOIN [${this.schema}].[clients] cl ON c.client_id = cl.id
      LEFT JOIN [${this.schema}].[economic_groups] eg ON cl.economic_group_id = eg.id
      WHERE c.is_active = 1
      ORDER BY c.created_at DESC
    `);
  }

  async getCampaignsByUser(user_id: number): Promise<CampaignWithRelations[]> {
    return await this.executeQuery<CampaignWithRelations>(`
      SELECT 
        c.*,
        cl.company_name as client_company_name,
        cl.trade_name as client_trade_name,
        eg.name as economicGroup_name
      FROM [${this.schema}].[campaigns] c
      INNER JOIN [${this.schema}].[clients] cl ON c.client_id = cl.id
      LEFT JOIN [${this.schema}].[economic_groups] eg ON cl.economic_group_id = eg.id
      INNER JOIN [${this.schema}].[campaign_users] cu ON c.id = cu.campaign_id
      WHERE cu.user_id = @user_id AND c.is_active = 1
      ORDER BY c.created_at DESC
    `, { user_id });
  }

  async updateCampaign(id: number, campaign: Partial<InsertCampaign>): Promise<Campaign> {
    return await this.executeUpdate<Campaign>('campaigns', id, campaign);
  }

  async addUserToCampaign(campaign_id: number, user_id: number): Promise<void> {
    await this.executeInsert('campaign_users', { campaign_id, user_id });
  }

  async removeUserFromCampaign(campaign_id: number, user_id: number): Promise<void> {
    await this.executeQuery(`
      DELETE FROM [${this.schema}].[campaign_users]
      WHERE [campaign_id] = @campaign_id AND [user_id] = @user_id
    `, { campaign_id, user_id });
  }

  // Task Types
  async createTaskType(taskType: InsertTaskType): Promise<TaskType> {
    return await this.executeInsert<TaskType>('task_types', taskType);
  }

  async getTaskTypes(): Promise<TaskType[]> {
    return await this.executeQuery<TaskType>(`
      SELECT * FROM [${this.schema}].[task_types]
      WHERE [is_active] = 1
      ORDER BY [name]
    `);
  }

  async updateTaskType(id: number, taskType: Partial<InsertTaskType>): Promise<TaskType> {
    return await this.executeUpdate<TaskType>('task_types', id, taskType);
  }

  // Campaign Tasks
  async createCampaignTask(campaignTask: InsertCampaignTask): Promise<CampaignTask> {
    return await this.executeInsert<CampaignTask>('campaign_tasks', campaignTask);
  }

  async getCampaignTasks(campaign_id?: number): Promise<CampaignTaskWithRelations[]> {
    const whereClause = campaign_id ? 'WHERE ct.campaign_id = @campaign_id AND ct.is_active = 1' : 'WHERE ct.is_active = 1';
    const params = campaign_id ? { campaign_id } : {};
    
    return await this.executeQuery<CampaignTaskWithRelations>(`
      SELECT 
        ct.*,
        c.name as campaign_name,
        tt.name as taskType_name,
        tt.is_billable as taskType_is_billable
      FROM [${this.schema}].[campaign_tasks] ct
      INNER JOIN [${this.schema}].[campaigns] c ON ct.campaign_id = c.id
      INNER JOIN [${this.schema}].[task_types] tt ON ct.task_type_id = tt.id
      ${whereClause}
      ORDER BY ct.[description]
    `, params);
  }

  async updateCampaignTask(id: number, campaignTask: Partial<InsertCampaignTask>): Promise<CampaignTask> {
    return await this.executeUpdate<CampaignTask>('campaign_tasks', id, campaignTask);
  }

  async deleteCampaignTask(id: number): Promise<void> {
    await this.executeUpdate('campaign_tasks', id, { is_active: false });
  }

  // Time Entries - implementação simplificada
  async createTimeEntry(timeEntry: InsertTimeEntry): Promise<TimeEntry> {
    return await this.executeInsert<TimeEntry>('time_entries', timeEntry);
  }

  async getTimeEntries(user_id?: number, status?: string, fromDate?: string, toDate?: string): Promise<TimeEntryWithRelations[]> {
    let whereConditions: string[] = [];
    const params: Record<string, any> = {};
    
    if (user_id) {
      whereConditions.push('te.user_id = @user_id');
      params.user_id = user_id;
    }
    
    if (status) {
      whereConditions.push('te.status = @status');
      params.status = status;
    }
    
    if (fromDate) {
      whereConditions.push('te.date >= @fromDate');
      params.fromDate = fromDate;
    }
    
    if (toDate) {
      whereConditions.push('te.date <= @toDate');
      params.toDate = toDate;
    }
    
    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
    
    return await this.executeQuery<TimeEntryWithRelations>(`
      SELECT 
        te.*,
        u.first_name + ' ' + u.last_name as user_name,
        c.name as campaign_name,
        cl.company_name as client_company_name,
        ct.description as campaignTask_description,
        tt.name as taskType_name
      FROM [${this.schema}].[time_entries] te
      INNER JOIN [${this.schema}].[users] u ON te.user_id = u.id
      INNER JOIN [${this.schema}].[campaigns] c ON te.campaign_id = c.id
      INNER JOIN [${this.schema}].[clients] cl ON c.client_id = cl.id
      INNER JOIN [${this.schema}].[campaign_tasks] ct ON te.campaign_task_id = ct.id
      INNER JOIN [${this.schema}].[task_types] tt ON ct.task_type_id = tt.id
      ${whereClause}
      ORDER BY te.[date] DESC, te.created_at DESC
    `, params);
  }

  // Implementações simplificadas para os métodos restantes da interface
  async deleteTimeEntry(id: number): Promise<void> {
    await this.executeQuery(`DELETE FROM [${this.schema}].[time_entries] WHERE id = @id`, { id });
  }

  async getTimeEntry(id: number): Promise<TimeEntry | undefined> {
    const entries = await this.executeQuery<TimeEntry>(`
      SELECT * FROM [${this.schema}].[time_entries] WHERE id = @id
    `, { id });
    return entries[0];
  }

  async getTimeEntriesByUser(user_id: number, fromDate?: string, toDate?: string): Promise<TimeEntryWithRelations[]> {
    return this.getTimeEntries(user_id, undefined, fromDate, toDate);
  }

  async getPendingTimeEntries(manager_id?: number): Promise<TimeEntryWithRelations[]> {
    if (manager_id) {
      // Buscar subordinados do gestor
      const subordinates = await this.executeQuery<{id: number}>(`
        SELECT id FROM [${this.schema}].[users] WHERE manager_id = @manager_id
      `, { manager_id });
      
      if (subordinates.length === 0) return [];
      
      const user_ids = subordinates.map(s => s.id);
      return await this.executeQuery<TimeEntryWithRelations>(`
        SELECT 
          te.*,
          u.first_name + ' ' + u.last_name as user_name,
          c.name as campaign_name,
          cl.company_name as client_company_name,
          ct.description as campaignTask_description,
          tt.name as taskType_name
        FROM [${this.schema}].[time_entries] te
        INNER JOIN [${this.schema}].[users] u ON te.user_id = u.id
        INNER JOIN [${this.schema}].[campaigns] c ON te.campaign_id = c.id
        INNER JOIN [${this.schema}].[clients] cl ON c.client_id = cl.id
        INNER JOIN [${this.schema}].[campaign_tasks] ct ON te.campaign_task_id = ct.id
        INNER JOIN [${this.schema}].[task_types] tt ON ct.task_type_id = tt.id
        WHERE te.status = 'VALIDACAO' AND te.user_id IN (${user_ids.map(id => `'${id}'`).join(',')})
        ORDER BY te.[date] ASC, te.created_at ASC
      `);
    } else {
      return this.getTimeEntries(undefined, 'VALIDACAO');
    }
  }

  async updateTimeEntry(id: number, timeEntry: any): Promise<TimeEntry> {
    return await this.executeUpdate<TimeEntry>('time_entries', id, {
      ...timeEntry,
      updated_at: new Date()
    });
  }

  async submitTimeEntry(id: number, user_id: number): Promise<TimeEntry> {
    return await this.executeUpdate<TimeEntry>('time_entries', id, {
      status: 'VALIDACAO',
      submitted_at: new Date(),
      updated_at: new Date()
    });
  }

  async approveTimeEntry(id: number, reviewerId: number, comment?: string): Promise<TimeEntry> {
    if (comment?.trim()) {
      await this.executeInsert('time_entry_comments', {
        time_entry_id: id,
        user_id: reviewerId,
        comment: comment.trim(),
        comment_type: 'MANAGER_FEEDBACK'
      });
    }

    return await this.executeUpdate<TimeEntry>('time_entries', id, {
      status: 'APROVADO',
      reviewed_by: reviewerId,
      reviewed_at: new Date(),
      review_comment: comment,
      updated_at: new Date()
    });
  }

  async rejectTimeEntry(id: number, reviewerId: number, comment?: string): Promise<TimeEntry> {
    if (comment?.trim()) {
      await this.executeInsert('time_entry_comments', {
        time_entry_id: id,
        user_id: reviewerId,
        comment: comment.trim(),
        comment_type: 'MANAGER_FEEDBACK'
      });
    }

    return await this.executeUpdate<TimeEntry>('time_entries', id, {
      status: 'RASCUNHO',
      reviewed_by: reviewerId,
      reviewed_at: new Date(),
      review_comment: comment,
      updated_at: new Date()
    });
  }

  async returnApprovedToSaved(id: number, reviewed_by: number, comment?: string): Promise<TimeEntry> {
    return await this.executeUpdate<TimeEntry>('time_entries', id, {
      status: 'SALVO',
      review_comment: comment,
      updated_at: new Date()
    });
  }

  // Time Entry Comments
  async createTimeEntryComment(comment: InsertTimeEntryComment): Promise<TimeEntryComment> {
    return await this.executeInsert<TimeEntryComment>('time_entry_comments', comment);
  }

  async getTimeEntryComments(time_entry_id: number): Promise<Array<TimeEntryComment & { user: User }>> {
    return await this.executeQuery(`
      SELECT 
        tec.*,
        u.first_name + ' ' + u.last_name as user_name,
        u.email as user_email
      FROM [${this.schema}].[time_entry_comments] tec
      INNER JOIN [${this.schema}].[users] u ON tec.user_id = u.id
      WHERE tec.time_entry_id = @time_entry_id
      ORDER BY tec.created_at ASC
    `, { time_entry_id });
  }

  async respondToComment(time_entry_id: number, user_id: number, comment: string): Promise<{comment: TimeEntryComment, updatedEntry: TimeEntry}> {
    const newComment = await this.createTimeEntryComment({
      time_entry_id,
      user_id,
      comment,
      comment_type: 'COLLABORATOR_RESPONSE'
    });

    const updatedEntry = await this.updateTimeEntry(time_entry_id, {
      updated_at: new Date()
    });

    return { comment: newComment, updatedEntry };
  }

  // Stats simplificadas (implementação básica)
  async getUserTimeStats(user_id: number, fromDate?: string, toDate?: string): Promise<{
    totalHours: number;
    billableHours: number;
    nonBillableHours: number;
    approvedHours: number;
    pendingHours: number;
  }> {
    let whereConditions = ['te.user_id = @user_id'];
    const params: Record<string, any> = { user_id };
    
    if (fromDate) {
      whereConditions.push('te.date >= @fromDate');
      params.fromDate = fromDate;
    }
    
    if (toDate) {
      whereConditions.push('te.date <= @toDate');
      params.toDate = toDate;
    }
    
    const whereClause = 'WHERE ' + whereConditions.join(' AND ');
    
    const result = await this.executeQuery(`
      SELECT 
        SUM(CAST(te.hours AS FLOAT)) as totalHours,
        SUM(CASE WHEN tt.is_billable = 1 THEN CAST(te.hours AS FLOAT) ELSE 0 END) as billableHours,
        SUM(CASE WHEN tt.is_billable = 0 THEN CAST(te.hours AS FLOAT) ELSE 0 END) as nonBillableHours,
        SUM(CASE WHEN te.status = 'APROVADO' THEN CAST(te.hours AS FLOAT) ELSE 0 END) as approvedHours,
        SUM(CASE WHEN te.status = 'VALIDACAO' THEN CAST(te.hours AS FLOAT) ELSE 0 END) as pendingHours
      FROM [${this.schema}].[time_entries] te
      INNER JOIN [${this.schema}].[campaign_tasks] ct ON te.campaign_task_id = ct.id
      INNER JOIN [${this.schema}].[task_types] tt ON ct.task_type_id = tt.id
      ${whereClause}
    `, params);
    
    const stats = result[0] || {};
    return {
      totalHours: Number(stats.totalHours || 0),
      billableHours: Number(stats.billableHours || 0),
      nonBillableHours: Number(stats.nonBillableHours || 0),
      approvedHours: Number(stats.approvedHours || 0),
      pendingHours: Number(stats.pendingHours || 0)
    };
  }

  async getTeamTimeStats(manager_id: number, fromDate?: string, toDate?: string): Promise<{
    totalHours: number;
    billableHours: number;
    utilization: number;
    activeUsers: number;
  }> {
    // Implementação simplificada
    return {
      totalHours: 0,
      billableHours: 0,
      utilization: 0,
      activeUsers: 0
    };
  }

  // System config (implementação básica)
  async getSystemConfig(): Promise<Record<string, any>> {
    const configs = await this.executeQuery(`
      SELECT [key], [value] FROM [${this.schema}].[system_config]
    `);
    
    const result: Record<string, any> = {};
    for (const config of configs) {
      result[config.key] = JSON.parse(config.value);
    }
    return result;
  }

  async updateSystemConfig(config: Record<string, any>): Promise<void> {
    for (const [key, value] of Object.entries(config)) {
      const mergeQuery = buildMergeQuery(
        'system_config',
        ['key'],
        { key, value: JSON.stringify(value), updated_at: new Date() },
        this.schema
      );
      
      await this.executeQuery(mergeQuery);
    }
  }

  // Admin operations básicas
  async getAllUsers(): Promise<User[]> {
    return await this.executeQuery<User>(`
      SELECT * FROM [${this.schema}].[users] ORDER BY [first_name], [last_name]
    `);
  }

  async deleteUser(id: number): Promise<void> {
    await this.executeQuery(`DELETE FROM [${this.schema}].[users] WHERE id = @id`, { id });
  }

  async deleteEconomicGroup(id: number): Promise<void> {
    await this.executeQuery(`DELETE FROM [${this.schema}].[economic_groups] WHERE id = @id`, { id });
  }

  async deleteClient(id: number): Promise<void> {
    await this.executeQuery(`DELETE FROM [${this.schema}].[clients] WHERE id = @id`, { id });
  }

  async deleteCampaign(id: number): Promise<void> {
    await this.executeQuery(`DELETE FROM [${this.schema}].[campaigns] WHERE id = @id`, { id });
  }

  async deleteTaskType(id: number): Promise<void> {
    await this.executeQuery(`DELETE FROM [${this.schema}].[task_types] WHERE id = @id`, { id });
  }

  // Departments
  async getDepartments(): Promise<Department[]> {
    return await this.executeQuery<Department>(`
      SELECT * FROM [${this.schema}].[departments] ORDER BY [name]
    `);
  }

  async createDepartment(department: InsertDepartment): Promise<Department> {
    return await this.executeInsert<Department>('departments', department);
  }

  async updateDepartment(id: number, department: Partial<InsertDepartment>): Promise<Department> {
    return await this.executeUpdate<Department>('departments', id, {
      ...department,
      updated_at: new Date()
    });
  }

  async deleteDepartment(id: number): Promise<void> {
    await this.executeQuery(`DELETE FROM [${this.schema}].[departments] WHERE id = @id`, { id });
  }

  // Cost Centers
  async getCostCenters(): Promise<CostCenter[]> {
    return await this.executeQuery<CostCenter>(`
      SELECT * FROM [${this.schema}].[cost_centers] ORDER BY [name]
    `);
  }

  async createCostCenter(costCenter: InsertCostCenter): Promise<CostCenter> {
    return await this.executeInsert<CostCenter>('cost_centers', costCenter);
  }

  async updateCostCenter(id: number, costCenter: Partial<InsertCostCenter>): Promise<CostCenter> {
    return await this.executeUpdate<CostCenter>('cost_centers', id, {
      ...costCenter,
      updated_at: new Date()
    });
  }

  async deleteCostCenter(id: number): Promise<void> {
    await this.executeQuery(`DELETE FROM [${this.schema}].[cost_centers] WHERE id = @id`, { id });
  }

  // Cost Categories
  async getCostCategories(): Promise<CostCategory[]> {
    return await this.executeQuery<CostCategory>(`
      SELECT * FROM [${this.schema}].[cost_categories] ORDER BY [name]
    `);
  }

  async createCostCategory(category: InsertCostCategory): Promise<CostCategory> {
    return await this.executeInsert<CostCategory>('cost_categories', category);
  }

  async updateCostCategory(id: number, category: Partial<InsertCostCategory>): Promise<CostCategory> {
    return await this.executeUpdate<CostCategory>('cost_categories', id, {
      ...category,
      updated_at: new Date()
    });
  }

  async deleteCostCategory(id: number): Promise<void> {
    await this.executeQuery(`DELETE FROM [${this.schema}].[cost_categories] WHERE id = @id`, { id });
  }

  // Campaign Costs (implementação simplificada)
  async getCampaignCosts(filters?: {
    campaign_id?: number;
    referenceMonth?: string;
    status?: string;
    user_id?: number;
  }): Promise<CampaignCostWithRelations[]> {
    let whereConditions: string[] = [];
    const params: Record<string, any> = {};
    
    if (filters?.campaign_id) {
      whereConditions.push('cc.campaign_id = @campaign_id');
      params.campaign_id = filters.campaign_id;
    }
    
    if (filters?.referenceMonth) {
      whereConditions.push('cc.referenceMonth = @referenceMonth');
      params.referenceMonth = filters.referenceMonth;
    }
    
    if (filters?.status) {
      whereConditions.push('cc.status = @status');
      params.status = filters.status;
    }
    
    if (filters?.user_id) {
      whereConditions.push('cc.user_id = @user_id');
      params.user_id = filters.user_id;
    }
    
    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
    
    return await this.executeQuery<CampaignCostWithRelations>(`
      SELECT 
        cc.*,
        c.name as campaign_name,
        cl.company_name as client_company_name,
        u.first_name + ' ' + u.last_name as user_name,
        cat.name as category_name
      FROM [${this.schema}].[campaign_costs] cc
      INNER JOIN [${this.schema}].[campaigns] c ON cc.campaign_id = c.id
      INNER JOIN [${this.schema}].[clients] cl ON c.client_id = cl.id
      INNER JOIN [${this.schema}].[users] u ON cc.user_id = u.id
      LEFT JOIN [${this.schema}].[cost_categories] cat ON cc.categoryId = cat.id
      ${whereClause}
      ORDER BY cc.created_at DESC
    `, params);
  }

  async createCampaignCost(campaignCost: InsertCampaignCost): Promise<CampaignCost> {
    return await this.executeInsert<CampaignCost>('campaign_costs', campaignCost);
  }

  async updateCampaignCost(id: number, campaignCost: Partial<InsertCampaignCost>): Promise<CampaignCost> {
    return await this.executeUpdate<CampaignCost>('campaign_costs', id, {
      ...campaignCost,
      updated_at: new Date()
    });
  }

  async inactivateCampaignCost(id: number, user_id: number): Promise<CampaignCost> {
    return await this.executeUpdate<CampaignCost>('campaign_costs', id, {
      status: 'INATIVO',
      inactivatedAt: new Date(),
      inactivatedBy: user_id,
      updated_at: new Date()
    });
  }

  async reactivateCampaignCost(id: number): Promise<CampaignCost> {
    return await this.executeUpdate<CampaignCost>('campaign_costs', id, {
      status: 'ATIVO',
      inactivatedAt: null,
      inactivatedBy: null,
      updated_at: new Date()
    });
  }

  async getCampaignCostsTotals(filters?: {
    campaign_id?: number;
    referenceMonth?: string;
    status?: string;
    user_id?: number;
  }): Promise<{ total: number; count: number; }> {
    let whereConditions: string[] = [];
    const params: Record<string, any> = {};
    
    if (filters?.campaign_id) {
      whereConditions.push('campaign_id = @campaign_id');
      params.campaign_id = filters.campaign_id;
    }
    
    if (filters?.referenceMonth) {
      whereConditions.push('referenceMonth = @referenceMonth');
      params.referenceMonth = filters.referenceMonth;
    }
    
    if (filters?.status) {
      whereConditions.push('status = @status');
      params.status = filters.status;
    }
    
    if (filters?.user_id) {
      whereConditions.push('user_id = @user_id');
      params.user_id = filters.user_id;
    }
    
    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
    
    const result = await this.executeQuery(`
      SELECT 
        SUM(CAST([amount] AS DECIMAL(12,2))) as total,
        COUNT(*) as count
      FROM [${this.schema}].[campaign_costs]
      ${whereClause}
    `, params);
    
    const stats = result[0] || {};
    return {
      total: Number(stats.total || 0),
      count: Number(stats.count || 0)
    };
  }
}

export const mssqlStorage = new MssqlStorage();