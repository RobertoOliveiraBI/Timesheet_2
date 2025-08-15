import type { Express } from "express";
import { 
  csvImportUserSchema,
  csvImportEconomicGroupSchema,
  csvImportClientSchema,
  csvImportCampaignSchema,
  csvImportDepartmentSchema,
  csvImportCostCenterSchema,
  csvImportTaskTypeSchema,
  csvImportCostCategorySchema,
  csvImportCampaignTaskSchema,
  csvImportCampaignCostSchema,
  ImportResult
} from '@shared/schema';

import multer from 'multer';
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

import {
  generateCsvTemplate,
  processCsvData,
  importUsers,
  importEconomicGroups,
  importClients,
  importCampaigns,
  importDepartments,
  importCostCenters,
  importTaskTypes,
  importCostCategories,
  importCampaignTasks,
  importCampaignCosts,
  csvTemplates
} from './csvImport.js';

export function setupCsvImportRoutes(app: Express, storage: any) {
  // Middleware para verificar permissões de admin
  function requireAdminAuth(req: any, res: any, next: any) {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Não autenticado" });
    }
    
    const checkUser = async () => {
      try {
        const user = await storage.getUser(req.user.id);
        if (!user || !['MASTER', 'ADMIN'].includes(user.role)) {
          return res.status(403).json({ message: "Acesso negado. Apenas administradores podem importar dados." });
        }
        next();
      } catch (error) {
        res.status(500).json({ message: "Erro interno do servidor" });
      }
    };
    
    checkUser();
  }

  // Rota para baixar template CSV
  app.get('/api/csv-import/template/:entityType', requireAdminAuth, (req: any, res) => {
    try {
      const entityType = req.params.entityType as keyof typeof csvTemplates;
      console.log('Requested entity type:', entityType);
      console.log('Available templates:', Object.keys(csvTemplates));
      
      if (!csvTemplates[entityType]) {
        console.error('Template not found for entity:', entityType);
        return res.status(400).json({ message: "Tipo de entidade inválido" });
      }

      const csvContent = generateCsvTemplate(entityType);
      const template = csvTemplates[entityType];
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${template.filename}"`);
      res.send('\uFEFF' + csvContent); // BOM para UTF-8
    } catch (error) {
      console.error("Error generating CSV template:", error);
      res.status(500).json({ message: "Erro ao gerar template CSV" });
    }
  });

  // Função helper para processar importação
  async function processImport(
    req: any, 
    res: any, 
    schema: any, 
    entityType: string, 
    importFunction: Function
  ) {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Arquivo CSV é obrigatório" });
      }

      const results: ImportResult[] = await processCsvData(req.file.buffer, schema, entityType as keyof typeof csvTemplates);
      const validResults = results.filter((r: ImportResult) => r.success);
      const invalidResults = results.filter((r: ImportResult) => !r.success);
      
      if (validResults.length === 0) {
        return res.status(400).json({
          message: "Nenhum registro válido encontrado",
          results: invalidResults
        });
      }

      const importResults = await importFunction(validResults, req.user.id);
      const allResults = [...invalidResults, ...importResults];
      const successCount = allResults.filter((r: ImportResult) => r.success).length;
      const errorCount = allResults.filter((r: ImportResult) => !r.success).length;

      res.json({
        message: `Importação concluída: ${successCount} sucessos, ${errorCount} erros`,
        summary: { success: successCount, errors: errorCount, total: allResults.length },
        results: allResults
      });
    } catch (error: any) {
      console.error(`Error importing ${entityType}:`, {
        error: error.message,
        stack: error.stack,
        entityType,
        fileInfo: req.file ? {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size
        } : 'No file'
      });
      
      let errorMessage = "Erro interno durante a importação";
      if (error.message) {
        if (error.message.includes('CSV')) {
          errorMessage = `Erro no processamento do arquivo CSV: ${error.message}`;
        } else if (error.message.includes('database') || error.message.includes('constraint')) {
          errorMessage = `Erro no banco de dados: ${error.message}`;
        } else {
          errorMessage = `Erro na importação: ${error.message}`;
        }
      }
      
      res.status(500).json({ 
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Rotas de importação
  app.post('/api/csv-import/users', requireAdminAuth, upload.single('csvFile'), async (req: any, res) => {
    await processImport(req, res, csvImportUserSchema, 'users', importUsers);
  });

  app.post('/api/csv-import/economic-groups', requireAdminAuth, upload.single('csvFile'), async (req: any, res) => {
    await processImport(req, res, csvImportEconomicGroupSchema, 'economicGroups', 
      (validResults: ImportResult[]) => importEconomicGroups(validResults));
  });

  app.post('/api/csv-import/clients', requireAdminAuth, upload.single('csvFile'), async (req: any, res) => {
    await processImport(req, res, csvImportClientSchema, 'clients', 
      (validResults: ImportResult[]) => importClients(validResults));
  });

  app.post('/api/csv-import/campaigns', requireAdminAuth, upload.single('csvFile'), async (req: any, res) => {
    await processImport(req, res, csvImportCampaignSchema, 'campaigns', 
      (validResults: ImportResult[]) => importCampaigns(validResults));
  });

  app.post('/api/csv-import/departments', requireAdminAuth, upload.single('csvFile'), async (req: any, res) => {
    await processImport(req, res, csvImportDepartmentSchema, 'departments', 
      (validResults: ImportResult[]) => importDepartments(validResults));
  });

  app.post('/api/csv-import/cost-centers', requireAdminAuth, upload.single('csvFile'), async (req: any, res) => {
    await processImport(req, res, csvImportCostCenterSchema, 'costCenters', 
      (validResults: ImportResult[]) => importCostCenters(validResults));
  });

  app.post('/api/csv-import/task-types', requireAdminAuth, upload.single('csvFile'), async (req: any, res) => {
    await processImport(req, res, csvImportTaskTypeSchema, 'taskTypes', 
      (validResults: ImportResult[]) => importTaskTypes(validResults));
  });

  app.post('/api/csv-import/cost-categories', requireAdminAuth, upload.single('csvFile'), async (req: any, res) => {
    await processImport(req, res, csvImportCostCategorySchema, 'costCategories', 
      (validResults: ImportResult[]) => importCostCategories(validResults));
  });

  app.post('/api/csv-import/campaign-tasks', requireAdminAuth, upload.single('csvFile'), async (req: any, res) => {
    await processImport(req, res, csvImportCampaignTaskSchema, 'campaignTasks', 
      (validResults: ImportResult[]) => importCampaignTasks(validResults));
  });

  app.post('/api/csv-import/campaign-costs', requireAdminAuth, upload.single('csvFile'), async (req: any, res) => {
    await processImport(req, res, csvImportCampaignCostSchema, 'campaignCosts', importCampaignCosts);
  });

  // Rota para listar templates disponíveis
  app.get('/api/csv-import/templates', requireAdminAuth, (req: any, res) => {
    try {
      const templates = Object.entries(csvTemplates).map(([key, template]: [string, any]) => ({
        entityType: key,
        filename: template.filename,
        description: template.description,
        downloadUrl: `/api/csv-import/template/${key}`
      }));
      
      res.json(templates);
    } catch (error) {
      console.error("Error listing templates:", error);
      res.status(500).json({ message: "Erro ao listar templates" });
    }
  });
}