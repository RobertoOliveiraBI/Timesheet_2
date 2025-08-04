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
      'isManager', 'managerId', 'contractType', 'costCenterId', 'departmentId',
      'contractStartDate', 'contractEndDate', 'contractValue', 'companyName', 
      'cnpj', 'monthlyCost', 'isActive'
    ],
    example: [
      'joao@exemplo.com', '123456', 'João', 'Silva', 'COLABORADOR', 'Desenvolvedor',
      'false', '', 'CLT', '1', '1', '2024-01-01', '2024-12-31', '5000.00',
      '', '', '4500.00', 'true'
    ],
    description: 'Importação de usuários do sistema'
  },
  economicGroups: {
    filename: 'modelo_grupos_economicos.csv',
    headers: ['name', 'description'],
    example: ['Grupo Empresarial ABC', 'Holding com empresas do setor de marketing'],
    description: 'Importação de grupos econômicos'
  },
  clients: {
    filename: 'modelo_clientes.csv',
    headers: ['companyName', 'tradeName', 'cnpj', 'email', 'economicGroupId', 'isActive'],
    example: ['Empresa Exemplo LTDA', 'Exemplo', '12.345.678/0001-90', 'contato@exemplo.com', '1', 'true'],
    description: 'Importação de clientes'
  },
  campaigns: {
    filename: 'modelo_campanhas.csv',
    headers: ['name', 'description', 'contractStartDate', 'contractEndDate', 'contractValue', 'clientId', 'costCenterId', 'isActive'],
    example: ['Campanha Digital 2024', 'Campanha de marketing digital', '2024-01-01', '2024-12-31', '15000.00', '1', '1', 'true'],
    description: 'Importação de campanhas'
  },
  departments: {
    filename: 'modelo_departamentos.csv',
    headers: ['name', 'description', 'isActive'],
    example: ['Tecnologia', 'Departamento de desenvolvimento de software', 'true'],
    description: 'Importação de departamentos'
  },
  costCenters: {
    filename: 'modelo_centros_custo.csv',
    headers: ['name', 'code', 'description', 'isActive'],
    example: ['Centro Custo TI', 'CC001', 'Centro de custo do departamento de TI', 'true'],
    description: 'Importação de centros de custo'
  },
  taskTypes: {
    filename: 'modelo_tipos_tarefa.csv',
    headers: ['name', 'description', 'color', 'isBillable', 'isActive'],
    example: ['Desenvolvimento', 'Atividades de programação', '#3b82f6', 'true', 'true'],
    description: 'Importação de tipos de tarefa'
  },
  costCategories: {
    filename: 'modelo_categorias_custo.csv',
    headers: ['name', 'isActive'],
    example: ['Software', 'true'],
    description: 'Importação de categorias de custo'
  },
  campaignCosts: {
    filename: 'modelo_custos_campanha.csv',
    headers: ['campaignId', 'subject', 'description', 'referenceMonth', 'amount', 'notes', 'cnpjFornecedor', 'razaoSocial', 'categoryId', 'status'],
    example: ['1', 'Licença Software', 'Licença anual do software XYZ', '2024-01', '1200.00', 'Renovação anual', '11.222.333/0001-44', 'Software House Ltda', '1', 'ATIVO'],
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
      // Hash da senha
      const hashedPassword = await bcrypt.hash(result.data.password, 10);
      const userData = {
        ...result.data,
        password: hashedPassword,
        contractStartDate: result.data.contractStartDate || null,
        contractEndDate: result.data.contractEndDate || null,
        contractValue: result.data.contractValue || null,
        monthlyCost: result.data.monthlyCost || null,
      };
      
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
      const client = await storage.createClient(result.data);
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
      const campaignData = {
        ...result.data,
        contractStartDate: result.data.contractStartDate || null,
        contractEndDate: result.data.contractEndDate || null,
        contractValue: result.data.contractValue || null,
      };
      
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

export async function importCampaignCosts(validResults: ImportResult[], userId: number): Promise<ImportResult[]> {
  const finalResults: ImportResult[] = [];
  
  for (const result of validResults) {
    if (!result.success || !result.data) {
      finalResults.push(result);
      continue;
    }
    
    try {
      const costData = {
        ...result.data,
        userId // Adiciona o ID do usuário que está importando
      };
      
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