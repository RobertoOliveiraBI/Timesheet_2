# Tractionfy Timesheet SaaS

## Overview
Tractionfy Timesheet SaaS is a comprehensive timesheet management application for marketing agencies with multiple clients, campaigns, and hybrid teams. It enables precise tracking of billable and non-billable hours, team management with role-based permissions, and automated monthly closing workflows. The system is designed for scalability and maintainability, emphasizing clear separation of concerns, comprehensive type safety, and robust authentication mechanisms suitable for multi-tenant SaaS deployment.

## User Preferences
Preferred communication style: Simple, everyday language.
Design library: Using shadcn/ui components for consistent, professional UI
Authentication: Simple email/password system using SQL Server Azure database
Language: Interface completely in Portuguese
UI/UX: Minimalist design, single header, weekly timesheet table format

## System Architecture

The application follows a modern full-stack architecture with clear separation between frontend and backend concerns.

### Frontend Architecture
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query for server state, React hooks for local state
- **Build Tool**: Vite

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Database**: SQL Server Azure with custom storage implementation
- **Database ORM**: Custom SQL Server storage layer implementing IStorage interface
- **Authentication**: Simple email/password authentication with hashed passwords
- **Session Management**: Memory-backed sessions using memorystore and passport.js

### Database Architecture
- **Primary Database**: SQL Server Azure (TMS schema)
- **Connection Management**: MSSQL connection pooling with retry logic and graceful shutdown
- **Schema Management**: Custom SQL Server implementation with type conversions and MERGE operations
- **Security**: Encrypted connections with trustServerCertificate validation

### Key Components

#### Authentication & Authorization
- **OIDC Integration**: Uses Replit's OpenID Connect for secure authentication
- **Role-Based Access Control**: Four distinct user roles (MASTER, ADMIN, GESTOR, COLABORADOR) with granular permissions.

#### Data Models
The system includes data models for Users, Economic Groups, Clients, Campaigns, Campaign Tasks, Time Entries, and Task Types to support the timesheet management workflow.

#### User Interface Components
- **Dashboard**: Role-specific landing pages with relevant metrics and quick actions.
- **Timesheet Form**: Intuitive time entry with 15-minute granularity and hierarchical task selection (Client → Campaign → Specific Task).
- **Approval Interface**: Batch approval/rejection capabilities for managers.
- **Reporting Suite**: Comprehensive analytics with filtering and export functionality.
- **Admin Panel**: System configuration and user management tools.
- **Data Cleanup Interface**: Secure data removal with password confirmation for test entries.

#### System Design Choices
- **Status Workflow**: Implemented a comprehensive status workflow system for time entries: RASCUNHO → SALVO → VALIDACAO → APROVADO → REJEITADO.
- **CSV Import System**: Supports importing data for users, clients, and campaigns using user-friendly descriptions (e.g., managerEmail, economicGroupName) instead of internal IDs, with automatic ID resolution and enhanced validation.
- **Campaign Costs Management Module**: Dedicated CRUD interface for managing campaign costs, with role-based access, autosave, dynamic filtering, and audit trails.
- **Reports Section**: Comprehensive reporting with filtering, dynamic indicators, and CSV export, including a dedicated "Custos de Campanha" tab.
- **Manager Approval System**: Enhanced approval interface with filtering, individual and batch approval, and real-time validation count updates.
- **Campaign Access Control System**: Manages collaborator access to campaigns, ensuring security and proper task visualization.
- **Data Integrity**: Robust handling of data editing with proper HTTP methods and cache invalidation.
- **Date Display Fix**: Corrected timezone issues in date formatting across all components.
- **Performance**: Optimized query invalidation and real-time data updates across all modules.
- **Smart Group and Client Deletion (2025-08-18)**: Enhanced deletion logic that preserves referential integrity. Economic groups with dependent clients are automatically moved to "Não Informado" group before deletion. Clients with logged time entries are deactivated instead of deleted, while clients without time entries are fully removed.
- **Monthly Backup System (2025-08-27)**: Updated backup file naming from daily format (`table-YYYY-MM-DD.csv`) to monthly format (`table-YYYY-MM.csv`). This prevents daily file accumulation and reduces storage usage by overwriting monthly files instead of creating new ones. Backup tracking configuration updated from `last_backup_date` to `last_backup_month`.
- **Data Cleanup System with Password Confirmation (2025-08-28)**: Added secure data cleanup functionality for removing test entries. Requires password confirmation ("123mudar") and is restricted to MASTER and ADMIN roles. Provides safe way to clear test data while maintaining data integrity.
- **Database Correction and Duplicate User Cleanup (2025-09-01)**: Corrected system documentation to accurately reflect SQL Server Azure as the primary database (not PostgreSQL). Removed 92 duplicate user records from the database, restoring clean state with 46 unique users. Updated architecture documentation to reflect proper SQL Server configuration with MSSQL connection pooling and TMS schema.

## External Dependencies

### Core Infrastructure
- **mssql**: SQL Server Azure database connectivity
- **Custom Storage Layer**: Type-safe SQL Server operations implementing IStorage interface
- **passport**: Authentication middleware and strategy management

### UI Framework
- **shadcn/ui**: Modern component library built on Radix UI and Tailwind CSS
- **@radix-ui/***: Accessible component primitives
- **tailwindcss**: Utility-first CSS framework
- **@tanstack/react-query**: Server state management and caching

### Development Tools
- **vite**: Build tool and development server
- **typescript**: Type safety
- **zod**: Runtime type validation and schema definition

### Authentication
- **openid-client**: OIDC protocol implementation
- **express-session**: Session management middleware
- **memorystore**: Memory-backed session store for SQL Server compatibility