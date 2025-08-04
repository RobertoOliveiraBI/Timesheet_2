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

// Departments
export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).unique().notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Cost Centers
export const costCenters = pgTable("cost_centers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).unique().notNull(),
  code: varchar("code", { length: 20 }).unique().notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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
  costCenterId: integer("cost_center_id").references(() => costCenters.id),
  departmentId: integer("department_id").references(() => departments.id),
  contractStartDate: date("contract_start_date"),
  contractEndDate: date("contract_end_date"),
  contractValue: decimal("contract_value", { precision: 10, scale: 2 }),
  companyName: varchar("company_name"), // For PJ
  cnpj: varchar("cnpj"), // For PJ
  monthlyCost: decimal("monthly_cost", { precision: 10, scale: 2 }), // Custo mensal do colaborador
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
  costCenterId: integer("cost_center_id").references(() => costCenters.id),
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

// Campaign tasks (tarefas específicas de cada campanha)
export const campaignTasks = pgTable("campaign_tasks", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").references(() => campaigns.id).notNull(),
  taskTypeId: integer("task_type_id").references(() => taskTypes.id).notNull(),
  description: text("description").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Time entries
export const timeEntries = pgTable("time_entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  date: date("date").notNull(),
  campaignId: integer("campaign_id").references(() => campaigns.id).notNull(),
  campaignTaskId: integer("campaign_task_id").references(() => campaignTasks.id).notNull(),
  hours: varchar("hours").notNull(), // Changed to varchar to accept string format like "2.5"
  description: text("description"),
  resultCenter: varchar("result_center").default("Todos"), // Centro de resultado
  status: varchar("status", { enum: ["RASCUNHO", "SALVO", "VALIDACAO", "APROVADO", "REJEITADO"] }).default("RASCUNHO"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewComment: text("review_comment"), // Mantém campo legado por compatibilidade
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Time entry comments - Sistema de comentários com histórico completo
export const timeEntryComments = pgTable("time_entry_comments", {
  id: serial("id").primaryKey(),
  timeEntryId: integer("time_entry_id").references(() => timeEntries.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(), // Autor do comentário
  comment: text("comment").notNull(), // Conteúdo do comentário
  commentType: varchar("comment_type", { enum: ["MANAGER_FEEDBACK", "COLLABORATOR_RESPONSE"] }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  // Índices para performance
  index("idx_time_entry_comments_entry").on(table.timeEntryId),
  index("idx_time_entry_comments_user").on(table.userId),
  index("idx_time_entry_comments_created").on(table.createdAt),
]);

// Cost categories table (categorias de custo)
export const costCategories = pgTable("cost_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).unique().notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Campaign costs (custos de campanha)
export const campaignCosts = pgTable("campaign_costs", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").references(() => campaigns.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(), // Quem lançou o custo
  subject: varchar("subject", { length: 255 }).notNull(), // Assunto obrigatório
  description: text("description"), // Descrição opcional
  referenceMonth: varchar("reference_month", { length: 7 }).notNull(), // YYYY-MM format
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(), // Valor obrigatório
  notes: text("notes"), // Observações opcionais
  // Novos campos adicionados conforme solicitação
  cnpjFornecedor: varchar("cnpj_fornecedor", { length: 18 }), // CNPJ do fornecedor (opcional)
  razaoSocial: varchar("razao_social", { length: 255 }), // Razão social (opcional)
  categoryId: integer("category_id").references(() => costCategories.id), // Categoria (opcional, mas recomendada)
  status: varchar("status", { enum: ["ATIVO", "INATIVO"] }).default("ATIVO"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  inactivatedAt: timestamp("inactivated_at"),
  inactivatedBy: integer("inactivated_by").references(() => users.id),
}, (table) => [
  // Índices para performance em filtros frequentes
  index("idx_campaign_costs_campaign").on(table.campaignId),
  index("idx_campaign_costs_month").on(table.referenceMonth),
  index("idx_campaign_costs_status").on(table.status),
  index("idx_campaign_costs_user").on(table.userId),
  index("idx_campaign_costs_category").on(table.categoryId),
]);

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
  campaignCosts: many(campaignCosts),
  timeEntryComments: many(timeEntryComments),
  department: one(departments, {
    fields: [users.departmentId],
    references: [departments.id],
  }),
  costCenter: one(costCenters, {
    fields: [users.costCenterId],
    references: [costCenters.id],
  }),
}));

export const departmentsRelations = relations(departments, ({ many }) => ({
  users: many(users),
}));

export const costCentersRelations = relations(costCenters, ({ many }) => ({
  users: many(users),
  campaigns: many(campaigns),
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
  costCenter: one(costCenters, {
    fields: [campaigns.costCenterId],
    references: [costCenters.id],
  }),
  timeEntries: many(timeEntries),
  userAccess: many(campaignUsers),
  tasks: many(campaignTasks),
  costs: many(campaignCosts),
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
  campaignTasks: many(campaignTasks),
}));

export const campaignTasksRelations = relations(campaignTasks, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaignTasks.campaignId],
    references: [campaigns.id],
  }),
  taskType: one(taskTypes, {
    fields: [campaignTasks.taskTypeId],
    references: [taskTypes.id],
  }),
}));

export const timeEntriesRelations = relations(timeEntries, ({ one, many }) => ({
  user: one(users, {
    fields: [timeEntries.userId],
    references: [users.id],
  }),
  campaign: one(campaigns, {
    fields: [timeEntries.campaignId],
    references: [campaigns.id],
  }),
  campaignTask: one(campaignTasks, {
    fields: [timeEntries.campaignTaskId],
    references: [campaignTasks.id],
  }),
  reviewer: one(users, {
    fields: [timeEntries.reviewedBy],
    references: [users.id],
  }),
  comments: many(timeEntryComments),
}));

export const timeEntryCommentsRelations = relations(timeEntryComments, ({ one }) => ({
  timeEntry: one(timeEntries, {
    fields: [timeEntryComments.timeEntryId],
    references: [timeEntries.id],
  }),
  user: one(users, {
    fields: [timeEntryComments.userId],
    references: [users.id],
  }),
}));

export const costCategoriesRelations = relations(costCategories, ({ many }) => ({
  campaignCosts: many(campaignCosts),
}));

export const campaignCostsRelations = relations(campaignCosts, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaignCosts.campaignId],
    references: [campaigns.id],
  }),
  user: one(users, {
    fields: [campaignCosts.userId],
    references: [users.id],
  }),
  inactivatedByUser: one(users, {
    fields: [campaignCosts.inactivatedBy],
    references: [users.id],
  }),
  category: one(costCategories, {
    fields: [campaignCosts.categoryId],
    references: [costCategories.id],
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
});

export const insertTaskTypeSchema = createInsertSchema(taskTypes).omit({
  id: true,
  createdAt: true,
});

export const insertCampaignTaskSchema = createInsertSchema(campaignTasks).omit({
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

export const insertTimeEntryCommentSchema = createInsertSchema(timeEntryComments).omit({
  id: true,
  createdAt: true,
}).extend({
  comment: z.string().min(1, "Comentário não pode estar vazio").max(2000, "Comentário muito longo"),
  commentType: z.enum(["MANAGER_FEEDBACK", "COLLABORATOR_RESPONSE"]),
});

export const insertCampaignUserSchema = createInsertSchema(campaignUsers).omit({
  id: true,
  createdAt: true,
});

export const insertCostCategorySchema = createInsertSchema(costCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(1, "Nome da categoria é obrigatório").max(255, "Nome muito longo"),
});

export const insertCampaignCostSchema = createInsertSchema(campaignCosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  inactivatedAt: true,
  inactivatedBy: true,
}).extend({
  // Validações customizadas
  subject: z.string().min(1, "Assunto é obrigatório").max(255, "Assunto muito longo"),
  referenceMonth: z.string().regex(/^\d{4}-\d{2}$/, "Formato do mês deve ser YYYY-MM"),
  amount: z.union([
    z.string().transform((val) => {
      // Aceita entrada com vírgula ou ponto decimal
      const cleaned = val.replace(/[^\d.,]/g, '').replace(',', '.');
      const num = parseFloat(cleaned);
      if (isNaN(num) || num <= 0) {
        throw new Error("Valor deve ser um número positivo");
      }
      return num.toString();
    }),
    z.number().positive("Valor deve ser positivo").transform(String)
  ]),
  description: z.string().optional(),
  notes: z.string().optional(),
  // Novos campos opcionais
  cnpjFornecedor: z.string().optional().refine((val) => {
    if (!val || val.trim() === '') return true;
    // Validação básica de CNPJ (formato apenas)
    const cnpjRegex = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$|^\d{14}$/;
    return cnpjRegex.test(val.replace(/\D/g, '').replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5'));
  }, "CNPJ deve ter formato válido (XX.XXX.XXX/XXXX-XX)"),
  razaoSocial: z.string().max(255, "Razão social muito longa").optional(),
  categoryId: z.number().optional(),
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
export type InsertCampaignTask = z.infer<typeof insertCampaignTaskSchema>;
export type CampaignTask = typeof campaignTasks.$inferSelect;
export type InsertTimeEntry = z.infer<typeof insertTimeEntrySchema>;
export type TimeEntry = typeof timeEntries.$inferSelect;
export type InsertTimeEntryComment = z.infer<typeof insertTimeEntryCommentSchema>;
export type TimeEntryComment = typeof timeEntryComments.$inferSelect;
export type InsertCampaignUser = z.infer<typeof insertCampaignUserSchema>;
export type CampaignUser = typeof campaignUsers.$inferSelect;
export type InsertCostCategory = z.infer<typeof insertCostCategorySchema>;
export type CostCategory = typeof costCategories.$inferSelect;
export type InsertCampaignCost = z.infer<typeof insertCampaignCostSchema>;
export type CampaignCost = typeof campaignCosts.$inferSelect;

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

export const insertDepartmentSchema = createInsertSchema(departments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCostCenterSchema = createInsertSchema(costCenters).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Type for system config
export type InsertSystemConfig = z.infer<typeof insertSystemConfigSchema>;
export type SystemConfig = typeof systemConfig.$inferSelect;

// Types for departments and cost centers
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type Department = typeof departments.$inferSelect;
export type InsertCostCenter = z.infer<typeof insertCostCenterSchema>;
export type CostCenter = typeof costCenters.$inferSelect;

// Extended types with relations
export type TimeEntryWithRelations = TimeEntry & {
  user: User;
  campaign: Campaign & { client: Client & { economicGroup: EconomicGroup | null } };
  campaignTask: CampaignTask & { taskType: TaskType };
  reviewer: User | null;
};

export type CampaignWithRelations = Campaign & {
  client: Client & { economicGroup: EconomicGroup | null };
  userAccess: (CampaignUser & { user: User })[];
  tasks?: (CampaignTask & { taskType: TaskType })[];
};

export type CampaignTaskWithRelations = CampaignTask & {
  campaign: Campaign;
  taskType: TaskType;
};

export type UserWithRelations = User & {
  manager?: User;
  subordinates: User[];
};

export type CampaignCostWithRelations = CampaignCost & {
  campaign: Campaign & { client: Client };
  user: User;
  inactivatedByUser?: User;
  category?: CostCategory;
};

// CSV Import Schemas - Schemas específicos para importação em massa
export const csvImportUserSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  firstName: z.string().min(1, "Nome é obrigatório"),
  lastName: z.string().optional(),
  role: z.enum(["MASTER", "ADMIN", "GESTOR", "COLABORADOR"]).default("COLABORADOR"),
  position: z.string().optional(),
  isManager: z.string().transform(val => val?.toLowerCase() === 'true' || val === '1').optional(),
  managerId: z.string().transform(val => val ? parseInt(val) : undefined).optional(),
  contractType: z.enum(["CLT", "PJ"]).optional(),
  costCenterId: z.string().transform(val => val ? parseInt(val) : undefined).optional(),
  departmentId: z.string().transform(val => val ? parseInt(val) : undefined).optional(),
  contractStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$|^\d{2}\/\d{2}\/\d{4}$/, "Data deve estar no formato YYYY-MM-DD ou DD/MM/YYYY").optional(),
  contractEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$|^\d{2}\/\d{2}\/\d{4}$/, "Data deve estar no formato YYYY-MM-DD ou DD/MM/YYYY").optional(),
  contractValue: z.string().transform(val => val ? val.replace(',', '.') : undefined).optional(),
  companyName: z.string().optional(),
  cnpj: z.string().optional(),
  monthlyCost: z.string().transform(val => val ? val.replace(',', '.') : undefined).optional(),
  isActive: z.string().transform(val => val?.toLowerCase() !== 'false' && val !== '0').default("true"),
});

export const csvImportEconomicGroupSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
});

export const csvImportClientSchema = z.object({
  companyName: z.string().min(1, "Razão social é obrigatória"),
  tradeName: z.string().optional(),
  cnpj: z.string().optional(),
  email: z.string().email("Email inválido").optional(),
  economicGroupId: z.string().transform(val => val ? parseInt(val) : undefined).optional(),
  isActive: z.string().transform(val => val?.toLowerCase() !== 'false' && val !== '0').default("true"),
});

export const csvImportCampaignSchema = z.object({
  name: z.string().min(1, "Nome da campanha é obrigatório"),
  description: z.string().optional(),
  contractStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$|^\d{2}\/\d{2}\/\d{4}$/, "Data deve estar no formato YYYY-MM-DD ou DD/MM/YYYY").optional(),
  contractEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$|^\d{2}\/\d{2}\/\d{4}$/, "Data deve estar no formato YYYY-MM-DD ou DD/MM/YYYY").optional(),
  contractValue: z.string().transform(val => val ? val.replace(',', '.') : undefined).optional(),
  clientId: z.string().transform(val => parseInt(val)),
  costCenterId: z.string().transform(val => val ? parseInt(val) : undefined).optional(),
  isActive: z.string().transform(val => val?.toLowerCase() !== 'false' && val !== '0').default("true"),
});

export const csvImportDepartmentSchema = z.object({
  name: z.string().min(1, "Nome do departamento é obrigatório"),
  description: z.string().optional(),
  isActive: z.string().transform(val => val?.toLowerCase() !== 'false' && val !== '0').default("true"),
});

export const csvImportCostCenterSchema = z.object({
  name: z.string().min(1, "Nome do centro de custo é obrigatório"),
  code: z.string().min(1, "Código é obrigatório"),
  description: z.string().optional(),
  isActive: z.string().transform(val => val?.toLowerCase() !== 'false' && val !== '0').default("true"),
});

export const csvImportTaskTypeSchema = z.object({
  name: z.string().min(1, "Nome do tipo de tarefa é obrigatório"),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Cor deve estar no formato hexadecimal (#RRGGBB)").default("#3b82f6"),
  isBillable: z.string().transform(val => val?.toLowerCase() !== 'false' && val !== '0').default("true"),
  isActive: z.string().transform(val => val?.toLowerCase() !== 'false' && val !== '0').default("true"),
});

export const csvImportCostCategorySchema = z.object({
  name: z.string().min(1, "Nome da categoria é obrigatório"),
  isActive: z.string().transform(val => val?.toLowerCase() !== 'false' && val !== '0').default("true"),
});

export const csvImportCampaignCostSchema = z.object({
  campaignId: z.string().transform(val => parseInt(val)),
  subject: z.string().min(1, "Assunto é obrigatório"),
  description: z.string().optional(),
  referenceMonth: z.string().regex(/^\d{4}-\d{2}$/, "Mês de referência deve estar no formato YYYY-MM"),
  amount: z.string().transform(val => val.replace(',', '.')),
  notes: z.string().optional(),
  cnpjFornecedor: z.string().optional(),
  razaoSocial: z.string().optional(),
  categoryId: z.string().transform(val => val ? parseInt(val) : undefined).optional(),
  status: z.enum(["ATIVO", "INATIVO"]).default("ATIVO"),
});

// Tipos para importação CSV
export type CsvImportUser = z.infer<typeof csvImportUserSchema>;
export type CsvImportEconomicGroup = z.infer<typeof csvImportEconomicGroupSchema>;
export type CsvImportClient = z.infer<typeof csvImportClientSchema>;
export type CsvImportCampaign = z.infer<typeof csvImportCampaignSchema>;
export type CsvImportDepartment = z.infer<typeof csvImportDepartmentSchema>;
export type CsvImportCostCenter = z.infer<typeof csvImportCostCenterSchema>;
export type CsvImportTaskType = z.infer<typeof csvImportTaskTypeSchema>;
export type CsvImportCostCategory = z.infer<typeof csvImportCostCategorySchema>;
export type CsvImportCampaignCost = z.infer<typeof csvImportCampaignCostSchema>;

// Tipo para resultado de importação
export type ImportResult = {
  success: boolean;
  rowNumber: number;
  data?: any;
  errors?: string[];
};
