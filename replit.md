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