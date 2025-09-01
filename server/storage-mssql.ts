import {
  users,
  economicGroups,
  clients,
  campaigns,
  campaignUsers,
  taskTypes,
  campaignTasks,
  timeEntries,
  timeEntryComments,
  campaignCosts,
  departments,
  costCenters,
  costCategories,
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
  systemConfig,
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
  private schema = 'TMS'; // Usar schema TMS por padrão, fallback para dbo se necessário

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
    const users = await this.executeQuery<User>(`
      SELECT u.*, 
             d.name as department_name,
             cc.name as cost_center_name,
             m.firstName + ' ' + m.lastName as manager_name
      FROM [${this.schema}].[users] u
      LEFT JOIN [${this.schema}].[departments] d ON u.departmentId = d.id
      LEFT JOIN [${this.schema}].[costCenters] cc ON u.costCenterId = cc.id
      LEFT JOIN [${this.schema}].[users] m ON u.managerId = m.id
      WHERE u.id = @id
    `, { id });
    
    return users[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const users = await this.executeQuery<User>(`
      SELECT u.*, 
             d.name as department_name,
             cc.name as cost_center_name,
             m.firstName + ' ' + m.lastName as manager_name
      FROM [${this.schema}].[users] u
      LEFT JOIN [${this.schema}].[departments] d ON u.departmentId = d.id
      LEFT JOIN [${this.schema}].[costCenters] cc ON u.costCenterId = cc.id
      LEFT JOIN [${this.schema}].[users] m ON u.managerId = m.id
      WHERE u.email = @email
    `, { email });
    
    return users[0];
  }

  async createUser(userData: InsertUser): Promise<User> {
    return await this.executeInsert<User>('users', userData);
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User> {
    return await this.executeUpdate<User>('users', id, {
      ...updates,
      updatedAt: new Date()
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
    return await this.executeInsert<EconomicGroup>('economicGroups', group);
  }

  async getEconomicGroups(): Promise<EconomicGroup[]> {
    return await this.executeQuery<EconomicGroup>(`
      SELECT * FROM [${this.schema}].[economicGroups]
      ORDER BY [name]
    `);
  }

  async updateEconomicGroup(id: number, group: Partial<InsertEconomicGroup>): Promise<EconomicGroup> {
    return await this.executeUpdate<EconomicGroup>('economicGroups', id, group);
  }

  // Clients
  async createClient(client: InsertClient): Promise<Client> {
    return await this.executeInsert<Client>('clients', client);
  }

  async getClients(): Promise<Client[]> {
    return await this.executeQuery<Client>(`
      SELECT * FROM [${this.schema}].[clients]
      WHERE [isActive] = 1
      ORDER BY [companyName]
    `);
  }

  async getClientsByEconomicGroup(groupId: number): Promise<Client[]> {
    return await this.executeQuery<Client>(`
      SELECT * FROM [${this.schema}].[clients]
      WHERE [economicGroupId] = @groupId AND [isActive] = 1
      ORDER BY [companyName]
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
        cl.companyName as client_companyName,
        cl.tradeName as client_tradeName,
        eg.name as economicGroup_name
      FROM [${this.schema}].[campaigns] c
      INNER JOIN [${this.schema}].[clients] cl ON c.clientId = cl.id
      LEFT JOIN [${this.schema}].[economicGroups] eg ON cl.economicGroupId = eg.id
      WHERE c.isActive = 1
      ORDER BY c.createdAt DESC
    `);
  }

  async getCampaignsByUser(userId: number): Promise<CampaignWithRelations[]> {
    return await this.executeQuery<CampaignWithRelations>(`
      SELECT 
        c.*,
        cl.companyName as client_companyName,
        cl.tradeName as client_tradeName,
        eg.name as economicGroup_name
      FROM [${this.schema}].[campaigns] c
      INNER JOIN [${this.schema}].[clients] cl ON c.clientId = cl.id
      LEFT JOIN [${this.schema}].[economicGroups] eg ON cl.economicGroupId = eg.id
      INNER JOIN [${this.schema}].[campaignUsers] cu ON c.id = cu.campaignId
      WHERE cu.userId = @userId AND c.isActive = 1
      ORDER BY c.createdAt DESC
    `, { userId });
  }

  async updateCampaign(id: number, campaign: Partial<InsertCampaign>): Promise<Campaign> {
    return await this.executeUpdate<Campaign>('campaigns', id, campaign);
  }

  async addUserToCampaign(campaignId: number, userId: number): Promise<void> {
    await this.executeInsert('campaignUsers', { campaignId, userId });
  }

  async removeUserFromCampaign(campaignId: number, userId: number): Promise<void> {
    await this.executeQuery(`
      DELETE FROM [${this.schema}].[campaignUsers]
      WHERE [campaignId] = @campaignId AND [userId] = @userId
    `, { campaignId, userId });
  }

  // Task Types
  async createTaskType(taskType: InsertTaskType): Promise<TaskType> {
    return await this.executeInsert<TaskType>('taskTypes', taskType);
  }

  async getTaskTypes(): Promise<TaskType[]> {
    return await this.executeQuery<TaskType>(`
      SELECT * FROM [${this.schema}].[taskTypes]
      WHERE [isActive] = 1
      ORDER BY [name]
    `);
  }

  async updateTaskType(id: number, taskType: Partial<InsertTaskType>): Promise<TaskType> {
    return await this.executeUpdate<TaskType>('taskTypes', id, taskType);
  }

  // Campaign Tasks
  async createCampaignTask(campaignTask: InsertCampaignTask): Promise<CampaignTask> {
    return await this.executeInsert<CampaignTask>('campaignTasks', campaignTask);
  }

  async getCampaignTasks(campaignId?: number): Promise<CampaignTaskWithRelations[]> {
    const whereClause = campaignId ? 'WHERE ct.campaignId = @campaignId AND ct.isActive = 1' : 'WHERE ct.isActive = 1';
    const params = campaignId ? { campaignId } : {};
    
    return await this.executeQuery<CampaignTaskWithRelations>(`
      SELECT 
        ct.*,
        c.name as campaign_name,
        tt.name as taskType_name,
        tt.isBillable as taskType_isBillable
      FROM [${this.schema}].[campaignTasks] ct
      INNER JOIN [${this.schema}].[campaigns] c ON ct.campaignId = c.id
      INNER JOIN [${this.schema}].[taskTypes] tt ON ct.taskTypeId = tt.id
      ${whereClause}
      ORDER BY ct.[description]
    `, params);
  }

  async updateCampaignTask(id: number, campaignTask: Partial<InsertCampaignTask>): Promise<CampaignTask> {
    return await this.executeUpdate<CampaignTask>('campaignTasks', id, campaignTask);
  }

  async deleteCampaignTask(id: number): Promise<void> {
    await this.executeUpdate('campaignTasks', id, { isActive: false });
  }

  // Time Entries - implementação simplificada
  async createTimeEntry(timeEntry: InsertTimeEntry): Promise<TimeEntry> {
    return await this.executeInsert<TimeEntry>('timeEntries', timeEntry);
  }

  async getTimeEntries(userId?: number, status?: string, fromDate?: string, toDate?: string): Promise<TimeEntryWithRelations[]> {
    let whereConditions: string[] = [];
    const params: Record<string, any> = {};
    
    if (userId) {
      whereConditions.push('te.userId = @userId');
      params.userId = userId;
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
        u.firstName + ' ' + u.lastName as user_name,
        c.name as campaign_name,
        cl.companyName as client_companyName,
        ct.description as campaignTask_description,
        tt.name as taskType_name
      FROM [${this.schema}].[timeEntries] te
      INNER JOIN [${this.schema}].[users] u ON te.userId = u.id
      INNER JOIN [${this.schema}].[campaigns] c ON te.campaignId = c.id
      INNER JOIN [${this.schema}].[clients] cl ON c.clientId = cl.id
      INNER JOIN [${this.schema}].[campaignTasks] ct ON te.campaignTaskId = ct.id
      INNER JOIN [${this.schema}].[taskTypes] tt ON ct.taskTypeId = tt.id
      ${whereClause}
      ORDER BY te.[date] DESC, te.createdAt DESC
    `, params);
  }

  // Implementações simplificadas para os métodos restantes da interface
  async deleteTimeEntry(id: number): Promise<void> {
    await this.executeQuery(`DELETE FROM [${this.schema}].[timeEntries] WHERE id = @id`, { id });
  }

  async getTimeEntry(id: number): Promise<TimeEntry | undefined> {
    const entries = await this.executeQuery<TimeEntry>(`
      SELECT * FROM [${this.schema}].[timeEntries] WHERE id = @id
    `, { id });
    return entries[0];
  }

  async getTimeEntriesByUser(userId: number, fromDate?: string, toDate?: string): Promise<TimeEntryWithRelations[]> {
    return this.getTimeEntries(userId, undefined, fromDate, toDate);
  }

  async getPendingTimeEntries(managerId?: number): Promise<TimeEntryWithRelations[]> {
    if (managerId) {
      // Buscar subordinados do gestor
      const subordinates = await this.executeQuery<{id: number}>(`
        SELECT id FROM [${this.schema}].[users] WHERE managerId = @managerId
      `, { managerId });
      
      if (subordinates.length === 0) return [];
      
      const userIds = subordinates.map(s => s.id);
      return await this.executeQuery<TimeEntryWithRelations>(`
        SELECT 
          te.*,
          u.firstName + ' ' + u.lastName as user_name,
          c.name as campaign_name,
          cl.companyName as client_companyName,
          ct.description as campaignTask_description,
          tt.name as taskType_name
        FROM [${this.schema}].[timeEntries] te
        INNER JOIN [${this.schema}].[users] u ON te.userId = u.id
        INNER JOIN [${this.schema}].[campaigns] c ON te.campaignId = c.id
        INNER JOIN [${this.schema}].[clients] cl ON c.clientId = cl.id
        INNER JOIN [${this.schema}].[campaignTasks] ct ON te.campaignTaskId = ct.id
        INNER JOIN [${this.schema}].[taskTypes] tt ON ct.taskTypeId = tt.id
        WHERE te.status = 'VALIDACAO' AND te.userId IN (${userIds.map(id => `'${id}'`).join(',')})
        ORDER BY te.[date] ASC, te.createdAt ASC
      `);
    } else {
      return this.getTimeEntries(undefined, 'VALIDACAO');
    }
  }

  async updateTimeEntry(id: number, timeEntry: any): Promise<TimeEntry> {
    return await this.executeUpdate<TimeEntry>('timeEntries', id, {
      ...timeEntry,
      updatedAt: new Date()
    });
  }

  async submitTimeEntry(id: number, userId: number): Promise<TimeEntry> {
    return await this.executeUpdate<TimeEntry>('timeEntries', id, {
      status: 'VALIDACAO',
      submittedAt: new Date(),
      updatedAt: new Date()
    });
  }

  async approveTimeEntry(id: number, reviewerId: number, comment?: string): Promise<TimeEntry> {
    if (comment?.trim()) {
      await this.executeInsert('timeEntryComments', {
        timeEntryId: id,
        userId: reviewerId,
        comment: comment.trim(),
        commentType: 'MANAGER_FEEDBACK'
      });
    }

    return await this.executeUpdate<TimeEntry>('timeEntries', id, {
      status: 'APROVADO',
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      reviewComment: comment,
      updatedAt: new Date()
    });
  }

  async rejectTimeEntry(id: number, reviewerId: number, comment?: string): Promise<TimeEntry> {
    if (comment?.trim()) {
      await this.executeInsert('timeEntryComments', {
        timeEntryId: id,
        userId: reviewerId,
        comment: comment.trim(),
        commentType: 'MANAGER_FEEDBACK'
      });
    }

    return await this.executeUpdate<TimeEntry>('timeEntries', id, {
      status: 'RASCUNHO',
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      reviewComment: comment,
      updatedAt: new Date()
    });
  }

  async returnApprovedToSaved(id: number, reviewedBy: number, comment?: string): Promise<TimeEntry> {
    return await this.executeUpdate<TimeEntry>('timeEntries', id, {
      status: 'SALVO',
      reviewComment: comment,
      updatedAt: new Date()
    });
  }

  // Time Entry Comments
  async createTimeEntryComment(comment: InsertTimeEntryComment): Promise<TimeEntryComment> {
    return await this.executeInsert<TimeEntryComment>('timeEntryComments', comment);
  }

  async getTimeEntryComments(timeEntryId: number): Promise<Array<TimeEntryComment & { user: User }>> {
    return await this.executeQuery(`
      SELECT 
        tec.*,
        u.firstName + ' ' + u.lastName as user_name,
        u.email as user_email
      FROM [${this.schema}].[timeEntryComments] tec
      INNER JOIN [${this.schema}].[users] u ON tec.userId = u.id
      WHERE tec.timeEntryId = @timeEntryId
      ORDER BY tec.createdAt ASC
    `, { timeEntryId });
  }

  async respondToComment(timeEntryId: number, userId: number, comment: string): Promise<{comment: TimeEntryComment, updatedEntry: TimeEntry}> {
    const newComment = await this.createTimeEntryComment({
      timeEntryId,
      userId,
      comment,
      commentType: 'COLLABORATOR_RESPONSE'
    });

    const updatedEntry = await this.updateTimeEntry(timeEntryId, {
      updatedAt: new Date()
    });

    return { comment: newComment, updatedEntry };
  }

  // Stats simplificadas (implementação básica)
  async getUserTimeStats(userId: number, fromDate?: string, toDate?: string): Promise<{
    totalHours: number;
    billableHours: number;
    nonBillableHours: number;
    approvedHours: number;
    pendingHours: number;
  }> {
    let whereConditions = ['te.userId = @userId'];
    const params: Record<string, any> = { userId };
    
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
        SUM(CASE WHEN tt.isBillable = 1 THEN CAST(te.hours AS FLOAT) ELSE 0 END) as billableHours,
        SUM(CASE WHEN tt.isBillable = 0 THEN CAST(te.hours AS FLOAT) ELSE 0 END) as nonBillableHours,
        SUM(CASE WHEN te.status = 'APROVADO' THEN CAST(te.hours AS FLOAT) ELSE 0 END) as approvedHours,
        SUM(CASE WHEN te.status = 'VALIDACAO' THEN CAST(te.hours AS FLOAT) ELSE 0 END) as pendingHours
      FROM [${this.schema}].[timeEntries] te
      INNER JOIN [${this.schema}].[campaignTasks] ct ON te.campaignTaskId = ct.id
      INNER JOIN [${this.schema}].[taskTypes] tt ON ct.taskTypeId = tt.id
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

  async getTeamTimeStats(managerId: number, fromDate?: string, toDate?: string): Promise<{
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
      SELECT [key], [value] FROM [${this.schema}].[systemConfig]
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
        'systemConfig',
        ['key'],
        { key, value: JSON.stringify(value), updatedAt: new Date() },
        this.schema
      );
      
      await this.executeQuery(mergeQuery);
    }
  }

  // Admin operations básicas
  async getAllUsers(): Promise<User[]> {
    return await this.executeQuery<User>(`
      SELECT * FROM [${this.schema}].[users] ORDER BY [firstName], [lastName]
    `);
  }

  async deleteUser(id: number): Promise<void> {
    await this.executeQuery(`DELETE FROM [${this.schema}].[users] WHERE id = @id`, { id });
  }

  async deleteEconomicGroup(id: number): Promise<void> {
    await this.executeQuery(`DELETE FROM [${this.schema}].[economicGroups] WHERE id = @id`, { id });
  }

  async deleteClient(id: number): Promise<void> {
    await this.executeQuery(`DELETE FROM [${this.schema}].[clients] WHERE id = @id`, { id });
  }

  async deleteCampaign(id: number): Promise<void> {
    await this.executeQuery(`DELETE FROM [${this.schema}].[campaigns] WHERE id = @id`, { id });
  }

  async deleteTaskType(id: number): Promise<void> {
    await this.executeQuery(`DELETE FROM [${this.schema}].[taskTypes] WHERE id = @id`, { id });
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
      updatedAt: new Date()
    });
  }

  async deleteDepartment(id: number): Promise<void> {
    await this.executeQuery(`DELETE FROM [${this.schema}].[departments] WHERE id = @id`, { id });
  }

  // Cost Centers
  async getCostCenters(): Promise<CostCenter[]> {
    return await this.executeQuery<CostCenter>(`
      SELECT * FROM [${this.schema}].[costCenters] ORDER BY [name]
    `);
  }

  async createCostCenter(costCenter: InsertCostCenter): Promise<CostCenter> {
    return await this.executeInsert<CostCenter>('costCenters', costCenter);
  }

  async updateCostCenter(id: number, costCenter: Partial<InsertCostCenter>): Promise<CostCenter> {
    return await this.executeUpdate<CostCenter>('costCenters', id, {
      ...costCenter,
      updatedAt: new Date()
    });
  }

  async deleteCostCenter(id: number): Promise<void> {
    await this.executeQuery(`DELETE FROM [${this.schema}].[costCenters] WHERE id = @id`, { id });
  }

  // Cost Categories
  async getCostCategories(): Promise<CostCategory[]> {
    return await this.executeQuery<CostCategory>(`
      SELECT * FROM [${this.schema}].[costCategories] ORDER BY [name]
    `);
  }

  async createCostCategory(category: InsertCostCategory): Promise<CostCategory> {
    return await this.executeInsert<CostCategory>('costCategories', category);
  }

  async updateCostCategory(id: number, category: Partial<InsertCostCategory>): Promise<CostCategory> {
    return await this.executeUpdate<CostCategory>('costCategories', id, {
      ...category,
      updatedAt: new Date()
    });
  }

  async deleteCostCategory(id: number): Promise<void> {
    await this.executeQuery(`DELETE FROM [${this.schema}].[costCategories] WHERE id = @id`, { id });
  }

  // Campaign Costs (implementação simplificada)
  async getCampaignCosts(filters?: {
    campaignId?: number;
    referenceMonth?: string;
    status?: string;
    userId?: number;
  }): Promise<CampaignCostWithRelations[]> {
    let whereConditions: string[] = [];
    const params: Record<string, any> = {};
    
    if (filters?.campaignId) {
      whereConditions.push('cc.campaignId = @campaignId');
      params.campaignId = filters.campaignId;
    }
    
    if (filters?.referenceMonth) {
      whereConditions.push('cc.referenceMonth = @referenceMonth');
      params.referenceMonth = filters.referenceMonth;
    }
    
    if (filters?.status) {
      whereConditions.push('cc.status = @status');
      params.status = filters.status;
    }
    
    if (filters?.userId) {
      whereConditions.push('cc.userId = @userId');
      params.userId = filters.userId;
    }
    
    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
    
    return await this.executeQuery<CampaignCostWithRelations>(`
      SELECT 
        cc.*,
        c.name as campaign_name,
        cl.companyName as client_companyName,
        u.firstName + ' ' + u.lastName as user_name,
        cat.name as category_name
      FROM [${this.schema}].[campaignCosts] cc
      INNER JOIN [${this.schema}].[campaigns] c ON cc.campaignId = c.id
      INNER JOIN [${this.schema}].[clients] cl ON c.clientId = cl.id
      INNER JOIN [${this.schema}].[users] u ON cc.userId = u.id
      LEFT JOIN [${this.schema}].[costCategories] cat ON cc.categoryId = cat.id
      ${whereClause}
      ORDER BY cc.createdAt DESC
    `, params);
  }

  async createCampaignCost(campaignCost: InsertCampaignCost): Promise<CampaignCost> {
    return await this.executeInsert<CampaignCost>('campaignCosts', campaignCost);
  }

  async updateCampaignCost(id: number, campaignCost: Partial<InsertCampaignCost>): Promise<CampaignCost> {
    return await this.executeUpdate<CampaignCost>('campaignCosts', id, {
      ...campaignCost,
      updatedAt: new Date()
    });
  }

  async inactivateCampaignCost(id: number, userId: number): Promise<CampaignCost> {
    return await this.executeUpdate<CampaignCost>('campaignCosts', id, {
      status: 'INATIVO',
      inactivatedAt: new Date(),
      inactivatedBy: userId,
      updatedAt: new Date()
    });
  }

  async reactivateCampaignCost(id: number): Promise<CampaignCost> {
    return await this.executeUpdate<CampaignCost>('campaignCosts', id, {
      status: 'ATIVO',
      inactivatedAt: null,
      inactivatedBy: null,
      updatedAt: new Date()
    });
  }

  async getCampaignCostsTotals(filters?: {
    campaignId?: number;
    referenceMonth?: string;
    status?: string;
    userId?: number;
  }): Promise<{ total: number; count: number; }> {
    let whereConditions: string[] = [];
    const params: Record<string, any> = {};
    
    if (filters?.campaignId) {
      whereConditions.push('campaignId = @campaignId');
      params.campaignId = filters.campaignId;
    }
    
    if (filters?.referenceMonth) {
      whereConditions.push('referenceMonth = @referenceMonth');
      params.referenceMonth = filters.referenceMonth;
    }
    
    if (filters?.status) {
      whereConditions.push('status = @status');
      params.status = filters.status;
    }
    
    if (filters?.userId) {
      whereConditions.push('userId = @userId');
      params.userId = filters.userId;
    }
    
    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
    
    const result = await this.executeQuery(`
      SELECT 
        SUM(CAST([amount] AS DECIMAL(12,2))) as total,
        COUNT(*) as count
      FROM [${this.schema}].[campaignCosts]
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