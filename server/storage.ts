import {
  users,
  economicGroups,
  clients,
  campaigns,
  campaignUsers,
  taskTypes,
  timeEntries,
  type User,
  type UpsertUser,
  type InsertEconomicGroup,
  type EconomicGroup,
  type InsertClient,
  type Client,
  type InsertCampaign,
  type Campaign,
  type InsertTaskType,
  type TaskType,
  type InsertTimeEntry,
  type TimeEntry,
  type InsertCampaignUser,
  type TimeEntryWithRelations,
  type CampaignWithRelations,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, sql, gte, lte, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
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
  getCampaignsByUser(userId: string): Promise<CampaignWithRelations[]>;
  updateCampaign(id: number, campaign: Partial<InsertCampaign>): Promise<Campaign>;
  addUserToCampaign(campaignId: number, userId: string): Promise<void>;
  removeUserFromCampaign(campaignId: number, userId: string): Promise<void>;
  
  // Task Types
  createTaskType(taskType: InsertTaskType): Promise<TaskType>;
  getTaskTypes(): Promise<TaskType[]>;
  updateTaskType(id: number, taskType: Partial<InsertTaskType>): Promise<TaskType>;
  
  // Time Entries
  createTimeEntry(timeEntry: InsertTimeEntry): Promise<TimeEntry>;
  getTimeEntries(userId?: string, status?: string, fromDate?: string, toDate?: string): Promise<TimeEntryWithRelations[]>;
  getTimeEntriesByUser(userId: string, fromDate?: string, toDate?: string): Promise<TimeEntryWithRelations[]>;
  getPendingTimeEntries(managerId?: string): Promise<TimeEntryWithRelations[]>;
  updateTimeEntry(id: number, timeEntry: Partial<InsertTimeEntry>): Promise<TimeEntry>;
  submitTimeEntry(id: number, userId: string): Promise<TimeEntry>;
  approveTimeEntry(id: number, reviewerId: string, comment?: string): Promise<TimeEntry>;
  rejectTimeEntry(id: number, reviewerId: string, comment?: string): Promise<TimeEntry>;
  
  // Reports
  getUserTimeStats(userId: string, fromDate?: string, toDate?: string): Promise<{
    totalHours: number;
    billableHours: number;
    nonBillableHours: number;
    approvedHours: number;
    pendingHours: number;
  }>;
  getTeamTimeStats(managerId: string, fromDate?: string, toDate?: string): Promise<{
    totalHours: number;
    billableHours: number;
    utilization: number;
    activeUsers: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
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

  async getCampaignsByUser(userId: string): Promise<CampaignWithRelations[]> {
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

  async addUserToCampaign(campaignId: number, userId: string): Promise<void> {
    await db.insert(campaignUsers).values({
      campaignId,
      userId,
    });
  }

  async removeUserFromCampaign(campaignId: number, userId: string): Promise<void> {
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

  // Time Entries
  async createTimeEntry(timeEntry: InsertTimeEntry): Promise<TimeEntry> {
    const [newTimeEntry] = await db.insert(timeEntries).values(timeEntry).returning();
    return newTimeEntry;
  }

  async getTimeEntries(userId?: string, status?: string, fromDate?: string, toDate?: string): Promise<TimeEntryWithRelations[]> {
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
        taskType: true,
        reviewer: true,
      },
      orderBy: [desc(timeEntries.date), desc(timeEntries.createdAt)],
    });
  }

  async getTimeEntriesByUser(userId: string, fromDate?: string, toDate?: string): Promise<TimeEntryWithRelations[]> {
    return this.getTimeEntries(userId, undefined, fromDate, toDate);
  }

  async getPendingTimeEntries(managerId?: string): Promise<TimeEntryWithRelations[]> {
    let userIds: string[] | undefined;
    
    if (managerId) {
      // Get subordinates of the manager
      const subordinates = await db.select().from(users).where(eq(users.managerId, managerId));
      userIds = subordinates.map(u => u.id);
      
      if (userIds.length === 0) {
        return [];
      }
    }

    const conditions = [eq(timeEntries.status, "PENDING")];
    
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
        taskType: true,
        reviewer: true,
      },
      orderBy: [asc(timeEntries.date), asc(timeEntries.createdAt)],
    });
  }

  async updateTimeEntry(id: number, timeEntry: Partial<InsertTimeEntry>): Promise<TimeEntry> {
    const [updatedTimeEntry] = await db
      .update(timeEntries)
      .set({
        ...timeEntry,
        updatedAt: new Date(),
      })
      .where(eq(timeEntries.id, id))
      .returning();
    return updatedTimeEntry;
  }

  async submitTimeEntry(id: number, userId: string): Promise<TimeEntry> {
    const [timeEntry] = await db
      .update(timeEntries)
      .set({
        status: "PENDING",
        submittedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(timeEntries.id, id), eq(timeEntries.userId, userId)))
      .returning();
    return timeEntry;
  }

  async approveTimeEntry(id: number, reviewerId: string, comment?: string): Promise<TimeEntry> {
    const [timeEntry] = await db
      .update(timeEntries)
      .set({
        status: "APPROVED",
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        reviewComment: comment,
        updatedAt: new Date(),
      })
      .where(eq(timeEntries.id, id))
      .returning();
    return timeEntry;
  }

  async rejectTimeEntry(id: number, reviewerId: string, comment?: string): Promise<TimeEntry> {
    const [timeEntry] = await db
      .update(timeEntries)
      .set({
        status: "REJECTED",
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
  async getUserTimeStats(userId: string, fromDate?: string, toDate?: string): Promise<{
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
        taskType: true,
      },
    });

    const stats = entries.reduce((acc, entry) => {
      const hours = parseFloat(entry.hours);
      acc.totalHours += hours;
      
      if (entry.taskType.isBillable) {
        acc.billableHours += hours;
      } else {
        acc.nonBillableHours += hours;
      }
      
      if (entry.status === "APPROVED") {
        acc.approvedHours += hours;
      } else if (entry.status === "PENDING") {
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

  async getTeamTimeStats(managerId: string, fromDate?: string, toDate?: string): Promise<{
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
        taskType: true,
      },
    });

    const activeUsers = new Set(entries.map(e => e.userId)).size;
    
    const stats = entries.reduce((acc, entry) => {
      const hours = parseFloat(entry.hours);
      acc.totalHours += hours;
      
      if (entry.taskType.isBillable) {
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
}

export const storage = new DatabaseStorage();
