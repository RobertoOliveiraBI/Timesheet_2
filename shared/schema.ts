import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
  decimal,
  date,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table with password authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  password: varchar("password", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { enum: ["MASTER", "ADMIN", "GESTOR", "COLABORADOR"] }).notNull().default("COLABORADOR"),
  position: varchar("position"),
  isManager: boolean("is_manager").default(false),
  managerId: integer("manager_id"),
  contractType: varchar("contract_type", { enum: ["CLT", "PJ"] }),
  costCenter: varchar("cost_center", { enum: ["GBrasil", "GTodos", "PPR"] }),
  department: varchar("department", { enum: ["Criação", "Conteúdo", "Design", "Mídia"] }),
  contractStartDate: date("contract_start_date"),
  contractEndDate: date("contract_end_date"),
  contractValue: decimal("contract_value", { precision: 10, scale: 2 }),
  companyName: varchar("company_name"), // For PJ
  cnpj: varchar("cnpj"), // For PJ
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Economic groups
export const economicGroups = pgTable("economic_groups", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Clients
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  tradeName: varchar("trade_name", { length: 255 }),
  cnpj: varchar("cnpj", { length: 18 }),
  email: varchar("email"),
  economicGroupId: integer("economic_group_id").references(() => economicGroups.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Campaigns
export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  contractStartDate: date("contract_start_date"),
  contractEndDate: date("contract_end_date"),
  contractValue: decimal("contract_value", { precision: 12, scale: 2 }),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Campaign user access
export const campaignUsers = pgTable("campaign_users", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").references(() => campaigns.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Task types
export const taskTypes = pgTable("task_types", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  color: varchar("color", { length: 7 }).default("#3b82f6"), // Hex color
  isBillable: boolean("is_billable").default(true),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Time entries
export const timeEntries = pgTable("time_entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  date: date("date").notNull(),
  campaignId: integer("campaign_id").references(() => campaigns.id).notNull(),
  taskTypeId: integer("task_type_id").references(() => taskTypes.id).notNull(),
  hours: decimal("hours", { precision: 4, scale: 2 }).notNull(), // Supports 15-minute increments (0.25)
  description: text("description"),
  status: varchar("status", { enum: ["DRAFT", "PENDING", "APPROVED", "REJECTED"] }).default("DRAFT"),
  submittedAt: timestamp("submitted_at"),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewComment: text("review_comment"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  manager: one(users, {
    fields: [users.managerId],
    references: [users.id],
  }),
  subordinates: many(users),
  timeEntries: many(timeEntries),
  reviewedEntries: many(timeEntries),
  campaignAccess: many(campaignUsers),
}));

export const economicGroupsRelations = relations(economicGroups, ({ many }) => ({
  clients: many(clients),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  economicGroup: one(economicGroups, {
    fields: [clients.economicGroupId],
    references: [economicGroups.id],
  }),
  campaigns: many(campaigns),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  client: one(clients, {
    fields: [campaigns.clientId],
    references: [clients.id],
  }),
  timeEntries: many(timeEntries),
  userAccess: many(campaignUsers),
}));

export const campaignUsersRelations = relations(campaignUsers, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaignUsers.campaignId],
    references: [campaigns.id],
  }),
  user: one(users, {
    fields: [campaignUsers.userId],
    references: [users.id],
  }),
}));

export const taskTypesRelations = relations(taskTypes, ({ many }) => ({
  timeEntries: many(timeEntries),
}));

export const timeEntriesRelations = relations(timeEntries, ({ one }) => ({
  user: one(users, {
    fields: [timeEntries.userId],
    references: [users.id],
  }),
  campaign: one(campaigns, {
    fields: [timeEntries.campaignId],
    references: [campaigns.id],
  }),
  taskType: one(taskTypes, {
    fields: [timeEntries.taskTypeId],
    references: [taskTypes.id],
  }),
  reviewer: one(users, {
    fields: [timeEntries.reviewedBy],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEconomicGroupSchema = createInsertSchema(economicGroups).omit({
  id: true,
  createdAt: true,
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  createdAt: true,
}).extend({
  contractValue: z.union([z.string(), z.number()]).optional().nullable(),
});

export const insertTaskTypeSchema = createInsertSchema(taskTypes).omit({
  id: true,
  createdAt: true,
});

export const insertTimeEntrySchema = createInsertSchema(timeEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  submittedAt: true,
  reviewedAt: true,
});

export const insertCampaignUserSchema = createInsertSchema(campaignUsers).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertEconomicGroup = z.infer<typeof insertEconomicGroupSchema>;
export type EconomicGroup = typeof economicGroups.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Campaign = typeof campaigns.$inferSelect;
export type InsertTaskType = z.infer<typeof insertTaskTypeSchema>;
export type TaskType = typeof taskTypes.$inferSelect;
export type InsertTimeEntry = z.infer<typeof insertTimeEntrySchema>;
export type TimeEntry = typeof timeEntries.$inferSelect;
export type InsertCampaignUser = z.infer<typeof insertCampaignUserSchema>;
export type CampaignUser = typeof campaignUsers.$inferSelect;

// System configuration
export const systemConfig = pgTable("system_config", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 255 }).unique().notNull(),
  value: jsonb("value"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schema for system config
export const insertSystemConfigSchema = createInsertSchema(systemConfig).omit({
  id: true,
  updatedAt: true,
});

// Type for system config
export type InsertSystemConfig = z.infer<typeof insertSystemConfigSchema>;
export type SystemConfig = typeof systemConfig.$inferSelect;

// Extended types with relations
export type TimeEntryWithRelations = TimeEntry & {
  user: User;
  campaign: Campaign & { client: Client & { economicGroup: EconomicGroup | null } };
  taskType: TaskType;
  reviewer?: User;
};

export type CampaignWithRelations = Campaign & {
  client: Client & { economicGroup: EconomicGroup | null };
  userAccess: (CampaignUser & { user: User })[];
};

export type UserWithRelations = User & {
  manager?: User;
  subordinates: User[];
};
