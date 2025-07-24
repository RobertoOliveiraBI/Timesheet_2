# Tractionfy Timesheet SaaS

## Overview

This is a comprehensive timesheet management SaaS application designed specifically for marketing agencies managing multiple clients, campaigns, and hybrid teams. The system allows precise tracking of billable and non-billable hours, team management with role-based permissions, and automated monthly closing workflows.

## User Preferences

Preferred communication style: Simple, everyday language.

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
- **Authentication**: OpenID Connect (OIDC) with Replit Auth
- **Session Management**: PostgreSQL-backed sessions using connect-pg-simple

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
- **Time Entries**: Core timesheet data with approval workflows and audit trails
- **Task Types**: Configurable activity categories for precise time classification

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
- **@radix-ui/***: Accessible component primitives
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