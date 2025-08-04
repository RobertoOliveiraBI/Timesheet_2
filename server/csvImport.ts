import csv from 'csv-parser';
import { Readable } from 'stream';
import { storage } from './storage';
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
import bcrypt from 'bcryptjs';

// Configuração dos templates CSV
export const csvTemplates = {
  users: {
    filename: 'modelo_usuarios.csv',
    headers: [
      'email', 'password', 'firstName', 'lastName', 'role', 'position', 
      'isManager', 'managerEmail', 'contractType', 'costCenterName', 'departmentName',
      'contractStartDate', 'contractEndDate', 'contractValue', 'companyName', 
      'cnpj', 'monthlyCost', 'isActive'
    ],
    example: [
      'joao@exemplo.com', '123456', 'João', 'Silva', 'COLABORADOR', 'Desenvolvedor',
      'false', 'gestor@exemplo.com', 'CLT', 'GBrasil', 'Conteúdo', '2024-01-01', '2024-12-31', '5000.00',
      '', '', '4500.00', 'true'
    ],
    description: 'Importação de usuários do sistema'
  },
  'economic-groups': {
    filename: 'modelo_grupos_economicos.csv',
    headers: ['name', 'description'],
    example: ['Grupo Empresarial ABC', 'Holding com empresas do setor de marketing'],
    description: 'Importação de grupos econômicos'
  },
  clients: {
    filename: 'modelo_clientes.csv',
    headers: ['companyName', 'tradeName', 'cnpj', 'email', 'economicGroupName', 'isActive'],
    example: ['Empresa Exemplo LTDA', 'Exemplo', '12.345.678/0001-90', 'contato@exemplo.com', 'Grupo Empresarial ABC', 'true'],
    description: 'Importação de clientes'
  },
  campaigns: {
    filename: 'modelo_campanhas.csv',
    headers: ['name', 'description', 'contractStartDate', 'contractEndDate', 'contractValue', 'clientName', 'costCenterName', 'isActive'],
    example: ['Campanha Digital 2024', 'Campanha de marketing digital', '2024-01-01', '2024-12-31', '15000.00', 'Empresa Exemplo LTDA', 'GBrasil', 'true'],
    description: 'Importação de campanhas'
  },
  departments: {
    filename: 'modelo_departamentos.csv',
    headers: ['name', 'description', 'isActive'],
    example: ['Tecnologia', 'Departamento de desenvolvimento de software', 'true'],
    description: 'Importação de departamentos'
  },
  'cost-centers': {
    filename: 'modelo_centros_custo.csv',
    headers: ['name', 'code', 'description', 'isActive'],
    example: ['Centro Custo TI', 'CC001', 'Centro de custo do departamento de TI', 'true'],
    description: 'Importação de centros de custo'
  },
  'task-types': {
    filename: 'modelo_tipos_tarefa.csv',
    headers: ['name', 'description', 'color', 'isBillable', 'isActive'],
    example: ['Desenvolvimento', 'Atividades de programação', '#3b82f6', 'true', 'true'],
    description: 'Importação de tipos de tarefa'
  },
  'cost-categories': {
    filename: 'modelo_categorias_custo.csv',
    headers: ['name', 'isActive'],
    example: ['Software', 'true'],
    description: 'Importação de categorias de custo'
  },
  'campaign-tasks': {
    filename: 'modelo_tarefas_campanha.csv',
    headers: ['campaignName', 'taskTypeName', 'customDescription'],
    example: ['Campanha Digital 2024', 'Desenvolvimento', 'Desenvolvimento de landing page personalizada'],
    description: 'Importação de tarefas de campanha'
  },
  'campaign-costs': {
    filename: 'modelo_custos_campanha.csv',
    headers: ['campaignName', 'subject', 'description', 'referenceMonth', 'amount', 'notes', 'cnpjFornecedor', 'razaoSocial', 'categoryName', 'status'],
    example: ['Campanha Digital 2024', 'Licença Software', 'Licença anual do software XYZ', '2024-01', '1200.00', 'Renovação anual', '11.222.333/0001-44', 'Software House Ltda', 'Software', 'ATIVO'],
    description: 'Importação de custos de campanha'
  }
};

// Função para gerar template CSV
export function generateCsvTemplate(entityType: keyof typeof csvTemplates): string {
  const template = csvTemplates[entityType];
  const csvContent = [
    template.headers.join(','),
    template.example.join(',')
  ].join('\n');
  
  return csvContent;
}

// Função para converter data DD/MM/YYYY para YYYY-MM-DD
function convertDateFormat(dateStr: string): string {
  if (!dateStr) return '';
  
  // Se já está no formato YYYY-MM-DD, retorna como está
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  // Converte DD/MM/YYYY para YYYY-MM-DD
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month}-${day}`;
  }
  
  return dateStr;
}

// Funções auxiliares para converter descrições em IDs
async function findUserByEmail(email: string): Promise<number | null> {
  if (!email) return null;
  try {
    // Usar query direta para buscar usuário por email
    const user = await storage.getUserByEmail(email);
    return user ? user.id : null;
  } catch (error) {
    return null;
  }
}

async function findDepartmentByName(name: string): Promise<number | null> {
  if (!name) return null;
  try {
    const departments = await storage.getDepartments();
    const department = departments.find((d: any) => d.name.toLowerCase() === name.toLowerCase());
    return department ? department.id : null;
  } catch (error) {
    return null;
  }
}

async function findCostCenterByName(name: string): Promise<number | null> {
  if (!name) return null;
  try {
    const costCenters = await storage.getCostCenters();
    const costCenter = costCenters.find((c: any) => c.name.toLowerCase() === name.toLowerCase());
    return costCenter ? costCenter.id : null;
  } catch (error) {
    return null;
  }
}

async function findEconomicGroupByName(name: string): Promise<number | null> {
  if (!name) return null;
  try {
    const groups = await storage.getEconomicGroups();
    const group = groups.find((g: any) => g.name.toLowerCase() === name.toLowerCase());
    return group ? group.id : null;
  } catch (error) {
    return null;
  }
}

async function findClientByName(name: string): Promise<number | null> {
  if (!name) return null;
  try {
    const clients = await storage.getClients();
    const client = clients.find((c: any) => c.companyName.toLowerCase() === name.toLowerCase());
    return client ? client.id : null;
  } catch (error) {
    return null;
  }
}

async function findCampaignByName(name: string): Promise<number | null> {
  if (!name) return null;
  try {
    const campaigns = await storage.getCampaigns();
    const campaign = campaigns.find((c: any) => c.name.toLowerCase() === name.toLowerCase());
    return campaign ? campaign.id : null;
  } catch (error) {
    return null;
  }
}

async function findCostCategoryByName(name: string): Promise<number | null> {
  if (!name) return null;
  try {
    const categories = await storage.getCostCategories();
    const category = categories.find((c: any) => c.name.toLowerCase() === name.toLowerCase());
    return category ? category.id : null;
  } catch (error) {
    return null;
  }
}

async function findTaskTypeByName(name: string): Promise<number | null> {
  if (!name) return null;
  try {
    const taskTypes = await storage.getTaskTypes();
    const taskType = taskTypes.find((t: any) => t.name.toLowerCase() === name.toLowerCase());
    return taskType ? taskType.id : null;
  } catch (error) {
    return null;
  }
}

// Função para processar CSV e retornar dados validados
export async function processCsvData<T>(
  fileBuffer: Buffer,
  schema: any,
  entityType: keyof typeof csvTemplates
): Promise<ImportResult[]> {
  return new Promise((resolve, reject) => {
    const results: ImportResult[] = [];
    const csvStream = Readable.from(fileBuffer.toString());
    
    csvStream
      .pipe(csv())
      .on('data', (row: any) => {
        const rowNumber = results.length + 2; // +2 porque começa em 1 e tem o cabeçalho
        
        try {
          // Converte datas se necessário
          if (row.contractStartDate) {
            row.contractStartDate = convertDateFormat(row.contractStartDate);
          }
          if (row.contractEndDate) {
            row.contractEndDate = convertDateFormat(row.contractEndDate);
          }
          
          // Valida os dados usando o schema
          const validatedData = schema.parse(row);
          
          results.push({
            success: true,
            rowNumber,
            data: validatedData
          });
        } catch (error: any) {
          const errors = error.errors ? error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`) : [error.message];
          results.push({
            success: false,
            rowNumber,
            errors
          });
        }
      })
      .on('end', () => {
        resolve(results);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

// Funções específicas de importação para cada entidade
export async function importUsers(validResults: ImportResult[], userId: number): Promise<ImportResult[]> {
  const finalResults: ImportResult[] = [];
  
  for (const result of validResults) {
    if (!result.success || !result.data) {
      finalResults.push(result);
      continue;
    }
    
    try {
      // Converter descrições em IDs
      const managerId = result.data.managerEmail ? await findUserByEmail(result.data.managerEmail) : null;
      const departmentId = result.data.departmentName ? await findDepartmentByName(result.data.departmentName) : null;
      const costCenterId = result.data.costCenterName ? await findCostCenterByName(result.data.costCenterName) : null;
      
      // Validar se os relacionamentos foram encontrados
      if (result.data.managerEmail && !managerId) {
        finalResults.push({
          success: false,
          rowNumber: result.rowNumber,
          errors: [`Gestor com email "${result.data.managerEmail}" não encontrado`]
        });
        continue;
      }
      
      if (result.data.departmentName && !departmentId) {
        finalResults.push({
          success: false,
          rowNumber: result.rowNumber,
          errors: [`Departamento "${result.data.departmentName}" não encontrado`]
        });
        continue;
      }
      
      if (result.data.costCenterName && !costCenterId) {
        finalResults.push({
          success: false,
          rowNumber: result.rowNumber,
          errors: [`Centro de custo "${result.data.costCenterName}" não encontrado`]
        });
        continue;
      }
      
      // Hash da senha
      const hashedPassword = await bcrypt.hash(result.data.password, 10);
      const userData = {
        ...result.data,
        password: hashedPassword,
        managerId,
        departmentId,
        costCenterId,
        contractStartDate: result.data.contractStartDate || null,
        contractEndDate: result.data.contractEndDate || null,
        contractValue: result.data.contractValue || null,
        monthlyCost: result.data.monthlyCost || null,
      };
      
      // Remover campos de descrição que não existem no schema do banco
      delete (userData as any).managerEmail;
      delete (userData as any).departmentName;
      delete (userData as any).costCenterName;
      
      const user = await storage.createUser(userData);
      finalResults.push({
        ...result,
        data: user
      });
    } catch (error: any) {
      finalResults.push({
        success: false,
        rowNumber: result.rowNumber,
        errors: [`Erro ao criar usuário: ${error.message}`]
      });
    }
  }
  
  return finalResults;
}

export async function importEconomicGroups(validResults: ImportResult[]): Promise<ImportResult[]> {
  const finalResults: ImportResult[] = [];
  
  for (const result of validResults) {
    if (!result.success || !result.data) {
      finalResults.push(result);
      continue;
    }
    
    try {
      const group = await storage.createEconomicGroup(result.data);
      finalResults.push({
        ...result,
        data: group
      });
    } catch (error: any) {
      finalResults.push({
        success: false,
        rowNumber: result.rowNumber,
        errors: [`Erro ao criar grupo econômico: ${error.message}`]
      });
    }
  }
  
  return finalResults;
}

export async function importClients(validResults: ImportResult[]): Promise<ImportResult[]> {
  const finalResults: ImportResult[] = [];
  
  for (const result of validResults) {
    if (!result.success || !result.data) {
      finalResults.push(result);
      continue;
    }
    
    try {
      // Converter descrições em IDs
      const economicGroupId = result.data.economicGroupName ? await findEconomicGroupByName(result.data.economicGroupName) : null;
      
      // Validar se o grupo econômico foi encontrado
      if (result.data.economicGroupName && !economicGroupId) {
        finalResults.push({
          success: false,
          rowNumber: result.rowNumber,
          errors: [`Grupo econômico "${result.data.economicGroupName}" não encontrado`]
        });
        continue;
      }
      
      const clientData = {
        ...result.data,
        economicGroupId,
      };
      
      // Remover campos de descrição que não existem no schema do banco
      delete (clientData as any).economicGroupName;
      
      const client = await storage.createClient(clientData);
      finalResults.push({
        ...result,
        data: client
      });
    } catch (error: any) {
      finalResults.push({
        success: false,
        rowNumber: result.rowNumber,
        errors: [`Erro ao criar cliente: ${error.message}`]
      });
    }
  }
  
  return finalResults;
}

export async function importCampaigns(validResults: ImportResult[]): Promise<ImportResult[]> {
  const finalResults: ImportResult[] = [];
  
  for (const result of validResults) {
    if (!result.success || !result.data) {
      finalResults.push(result);
      continue;
    }
    
    try {
      // Converter descrições em IDs
      const clientId = await findClientByName(result.data.clientName);
      const costCenterId = result.data.costCenterName ? await findCostCenterByName(result.data.costCenterName) : null;
      
      // Validar se o cliente foi encontrado (obrigatório)
      if (!clientId) {
        finalResults.push({
          success: false,
          rowNumber: result.rowNumber,
          errors: [`Cliente "${result.data.clientName}" não encontrado`]
        });
        continue;
      }
      
      // Validar se o centro de custo foi encontrado (se informado)
      if (result.data.costCenterName && !costCenterId) {
        finalResults.push({
          success: false,
          rowNumber: result.rowNumber,
          errors: [`Centro de custo "${result.data.costCenterName}" não encontrado`]
        });
        continue;
      }
      
      const campaignData = {
        ...result.data,
        clientId,
        costCenterId,
        contractStartDate: result.data.contractStartDate || null,
        contractEndDate: result.data.contractEndDate || null,
        contractValue: result.data.contractValue || null,
      };
      
      // Remover campos de descrição que não existem no schema do banco
      delete (campaignData as any).clientName;
      delete (campaignData as any).costCenterName;
      
      const campaign = await storage.createCampaign(campaignData);
      finalResults.push({
        ...result,
        data: campaign
      });
    } catch (error: any) {
      finalResults.push({
        success: false,
        rowNumber: result.rowNumber,
        errors: [`Erro ao criar campanha: ${error.message}`]
      });
    }
  }
  
  return finalResults;
}

export async function importDepartments(validResults: ImportResult[]): Promise<ImportResult[]> {
  const finalResults: ImportResult[] = [];
  
  for (const result of validResults) {
    if (!result.success || !result.data) {
      finalResults.push(result);
      continue;
    }
    
    try {
      const department = await storage.createDepartment(result.data);
      finalResults.push({
        ...result,
        data: department
      });
    } catch (error: any) {
      finalResults.push({
        success: false,
        rowNumber: result.rowNumber,
        errors: [`Erro ao criar departamento: ${error.message}`]
      });
    }
  }
  
  return finalResults;
}

export async function importCostCenters(validResults: ImportResult[]): Promise<ImportResult[]> {
  const finalResults: ImportResult[] = [];
  
  for (const result of validResults) {
    if (!result.success || !result.data) {
      finalResults.push(result);
      continue;
    }
    
    try {
      const costCenter = await storage.createCostCenter(result.data);
      finalResults.push({
        ...result,
        data: costCenter
      });
    } catch (error: any) {
      finalResults.push({
        success: false,
        rowNumber: result.rowNumber,
        errors: [`Erro ao criar centro de custo: ${error.message}`]
      });
    }
  }
  
  return finalResults;
}

export async function importTaskTypes(validResults: ImportResult[]): Promise<ImportResult[]> {
  const finalResults: ImportResult[] = [];
  
  for (const result of validResults) {
    if (!result.success || !result.data) {
      finalResults.push(result);
      continue;
    }
    
    try {
      const taskType = await storage.createTaskType(result.data);
      finalResults.push({
        ...result,
        data: taskType
      });
    } catch (error: any) {
      finalResults.push({
        success: false,
        rowNumber: result.rowNumber,
        errors: [`Erro ao criar tipo de tarefa: ${error.message}`]
      });
    }
  }
  
  return finalResults;
}

export async function importCostCategories(validResults: ImportResult[]): Promise<ImportResult[]> {
  const finalResults: ImportResult[] = [];
  
  for (const result of validResults) {
    if (!result.success || !result.data) {
      finalResults.push(result);
      continue;
    }
    
    try {
      const category = await storage.createCostCategory(result.data);
      finalResults.push({
        ...result,
        data: category
      });
    } catch (error: any) {
      finalResults.push({
        success: false,
        rowNumber: result.rowNumber,
        errors: [`Erro ao criar categoria de custo: ${error.message}`]
      });
    }
  }
  
  return finalResults;
}

export async function importCampaignTasks(validResults: ImportResult[]): Promise<ImportResult[]> {
  const finalResults: ImportResult[] = [];
  
  for (const result of validResults) {
    if (!result.success || !result.data) {
      finalResults.push(result);
      continue;
    }
    
    try {
      // Converter descrições em IDs
      const campaignId = await findCampaignByName(result.data.campaignName);
      const taskTypeId = await findTaskTypeByName(result.data.taskTypeName);
      
      // Validar se a campanha foi encontrada (obrigatório)
      if (!campaignId) {
        finalResults.push({
          success: false,
          rowNumber: result.rowNumber,
          errors: [`Campanha "${result.data.campaignName}" não encontrada`]
        });
        continue;
      }
      
      // Validar se o tipo de tarefa foi encontrado (obrigatório)
      if (!taskTypeId) {
        finalResults.push({
          success: false,
          rowNumber: result.rowNumber,
          errors: [`Tipo de tarefa "${result.data.taskTypeName}" não encontrado`]
        });
        continue;
      }
      
      const taskData = {
        campaignId,
        taskTypeId,
        description: result.data.customDescription || '', // description é obrigatório no schema
        isActive: true,
      };
      
      const campaignTask = await storage.createCampaignTask(taskData);
      finalResults.push({
        ...result,
        data: campaignTask
      });
    } catch (error: any) {
      finalResults.push({
        success: false,
        rowNumber: result.rowNumber,
        errors: [`Erro ao criar tarefa de campanha: ${error.message}`]
      });
    }
  }
  
  return finalResults;
}

export async function importCampaignCosts(validResults: ImportResult[], userId: number): Promise<ImportResult[]> {
  const finalResults: ImportResult[] = [];
  
  for (const result of validResults) {
    if (!result.success || !result.data) {
      finalResults.push(result);
      continue;
    }
    
    try {
      // Converter descrições em IDs
      const campaignId = await findCampaignByName(result.data.campaignName);
      const categoryId = result.data.categoryName ? await findCostCategoryByName(result.data.categoryName) : null;
      
      // Validar se a campanha foi encontrada (obrigatório)
      if (!campaignId) {
        finalResults.push({
          success: false,
          rowNumber: result.rowNumber,
          errors: [`Campanha "${result.data.campaignName}" não encontrada`]
        });
        continue;
      }
      
      // Validar se a categoria foi encontrada (se informada)
      if (result.data.categoryName && !categoryId) {
        finalResults.push({
          success: false,
          rowNumber: result.rowNumber,
          errors: [`Categoria "${result.data.categoryName}" não encontrada`]
        });
        continue;
      }
      
      const costData = {
        ...result.data,
        campaignId,
        categoryId,
        userId,
      };
      
      // Remover campos de descrição que não existem no schema do banco
      delete (costData as any).campaignName;
      delete (costData as any).categoryName;
      
      const cost = await storage.createCampaignCost(costData);
      finalResults.push({
        ...result,
        data: cost
      });
    } catch (error: any) {
      finalResults.push({
        success: false,
        rowNumber: result.rowNumber,
        errors: [`Erro ao criar custo de campanha: ${error.message}`]
      });
    }
  }
  
  return finalResults;
}