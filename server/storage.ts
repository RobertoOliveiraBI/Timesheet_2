import {
  users,
  economicGroups,
  clients,
  campaigns,
  campaignUsers,
  taskTypes,
  campaignTasks,
  timeEntries,
  departments,
  costCenters,
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
  type InsertCampaignUser,
  type CampaignUser,
  type TimeEntryWithRelations,
  type CampaignWithRelations,
  systemConfig,
  type SystemConfig,
  type InsertSystemConfig,
  type Department,
  type InsertDepartment,
  type CostCenter,
  type InsertCostCenter,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, sql, gte, lte, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  upsertUser(user: any): Promise<User>;
  
  // Economic Groups
  createEconomicGroup(group: InsertEconomicGroup): Promise<EconomicGroup>;
  getEconomicGroups(): Promise<EconomicGroup[]>;
  updateEconomicGroup(id: number, group: Partial<InsertEconomicGroup>): Promise<EconomicGroup>;
  
  // Clients
  createClient(client: InsertClient): Promise<Client>;
  getClients(): Promise<Client[]>;
  getClientsByEconomicGroup(groupId: number): Promise<Client[]>;
  updateClient(id: number, client: Partial<InsertClient>): Promise<Client>;
  
  // Campaigns
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  getCampaigns(): Promise<CampaignWithRelations[]>;
  getCampaignsByUser(userId: number): Promise<CampaignWithRelations[]>;
  updateCampaign(id: number, campaign: Partial<InsertCampaign>): Promise<Campaign>;
  addUserToCampaign(campaignId: number, userId: number): Promise<void>;
  removeUserFromCampaign(campaignId: number, userId: number): Promise<void>;
  
  // Task Types
  createTaskType(taskType: InsertTaskType): Promise<TaskType>;
  getTaskTypes(): Promise<TaskType[]>;
  updateTaskType(id: number, taskType: Partial<InsertTaskType>): Promise<TaskType>;
  
  // Campaign Tasks
  createCampaignTask(campaignTask: InsertCampaignTask): Promise<CampaignTask>;
  getCampaignTasks(campaignId?: number): Promise<CampaignTaskWithRelations[]>;
  updateCampaignTask(id: number, campaignTask: Partial<InsertCampaignTask>): Promise<CampaignTask>;
  deleteCampaignTask(id: number): Promise<void>;
  
  // Time Entries
  createTimeEntry(timeEntry: InsertTimeEntry): Promise<TimeEntry>;
  getTimeEntries(userId?: number, status?: string, fromDate?: string, toDate?: string): Promise<TimeEntryWithRelations[]>;
  deleteTimeEntry(id: number): Promise<void>;
  getTimeEntriesByUser(userId: number, fromDate?: string, toDate?: string): Promise<TimeEntryWithRelations[]>;
  getPendingTimeEntries(managerId?: number): Promise<TimeEntryWithRelations[]>;
  updateTimeEntry(id: number, timeEntry: Partial<InsertTimeEntry>): Promise<TimeEntry>;
  submitTimeEntry(id: number, userId: number): Promise<TimeEntry>;
  approveTimeEntry(id: number, reviewerId: number, comment?: string): Promise<TimeEntry>;
  rejectTimeEntry(id: number, reviewerId: number, comment?: string): Promise<TimeEntry>;
  
  // Reports
  getUserTimeStats(userId: number, fromDate?: string, toDate?: string): Promise<{
    totalHours: number;
    billableHours: number;
    nonBillableHours: number;
    approvedHours: number;
    pendingHours: number;
  }>;
  getTeamTimeStats(managerId: number, fromDate?: string, toDate?: string): Promise<{
    totalHours: number;
    billableHours: number;
    utilization: number;
    activeUsers: number;
  }>;

  // System configuration operations
  getSystemConfig(): Promise<Record<string, any>>;
  updateSystemConfig(config: Record<string, any>): Promise<void>;

  // Admin operations
  getAllUsers(): Promise<User[]>;
  deleteUser(id: number): Promise<void>;
  deleteEconomicGroup(id: number): Promise<void>;
  deleteClient(id: number): Promise<void>;
  deleteCampaign(id: number): Promise<void>;
  deleteTaskType(id: number): Promise<void>;
  
  // Departments
  getDepartments(): Promise<Department[]>;
  createDepartment(department: InsertDepartment): Promise<Department>;
  updateDepartment(id: number, department: Partial<InsertDepartment>): Promise<Department>;
  deleteDepartment(id: number): Promise<void>;
  
  // Cost Centers
  getCostCenters(): Promise<CostCenter[]>;
  createCostCenter(costCenter: InsertCostCenter): Promise<CostCenter>;
  updateCostCenter(id: number, costCenter: Partial<InsertCostCenter>): Promise<CostCenter>;
  deleteCostCenter(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: number): Promise<User | undefined> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
      with: {
        costCenter: true,
        department: true,
        manager: true,
      },
    });
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
      with: {
        costCenter: true,
        department: true,
        manager: true,
      },
    });
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async upsertUser(userData: any): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Economic Groups
  async createEconomicGroup(group: InsertEconomicGroup): Promise<EconomicGroup> {
    const [economicGroup] = await db.insert(economicGroups).values(group).returning();
    return economicGroup;
  }

  async getEconomicGroups(): Promise<EconomicGroup[]> {
    return await db.select().from(economicGroups).orderBy(asc(economicGroups.name));
  }

  async updateEconomicGroup(id: number, group: Partial<InsertEconomicGroup>): Promise<EconomicGroup> {
    const [economicGroup] = await db
      .update(economicGroups)
      .set(group)
      .where(eq(economicGroups.id, id))
      .returning();
    return economicGroup;
  }

  // Clients
  async createClient(client: InsertClient): Promise<Client> {
    const [newClient] = await db.insert(clients).values(client).returning();
    return newClient;
  }

  async getClients(): Promise<Client[]> {
    return await db.select().from(clients).where(eq(clients.isActive, true)).orderBy(asc(clients.companyName));
  }

  async getClientsByEconomicGroup(groupId: number): Promise<Client[]> {
    return await db
      .select()
      .from(clients)
      .where(and(eq(clients.economicGroupId, groupId), eq(clients.isActive, true)))
      .orderBy(asc(clients.companyName));
  }

  async updateClient(id: number, client: Partial<InsertClient>): Promise<Client> {
    const [updatedClient] = await db
      .update(clients)
      .set(client)
      .where(eq(clients.id, id))
      .returning();
    return updatedClient;
  }

  // Campaigns
  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    const [newCampaign] = await db.insert(campaigns).values(campaign).returning();
    return newCampaign;
  }

  async getCampaigns(): Promise<CampaignWithRelations[]> {
    return await db.query.campaigns.findMany({
      where: eq(campaigns.isActive, true),
      with: {
        client: {
          with: {
            economicGroup: true,
          },
        },
        userAccess: {
          with: {
            user: true,
          },
        },
      },
      orderBy: [desc(campaigns.createdAt)],
    });
  }

  async getCampaignsByUser(userId: number): Promise<CampaignWithRelations[]> {
    const userCampaigns = await db.query.campaignUsers.findMany({
      where: eq(campaignUsers.userId, userId),
      with: {
        campaign: {
          with: {
            client: {
              with: {
                economicGroup: true,
              },
            },
            userAccess: {
              with: {
                user: true,
              },
            },
          },
        },
      },
    });

    return userCampaigns
      .filter(uc => uc.campaign.isActive)
      .map(uc => uc.campaign);
  }

  async updateCampaign(id: number, campaign: Partial<InsertCampaign>): Promise<Campaign> {
    const [updatedCampaign] = await db
      .update(campaigns)
      .set(campaign)
      .where(eq(campaigns.id, id))
      .returning();
    return updatedCampaign;
  }

  async addUserToCampaign(campaignId: number, userId: number): Promise<void> {
    await db.insert(campaignUsers).values({
      campaignId,
      userId,
    });
  }

  async removeUserFromCampaign(campaignId: number, userId: number): Promise<void> {
    await db
      .delete(campaignUsers)
      .where(and(eq(campaignUsers.campaignId, campaignId), eq(campaignUsers.userId, userId)));
  }

  // Task Types
  async createTaskType(taskType: InsertTaskType): Promise<TaskType> {
    const [newTaskType] = await db.insert(taskTypes).values(taskType).returning();
    return newTaskType;
  }

  async getTaskTypes(): Promise<TaskType[]> {
    return await db
      .select()
      .from(taskTypes)
      .where(eq(taskTypes.isActive, true))
      .orderBy(asc(taskTypes.name));
  }

  async updateTaskType(id: number, taskType: Partial<InsertTaskType>): Promise<TaskType> {
    const [updatedTaskType] = await db
      .update(taskTypes)
      .set(taskType)
      .where(eq(taskTypes.id, id))
      .returning();
    return updatedTaskType;
  }

  // Campaign Tasks
  async createCampaignTask(campaignTask: InsertCampaignTask): Promise<CampaignTask> {
    const [newCampaignTask] = await db.insert(campaignTasks).values(campaignTask).returning();
    return newCampaignTask;
  }

  async getCampaignTasks(campaignId?: number): Promise<CampaignTaskWithRelations[]> {
    const conditions = [];
    
    if (campaignId) {
      conditions.push(eq(campaignTasks.campaignId, campaignId));
    }
    
    conditions.push(eq(campaignTasks.isActive, true));

    return await db.query.campaignTasks.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        campaign: true,
        taskType: true,
      },
      orderBy: [asc(campaignTasks.description)],
    });
  }

  async updateCampaignTask(id: number, campaignTask: Partial<InsertCampaignTask>): Promise<CampaignTask> {
    const [updatedCampaignTask] = await db
      .update(campaignTasks)
      .set(campaignTask)
      .where(eq(campaignTasks.id, id))
      .returning();
    return updatedCampaignTask;
  }

  async deleteCampaignTask(id: number): Promise<void> {
    await db
      .update(campaignTasks)
      .set({ isActive: false })
      .where(eq(campaignTasks.id, id));
  }

  // Time Entries
  async createTimeEntry(timeEntry: InsertTimeEntry): Promise<TimeEntry> {
    const [newTimeEntry] = await db.insert(timeEntries).values(timeEntry).returning();
    return newTimeEntry;
  }

  async getTimeEntries(userId?: number, status?: string, fromDate?: string, toDate?: string): Promise<TimeEntryWithRelations[]> {
    const conditions = [];
    
    if (userId) {
      conditions.push(eq(timeEntries.userId, userId));
    }
    
    if (status) {
      conditions.push(eq(timeEntries.status, status as any));
    }
    
    if (fromDate) {
      conditions.push(gte(timeEntries.date, fromDate));
    }
    
    if (toDate) {
      conditions.push(lte(timeEntries.date, toDate));
    }

    return await db.query.timeEntries.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        user: true,
        campaign: {
          with: {
            client: {
              with: {
                economicGroup: true,
              },
            },
          },
        },
        campaignTask: {
          with: {
            taskType: true,
          },
        },
        reviewer: true,
      },
      orderBy: [desc(timeEntries.date), desc(timeEntries.createdAt)],
    });
  }

  async getTimeEntriesByUser(userId: number, fromDate?: string, toDate?: string): Promise<TimeEntryWithRelations[]> {
    const conditions = [eq(timeEntries.userId, userId)];
    
    if (fromDate) {
      conditions.push(gte(timeEntries.date, fromDate));
    }
    
    if (toDate) {
      conditions.push(lte(timeEntries.date, toDate));
    }

    try {
      return await db.query.timeEntries.findMany({
        where: and(...conditions),
        with: {
          user: true,
          campaign: {
            with: {
              client: {
                with: {
                  economicGroup: true,
                },
              },
            },
          },
          campaignTask: {
            with: {
              taskType: true,
            },
          },
          reviewer: true,
        },
        orderBy: [desc(timeEntries.date), desc(timeEntries.createdAt)],
      });
    } catch (error) {
      console.error("Error in getTimeEntriesByUser:", error);
      // Fallback to simple query if relations fail
      const simpleEntries = await db.select().from(timeEntries).where(and(...conditions));
      return simpleEntries as TimeEntryWithRelations[];
    }
  }

  async getPendingTimeEntries(managerId?: number): Promise<TimeEntryWithRelations[]> {
    let userIds: number[] | undefined;
    
    if (managerId) {
      // Get subordinates of the manager
      const subordinates = await db.select().from(users).where(eq(users.managerId, managerId));
      userIds = subordinates.map(u => u.id);
      
      if (userIds.length === 0) {
        return [];
      }
    }

    const conditions = [eq(timeEntries.status, "VALIDACAO")];
    
    if (userIds) {
      conditions.push(inArray(timeEntries.userId, userIds));
    }

    return await db.query.timeEntries.findMany({
      where: and(...conditions),
      with: {
        user: true,
        campaign: {
          with: {
            client: {
              with: {
                economicGroup: true,
              },
            },
          },
        },
        campaignTask: {
          with: {
            taskType: true,
          },
        },
        reviewer: true,
      },
      orderBy: [asc(timeEntries.date), asc(timeEntries.createdAt)],
    });
  }

  async updateTimeEntry(id: number, timeEntry: any): Promise<TimeEntry> {
    const updateData: any = {
      ...timeEntry,
      updatedAt: new Date(),
    };
    
    // Convert ISO string dates to Date objects if needed
    if (updateData.reviewedAt && typeof updateData.reviewedAt === 'string') {
      updateData.reviewedAt = new Date(updateData.reviewedAt);
    }
    if (updateData.submittedAt && typeof updateData.submittedAt === 'string') {
      updateData.submittedAt = new Date(updateData.submittedAt);
    }
    
    const [updatedTimeEntry] = await db
      .update(timeEntries)
      .set(updateData)
      .where(eq(timeEntries.id, id))
      .returning();
    return updatedTimeEntry;
  }

  async submitTimeEntry(id: number, userId: number): Promise<TimeEntry> {
    const [timeEntry] = await db
      .update(timeEntries)
      .set({
        status: "VALIDACAO",
        submittedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(timeEntries.id, id), eq(timeEntries.userId, userId)))
      .returning();
    return timeEntry;
  }

  async approveTimeEntry(id: number, reviewerId: number, comment?: string): Promise<TimeEntry> {
    const [timeEntry] = await db
      .update(timeEntries)
      .set({
        status: "APROVADO",
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        reviewComment: comment,
        updatedAt: new Date(),
      })
      .where(eq(timeEntries.id, id))
      .returning();
    return timeEntry;
  }

  async rejectTimeEntry(id: number, reviewerId: number, comment?: string): Promise<TimeEntry> {
    const [timeEntry] = await db
      .update(timeEntries)
      .set({
        status: "REJEITADO",
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        reviewComment: comment,
        updatedAt: new Date(),
      })
      .where(eq(timeEntries.id, id))
      .returning();
    return timeEntry;
  }

  // Reports
  async getUserTimeStats(userId: number, fromDate?: string, toDate?: string): Promise<{
    totalHours: number;
    billableHours: number;
    nonBillableHours: number;
    approvedHours: number;
    pendingHours: number;
  }> {
    const conditions = [eq(timeEntries.userId, userId)];
    
    if (fromDate) {
      conditions.push(gte(timeEntries.date, fromDate));
    }
    
    if (toDate) {
      conditions.push(lte(timeEntries.date, toDate));
    }

    const entries = await db.query.timeEntries.findMany({
      where: and(...conditions),
      with: {
        campaignTask: {
          with: {
            taskType: true,
          },
        },
      },
    });

    const stats = entries.reduce((acc, entry) => {
      const hours = parseFloat(entry.hours);
      acc.totalHours += hours;
      
      if (entry.campaignTask.taskType.isBillable) {
        acc.billableHours += hours;
      } else {
        acc.nonBillableHours += hours;
      }
      
      if (entry.status === "APROVADO") {
        acc.approvedHours += hours;
      } else if (entry.status === "VALIDACAO") {
        acc.pendingHours += hours;
      }
      
      return acc;
    }, {
      totalHours: 0,
      billableHours: 0,
      nonBillableHours: 0,
      approvedHours: 0,
      pendingHours: 0,
    });

    return stats;
  }

  async getTeamTimeStats(managerId: number, fromDate?: string, toDate?: string): Promise<{
    totalHours: number;
    billableHours: number;
    utilization: number;
    activeUsers: number;
  }> {
    // Get subordinates
    const subordinates = await db.select().from(users).where(eq(users.managerId, managerId));
    const userIds = subordinates.map(u => u.id);
    
    if (userIds.length === 0) {
      return {
        totalHours: 0,
        billableHours: 0,
        utilization: 0,
        activeUsers: 0,
      };
    }

    const conditions = [inArray(timeEntries.userId, userIds)];
    
    if (fromDate) {
      conditions.push(gte(timeEntries.date, fromDate));
    }
    
    if (toDate) {
      conditions.push(lte(timeEntries.date, toDate));
    }

    const entries = await db.query.timeEntries.findMany({
      where: and(...conditions),
      with: {
        campaignTask: {
          with: {
            taskType: true,
          },
        },
      },
    });

    const activeUsers = new Set(entries.map(e => e.userId)).size;
    
    const stats = entries.reduce((acc, entry) => {
      const hours = parseFloat(entry.hours);
      acc.totalHours += hours;
      
      if (entry.campaignTask.taskType.isBillable) {
        acc.billableHours += hours;
      }
      
      return acc;
    }, {
      totalHours: 0,
      billableHours: 0,
    });

    const utilization = stats.totalHours > 0 ? (stats.billableHours / stats.totalHours) * 100 : 0;

    return {
      ...stats,
      utilization: Math.round(utilization),
      activeUsers,
    };
  }

  // System configuration operations
  async getSystemConfig(): Promise<Record<string, any>> {
    const configs = await db.select().from(systemConfig);
    const result: Record<string, any> = {};
    
    for (const config of configs) {
      result[config.key] = config.value;
    }
    
    // Set defaults if not configured
    return {
      fechamento_automatico: false,
      notificacao_email: true,
      backup_automatico: true,
      ...result,
    };
  }

  async updateSystemConfig(config: Record<string, any>): Promise<void> {
    for (const [key, value] of Object.entries(config)) {
      await db
        .insert(systemConfig)
        .values({ key, value })
        .onConflictDoUpdate({
          target: systemConfig.key,
          set: { value, updatedAt: new Date() },
        });
    }
  }

  // Admin operations
  async getAllUsers(): Promise<User[]> {
    return await db.query.users.findMany({
      with: {
        costCenter: true,
        department: true,
        manager: true,
      },
      orderBy: [asc(users.firstName), asc(users.lastName)],
    });
  }

  async updateUserAdmin(id: number, userData: Partial<InsertUser>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({
        ...userData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async deleteUser(id: number): Promise<void> {
    // Check if user has time entries
    const timeEntryCount = await db
      .select({ count: sql`count(*)` })
      .from(timeEntries)
      .where(eq(timeEntries.userId, id));
    
    if (Number(timeEntryCount[0].count) > 0) {
      // Soft delete by setting isActive to false
      await db
        .update(users)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(users.id, id));
    } else {
      // Hard delete if no time entries
      await db.delete(users).where(eq(users.id, id));
    }
  }

  async deleteEconomicGroup(id: number): Promise<void> {
    await db.delete(economicGroups).where(eq(economicGroups.id, id));
  }

  async deleteClient(id: number): Promise<void> {
    await db.delete(clients).where(eq(clients.id, id));
  }

  async deleteCampaign(id: number): Promise<void> {
    // Delete campaign users first
    await db.delete(campaignUsers).where(eq(campaignUsers.campaignId, id));
    // Delete campaign
    await db.delete(campaigns).where(eq(campaigns.id, id));
  }

  async deleteTaskType(id: number): Promise<void> {
    await db.delete(taskTypes).where(eq(taskTypes.id, id));
  }

  async deleteTimeEntry(id: number): Promise<void> {
    await db.delete(timeEntries).where(eq(timeEntries.id, id));
  }

  // Departments
  async getDepartments(): Promise<Department[]> {
    return await db.select().from(departments).orderBy(asc(departments.name));
  }

  async createDepartment(departmentData: InsertDepartment): Promise<Department> {
    const [department] = await db
      .insert(departments)
      .values(departmentData)
      .returning();
    return department;
  }

  async updateDepartment(id: number, departmentData: Partial<InsertDepartment>): Promise<Department> {
    const [updatedDepartment] = await db
      .update(departments)
      .set({
        ...departmentData,
        updatedAt: new Date(),
      })
      .where(eq(departments.id, id))
      .returning();
    return updatedDepartment;
  }

  async deleteDepartment(id: number): Promise<void> {
    // Check if department has users
    const userCount = await db
      .select({ count: sql`count(*)` })
      .from(users)
      .where(eq(users.departmentId, id));
    
    if (Number(userCount[0].count) > 0) {
      // Soft delete by setting isActive to false
      await db
        .update(departments)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(departments.id, id));
    } else {
      // Hard delete if no users assigned
      await db.delete(departments).where(eq(departments.id, id));
    }
  }

  // Cost Centers
  async getCostCenters(): Promise<CostCenter[]> {
    return await db.select().from(costCenters).orderBy(asc(costCenters.name));
  }

  async createCostCenter(costCenterData: InsertCostCenter): Promise<CostCenter> {
    const [costCenter] = await db
      .insert(costCenters)
      .values(costCenterData)
      .returning();
    return costCenter;
  }

  async updateCostCenter(id: number, costCenterData: Partial<InsertCostCenter>): Promise<CostCenter> {
    const [updatedCostCenter] = await db
      .update(costCenters)
      .set({
        ...costCenterData,
        updatedAt: new Date(),
      })
      .where(eq(costCenters.id, id))
      .returning();
    return updatedCostCenter;
  }

  async deleteCostCenter(id: number): Promise<void> {
    // Check if cost center has users
    const userCount = await db
      .select({ count: sql`count(*)` })
      .from(users)
      .where(eq(users.costCenterId, id));
    
    if (Number(userCount[0].count) > 0) {
      // Soft delete by setting isActive to false
      await db
        .update(costCenters)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(costCenters.id, id));
    } else {
      // Hard delete if no users assigned
      await db.delete(costCenters).where(eq(costCenters.id, id));
    }
  }
}

export const storage = new DatabaseStorage();
