# Tractionfy Timesheet SaaS

## Overview
Tractionfy Timesheet SaaS is a comprehensive timesheet management application for marketing agencies with multiple clients, campaigns, and hybrid teams. It enables precise tracking of billable and non-billable hours, team management with role-based permissions, and automated monthly closing workflows. The system is designed for scalability and maintainability, emphasizing clear separation of concerns, comprehensive type safety, and robust authentication mechanisms suitable for multi-tenant SaaS deployment.

## User Preferences
Preferred communication style: Simple, everyday language.
Design library: Using shadcn/ui components for consistent, professional UI
Authentication: Simple email/password system using PostgreSQL database
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
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Authentication**: Simple email/password authentication with hashed passwords
- **Session Management**: PostgreSQL-backed sessions using connect-pg-simple and passport.js

### Database Architecture
- **Primary Database**: PostgreSQL via Neon serverless
- **Schema Management**: Drizzle Kit for migrations and schema generation
- **Connection**: WebSocket-enabled connection pooling for serverless compatibility

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
- **Manager Area - Task Management**: Gestores can add custom tasks to campaigns beyond the automatically generated default tasks. Interface allows selecting campaign, task type, and custom description for specific project needs.

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
- **Universal Campaign Access (2025-10-10)**: All authenticated users (MASTER, ADMIN, GESTOR, COLABORADOR) now have access to all active campaigns without restrictions. This replaces the previous access control system that limited collaborator visibility based on campaign_users assignments.
- **Automatic Default Task Creation (2025-10-10)**: When creating campaigns via any route (manager area, admin area), the system automatically generates default tasks based on all active task types. Each task type creates one corresponding campaign task with the task type name as description.
- **Enhanced Metrics Dashboard (2025-10-16)**: Comprehensive metrics tracking dashboard for ADMIN and MASTER users with advanced filtering capabilities. Features include multi-select filters for months, clients, campaigns, and collaborators; additional filters by cost center and manager (showing all team members when filtered by manager); horizontal bar charts with hour labels; and enhanced scatter plots with top 10 contributor labels and axis titles. Automatically excludes test user data (IDs 1, 2, 3) from all metrics.
- **Manager Team Filtering Security Fix (2025-10-16)**: Fixed critical security issue where managers (GESTORs) could view, approve, reject, edit, and delete time entries from collaborators outside their teams. Implemented consistent team-based filtering across all routes (/api/approvals/pending, /api/time-entries/validation, /api/time-entries/validation-count, /api/time-entries/approved, /api/time-entries, PATCH /api/time-entries/:id, DELETE /api/time-entries/:id, approve/reject routes). Managers now strictly see only entries where user.managerId matches their ID. Also improved query efficiency by replacing expensive full-table scans with targeted queries including user relations.
- **Detailed Weekly Approval View with Batch Actions (2025-10-23)**: Implemented comprehensive weekly approval interface (AprovacaoSemanalDetalhada.tsx) for managers with granular entry-level control and batch approval capabilities. Features include: automatic selection of first team member on load; collaborator filter dropdown; week navigation with date range display; detailed table showing individual entries by day with status indicators (R=Rascunho/gray, E=Enviado/amber, A=Aprovado/green); individual action buttons per entry (approve for VALIDACAO status, return to draft for APROVADO status, delete for non-approved entries); batch approval for entire row (all entries in a specific client/campaign/task combination); batch approval for entire week (all pending entries for selected collaborator); confirmation dialogs showing entry counts and total hours; 100-line display limit with warning message; totals per day and grand total row. Backend enhanced with date range (fromDate/toDate) and user ID filtering on /api/approvals/pending endpoint. This view replaced the previous ApprovalManagement component as the main approval interface at /approvals route.

## External Dependencies

### Core Infrastructure
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **drizzle-orm**: Type-safe database operations and migrations
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
- **connect-pg-simple**: PostgreSQL session store