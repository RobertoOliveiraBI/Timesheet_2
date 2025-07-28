# Tractionfy Timesheet SaaS

## Overview

This is a comprehensive timesheet management SaaS application designed specifically for marketing agencies managing multiple clients, campaigns, and hybrid teams. The system allows precise tracking of billable and non-billable hours, team management with role-based permissions, and automated monthly closing workflows.

### Current Status (January 2025)
- ✅ Complete authentication system with email/password
- ✅ Weekly timesheet form with hierarchical task selection (Client → Campaign → Specific Task)
- ✅ Status workflow system: RASCUNHO → SALVO → VALIDACAO → APROVADO → REJEITADO
- ✅ Approval management interface for managers and admins
- ✅ Administrative panel for complete system management
- ✅ Real-time data loading with optimized caching
- ✅ Role-based access control (MASTER, ADMIN, GESTOR, COLABORADOR)

## User Preferences

Preferred communication style: Simple, everyday language.
Design library: Using shadcn/ui components for consistent, professional UI
Authentication: Simple email/password system using PostgreSQL database
Language: Interface completely in Portuguese
UI/UX: Minimalist design, single header, weekly timesheet table format

## System Architecture

The application follows a modern full-stack architecture with clear separation between frontend and backend concerns:

### Frontend Architecture
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query for server state, React hooks for local state
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Authentication**: Simple email/password authentication with hashed passwords
- **Session Management**: PostgreSQL-backed sessions using connect-pg-simple and passport.js

### Database Architecture
- **Primary Database**: PostgreSQL via Neon serverless
- **Schema Management**: Drizzle Kit for migrations and schema generation
- **Connection**: WebSocket-enabled connection pooling for serverless compatibility

## Key Components

### Authentication & Authorization
- **OIDC Integration**: Uses Replit's OpenID Connect for secure authentication
- **Role-Based Access Control**: Four distinct user roles with granular permissions:
  - MASTER: Full system access (super admin)
  - ADMIN: User management, reporting, and month-end closing
  - GESTOR: Team management, approvals, and team-specific reporting
  - COLABORADOR: Personal time entry and viewing

### Data Models
- **Users**: Extended user profiles with contract details, departments, and hierarchical relationships
- **Economic Groups**: Client organization structure for grouping related companies
- **Clients**: Individual client entities linked to economic groups
- **Campaigns**: Project containers with user assignments and task categorization
- **Campaign Tasks**: Specific pre-configured tasks within campaigns combining task types with custom descriptions
- **Time Entries**: Core timesheet data with approval workflows using campaign_task_id and status field
- **Task Types**: Configurable activity categories for precise time classification

### Recent Updates (January 28, 2025)
- **Manager Approval System**: Complete implementation of enhanced approval interface
  - Comprehensive filtering by collaborator, month, client, and campaign
  - Individual and batch approval buttons with proper status transitions
  - Badge counter showing pending validations in manager menu (Área do Gestor)
  - Specialized endpoint `/api/time-entries/validation` for manager access control
  - Real-time validation count updates with automatic refresh every 30 seconds
- **Validation Workflow**: Implemented complete validation submission system in monthly history
  - Individual line validation: Send single entries from RASCUNHO to VALIDACAO status
  - Batch validation: Send all draft entries for validation with one click
  - Status progression: RASCUNHO → VALIDACAO → APROVADO workflow
- **Reports Overhaul**: Completely reconfigured reports screen with simplified functionality
  - Simplified filters: Only month/year, client, and campaign selection
  - Dynamic filtering: Selecting client shows only that client's campaigns
  - Correct indicators: Total hours, billable hours, non-billable hours, and clients served
  - Detailed reports table with all filtered entries
  - CSV-only download functionality (removed Excel and PDF options)
  - **NEW**: Added status filter to reports for better data segmentation
  - **NEW**: Colorized status badges across all interfaces for better visual identification
- **Status Badge System**: Implemented unified status visualization across all interfaces
  - Color-coded badges: Gray (Rascunho), Blue (Salvo), Yellow (Em Validação), Green (Aprovado)
  - Applied to Reports, Monthly History, and Manager Approval interfaces
  - Consistent visual language throughout the application
  - **CORRECTION**: Removed "REJEITADO" status - rejected entries return to "RASCUNHO" for editing
- **UI Enhancements**: 
  - Added send icons and proper button states in monthly history
  - Batch action button appears only when draft entries exist
  - Individual send buttons for each RASCUNHO entry
  - Status indicators for entries in VALIDACAO state
  - Dashboard indicators expanded to 5 cards including "Horas este mês"
  - Enhanced reports filters now include 5 columns: Month/Year, Collaborator, Client, Campaign, Status
  - **NEW**: Added comment modal in reports - displays manager comments with click-to-view functionality
  - **NEW**: Comment column in reports table with MessageCircle icon for entries with manager feedback
  - **NEW**: Added collaborator filter to reports for filtering entries by specific users
  - **NEW**: Implemented pagination for reports when more than 100 entries (100 entries per page)
  - **NEW**: Pagination controls with page numbers, navigation buttons, and entry count display
  - **REFINED**: Collaborator filter now shows only users with COLABORADOR role for better usability
- **Campaign Access Control System**: Implemented complete system for managing collaborator access to campaigns
  - **NEW**: Campaign access endpoints (`/api/campanhas/:id/colaboradores`) for admin management
  - **NEW**: Role-based campaign filtering - collaborators see only assigned campaigns, admins see all
  - **NEW**: CampaignAccessModal component for intuitive permission management in admin interface
  - **NEW**: Enhanced task visualization with client and campaign information displayed below descriptions
  - **Automatic Assignment**: When creating new campaigns, access control must be explicitly managed
  - **Security**: Collaborators cannot access campaigns without explicit permission assignment
- **Data Integrity**: Fixed editing functionality with proper HTTP methods (PATCH) and cache invalidation
- **Data Cleanup**: Removed all test time entries from master user Roberto (23 entries deleted)
- **Date Display Fix**: Corrected timezone issues in date formatting across all components
  - **FIXED**: Date entries now display correctly (28/07 shows as 28/07, not 27/07)
  - **IMPROVEMENT**: Added 'T00:00:00' suffix to date strings before parsing to prevent timezone shifting
  - **CONSISTENCY**: Applied fix to all date formatting functions in timesheet, reports, and approval components
- **Performance**: Optimized query invalidation and real-time data updates across all modules

### User Interface Components
- **Dashboard**: Role-specific landing pages with relevant metrics and quick actions
- **Timesheet Form**: Intuitive time entry with 15-minute granularity and campaign/task selection
- **Approval Interface**: Batch approval/rejection capabilities for managers
- **Reporting Suite**: Comprehensive analytics with filtering and export functionality
- **Admin Panel**: System configuration and user management tools

## Data Flow

### Time Entry Workflow
1. User selects date, campaign, task type, and duration
2. System validates permissions and business rules
3. Entry saved with DRAFT status
4. Manager reviews and approves/rejects entries
5. Approved entries become available for billing reports

### Authentication Flow
1. User accesses application
2. Redirected to Replit OIDC provider if not authenticated
3. Upon successful authentication, user profile created/updated
4. Session established with PostgreSQL-backed storage
5. Role-based navigation and features presented

### Reporting Data Flow
1. Raw time entries aggregated by various dimensions
2. Real-time calculations for billable vs non-billable hours
3. User and team performance metrics generation
4. Export capabilities for external billing systems

## External Dependencies

### Core Infrastructure
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **drizzle-orm**: Type-safe database operations and migrations
- **passport**: Authentication middleware and strategy management

### UI Framework
- **shadcn/ui**: Modern component library built on Radix UI and Tailwind CSS
- **@radix-ui/***: Accessible component primitives (via shadcn/ui)
- **tailwindcss**: Utility-first CSS framework
- **@tanstack/react-query**: Server state management and caching

### Development Tools
- **vite**: Build tool and development server
- **typescript**: Type safety and developer experience
- **zod**: Runtime type validation and schema definition

### Authentication
- **openid-client**: OIDC protocol implementation
- **express-session**: Session management middleware
- **connect-pg-simple**: PostgreSQL session store

## Deployment Strategy

### Development Environment
- **Replit Integration**: Optimized for Replit development environment
- **Hot Module Replacement**: Vite provides fast development feedback
- **Database Migrations**: Drizzle Kit handles schema evolution

### Production Considerations
- **Build Process**: Vite builds optimized static assets, esbuild bundles server code
- **Database**: PostgreSQL with connection pooling for scalability
- **Session Storage**: Database-backed sessions for multi-instance deployment
- **Environment Variables**: Secure configuration management for database URLs and secrets

### Security Measures
- **OIDC Authentication**: Industry-standard authentication protocol
- **Role-Based Permissions**: Granular access control throughout the application
- **SQL Injection Prevention**: Drizzle ORM provides query parameterization
- **Session Security**: HTTPOnly cookies with secure flags in production

The system is designed for scalability and maintainability, with clear separation of concerns, comprehensive type safety, and robust authentication mechanisms suitable for multi-tenant SaaS deployment.