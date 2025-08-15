import csv from 'csv-parser';
import { Readable } from 'stream';
import { storage } from './storage';
import bcrypt from 'bcryptjs';
import { ImportResult } from '@shared/schema';

/**
 * Improved Bulk Import System
 * 
 * Based on analysis of importing 40 users from Gotcha agency:
 * - 10 managers (GESTOR role)
 * - 30 collaborators (COLABORADOR role)
 * - Distributed across 11 departments and 3 cost centers
 * - Complex manager-subordinate relationships
 * 
 * Key improvements identified:
 * 1. Better error handling and validation
 * 2. Automatic dependency creation (departments, cost centers)
 * 3. Batch processing for performance
 * 4. Better relationship mapping
 * 5. Detailed reporting and rollback capabilities
 */

interface BulkImportConfig {
  batchSize: number;
  autoCreateDependencies: boolean;
  validateRelationships: boolean;
  dryRun: boolean;
  continueOnError: boolean;
}

interface ImportSummary {
  totalRecords: number;
  successfulInserts: number;
  failedInserts: number;
  createdDependencies: {
    departments: string[];
    costCenters: string[];
  };
  errors: ImportError[];
  warnings: string[];
  executionTime: number;
}

interface ImportError {
  rowNumber: number;
  record: any;
  error: string;
  severity: 'error' | 'warning';
}

export class ImprovedBulkImporter {
  private config: BulkImportConfig;
  
  constructor(config: Partial<BulkImportConfig> = {}) {
    this.config = {
      batchSize: 50,
      autoCreateDependencies: true,
      validateRelationships: true,
      dryRun: false,
      continueOnError: true,
      ...config
    };
  }

  /**
   * Smart department and cost center mapping
   * Automatically creates missing entities based on naming conventions
   */
  private async ensureDependenciesExist(data: any[]): Promise<{departments: string[], costCenters: string[]}> {
    const createdDepartments: string[] = [];
    const createdCostCenters: string[] = [];
    
    if (!this.config.autoCreateDependencies) {
      return { departments: createdDepartments, costCenters: createdCostCenters };
    }

    // Extract unique departments and cost centers from data
    const departmentNames = data.map(item => item.departmentName).filter(Boolean);
    const uniqueDepartments = Array.from(new Set(departmentNames));
    const costCenterNames = data.map(item => item.costCenterName).filter(Boolean);
    const uniqueCostCenters = Array.from(new Set(costCenterNames));

    // Check existing departments
    const existingDepartments = await storage.getDepartments();
    const existingDeptNames = existingDepartments.map(d => d.name);

    // Create missing departments
    for (const deptName of uniqueDepartments) {
      if (!existingDeptNames.includes(deptName)) {
        if (!this.config.dryRun) {
          await storage.createDepartment({
            name: deptName,
            description: `Auto-created department: ${deptName}`,
            isActive: true
          });
        }
        createdDepartments.push(deptName);
      }
    }

    // Check existing cost centers
    const existingCostCenters = await storage.getCostCenters();
    const existingCCNames = existingCostCenters.map(cc => cc.name);

    // Create missing cost centers with smart naming
    for (const ccName of uniqueCostCenters) {
      const normalizedName = this.normalizeCostCenterName(ccName);
      if (!existingCCNames.includes(normalizedName)) {
        if (!this.config.dryRun) {
          await storage.createCostCenter({
            name: normalizedName,
            code: this.generateCostCenterCode(normalizedName),
            description: `Auto-created cost center: ${normalizedName}`,
            isActive: true
          });
        }
        createdCostCenters.push(normalizedName);
      }
    }

    return { departments: createdDepartments, costCenters: createdCostCenters };
  }

  /**
   * Normalize cost center names to handle variations like:
   * G-BRASIL -> GBrasil, G-TODOS -> GTodos
   */
  private normalizeCostCenterName(name: string): string {
    const mapping: Record<string, string> = {
      'G-BRASIL': 'GBrasil',
      'G-TODOS': 'GTodos',
      'G-brasil': 'GBrasil',
      'G-todos': 'GTodos'
    };
    
    return mapping[name] || name;
  }

  /**
   * Generate cost center codes automatically
   */
  private generateCostCenterCode(name: string): string {
    return name.substring(0, 3).toUpperCase();
  }

  /**
   * Enhanced user import with relationship validation
   */
  async importUsersEnhanced(csvData: Buffer): Promise<ImportSummary> {
    const startTime = Date.now();
    const summary: ImportSummary = {
      totalRecords: 0,
      successfulInserts: 0,
      failedInserts: 0,
      createdDependencies: { departments: [], costCenters: [] },
      errors: [],
      warnings: [],
      executionTime: 0
    };

    try {
      // Parse CSV data
      const users = await this.parseCsvData(csvData);
      summary.totalRecords = users.length;

      // Ensure dependencies exist
      const dependencies = await this.ensureDependenciesExist(users);
      summary.createdDependencies = dependencies;

      // Validate and process in batches
      const batches = this.createBatches(users, this.config.batchSize);
      
      for (const batch of batches) {
        const batchResults = await this.processBatch(batch);
        summary.successfulInserts += batchResults.successful;
        summary.failedInserts += batchResults.failed;
        summary.errors.push(...batchResults.errors);
        summary.warnings.push(...batchResults.warnings);
      }

      // Post-process: Set up manager relationships
      if (!this.config.dryRun) {
        await this.setupManagerRelationships(users);
      }

    } catch (error: any) {
      summary.errors.push({
        rowNumber: 0,
        record: null,
        error: `Critical error: ${error.message}`,
        severity: 'error'
      });
    }

    summary.executionTime = Date.now() - startTime;
    return summary;
  }

  /**
   * Parse CSV data from buffer
   */
  private async parseCsvData(csvData: Buffer): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      const stream = Readable.from(csvData);
      
      stream
        .pipe(csv({ separator: ';' })) // Handle semicolon separators
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', reject);
    });
  }

  /**
   * Create batches for processing
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Process a batch of users
   */
  private async processBatch(batch: any[]): Promise<{
    successful: number;
    failed: number;
    errors: ImportError[];
    warnings: string[];
  }> {
    let successful = 0;
    let failed = 0;
    const errors: ImportError[] = [];
    const warnings: string[] = [];

    for (const [index, user] of batch.entries()) {
      try {
        if (this.config.validateRelationships) {
          const validation = await this.validateUser(user);
          if (!validation.isValid) {
            errors.push({
              rowNumber: index + 1,
              record: user,
              error: validation.errors.join(', '),
              severity: 'error'
            });
            failed++;
            continue;
          }
          if (validation.warnings.length > 0) {
            warnings.push(...validation.warnings);
          }
        }

        if (!this.config.dryRun) {
          await this.createUser(user);
        }
        successful++;
      } catch (error: any) {
        errors.push({
          rowNumber: index + 1,
          record: user,
          error: error.message,
          severity: 'error'
        });
        failed++;
        
        if (!this.config.continueOnError) {
          break;
        }
      }
    }

    return { successful, failed, errors, warnings };
  }

  /**
   * Validate user data before insertion
   */
  private async validateUser(user: any): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required field validation
    if (!user.email) errors.push('Email is required');
    if (!user.password) errors.push('Password is required');
    if (!user.firstName) errors.push('First name is required');
    if (!user.lastName) errors.push('Last name is required');

    // Email uniqueness check
    if (user.email) {
      try {
        const existingUser = await storage.getUserByEmail(user.email);
        if (existingUser) {
          errors.push(`User with email ${user.email} already exists`);
        }
      } catch (error) {
        // User doesn't exist, which is good
      }
    }

    // Manager relationship validation
    if (user.managerEmail && user.managerEmail !== user.email) {
      try {
        const manager = await storage.getUserByEmail(user.managerEmail);
        if (!manager) {
          warnings.push(`Manager with email ${user.managerEmail} not found. Will be resolved after import.`);
        }
      } catch (error) {
        warnings.push(`Could not validate manager ${user.managerEmail}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Create user with enhanced error handling
   */
  private async createUser(userData: any): Promise<void> {
    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    // Get department and cost center IDs
    const department = await storage.getDepartmentByName(userData.departmentName);
    const costCenter = await storage.getCostCenterByName(this.normalizeCostCenterName(userData.costCenterName));
    
    const userToCreate = {
      email: userData.email,
      password: hashedPassword,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role || 'COLABORADOR',
      position: userData.position,
      isManager: userData.isManager === 'true',
      contractType: userData.contractType,
      departmentId: department?.id,
      costCenterId: costCenter?.id,
      contractStartDate: userData.contractStartDate || null,
      contractEndDate: userData.contractEndDate || null,
      contractValue: userData.contractValue ? parseFloat(userData.contractValue) : null,
      companyName: userData.companyName || null,
      cnpj: userData.cnpj || null,
      monthlyCost: userData.monthlyCost ? parseFloat(userData.monthlyCost) : null,
      isActive: userData.isActive !== 'false'
    };

    await storage.createUser(userToCreate);
  }

  /**
   * Setup manager relationships after all users are created
   */
  private async setupManagerRelationships(users: any[]): Promise<void> {
    for (const user of users) {
      if (user.managerEmail && user.managerEmail !== user.email) {
        try {
          const employee = await storage.getUserByEmail(user.email);
          const manager = await storage.getUserByEmail(user.managerEmail);
          
          if (employee && manager) {
            await storage.updateUser(employee.id, { managerId: manager.id });
          }
        } catch (error) {
          console.warn(`Could not set manager relationship for ${user.email}: ${error}`);
        }
      } else if (user.isManager === 'true') {
        // Self-managed users
        try {
          const employee = await storage.getUserByEmail(user.email);
          if (employee) {
            await storage.updateUser(employee.id, { managerId: employee.id });
          }
        } catch (error) {
          console.warn(`Could not set self-management for ${user.email}: ${error}`);
        }
      }
    }
  }

  /**
   * Generate detailed import report
   */
  generateReport(summary: ImportSummary): string {
    const lines = [
      '=== BULK IMPORT REPORT ===',
      `Execution Time: ${summary.executionTime}ms`,
      `Total Records: ${summary.totalRecords}`,
      `Successful: ${summary.successfulInserts}`,
      `Failed: ${summary.failedInserts}`,
      `Success Rate: ${((summary.successfulInserts / summary.totalRecords) * 100).toFixed(2)}%`,
      '',
      '=== DEPENDENCIES CREATED ===',
      `Departments: ${summary.createdDependencies.departments.join(', ') || 'None'}`,
      `Cost Centers: ${summary.createdDependencies.costCenters.join(', ') || 'None'}`,
      '',
      '=== ERRORS ===',
      ...summary.errors.map(e => `Row ${e.rowNumber}: ${e.error}`),
      '',
      '=== WARNINGS ===',
      ...summary.warnings,
      ''
    ];

    return lines.join('\n');
  }
}

// Export utility functions for direct use
export const bulkImportUtils = {
  normalizeCostCenterName: (name: string) => {
    const mapping: Record<string, string> = {
      'G-BRASIL': 'GBrasil',
      'G-TODOS': 'GTodos',
      'G-brasil': 'GBrasil',
      'G-todos': 'GTodos'
    };
    return mapping[name] || name;
  },
  
  validateEmail: (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
  
  generateUserStats: async () => {
    const users = await storage.getUsers();
    const departments = await storage.getDepartments();
    const costCenters = await storage.getCostCenters();
    
    return {
      totalUsers: users.length,
      activeUsers: users.filter(u => u.isActive).length,
      managers: users.filter(u => u.isManager).length,
      collaborators: users.filter(u => !u.isManager).length,
      totalDepartments: departments.length,
      totalCostCenters: costCenters.length,
      usersByDepartment: departments.map(dept => ({
        department: dept.name,
        userCount: users.filter(u => u.departmentId === dept.id).length
      })),
      usersByCostCenter: costCenters.map(cc => ({
        costCenter: cc.name,
        userCount: users.filter(u => u.costCenterId === cc.id).length
      }))
    };
  }
};