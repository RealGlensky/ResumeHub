# ResumeBook

## Overview

ResumeBook is a professional resume sharing and collaboration platform. Users can upload, manage, and share their resumes with their network connections or publicly. The application supports job offer tracking, commenting on resumes, and professional networking features including connection requests and user discovery.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Routing**: Wouter for client-side routing with protected routes for authenticated users
- **State Management**: TanStack React Query for server state management and caching
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with a custom theme system via CSS variables
- **Forms**: React Hook Form with Zod validation schemas

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript compiled with esbuild for production
- **API Design**: RESTful API with JSON request/response format
- **File Uploads**: Multer middleware for handling resume PDFs and profile images
- **Authentication**: Passport.js with local strategy, session-based auth stored in PostgreSQL

### Data Storage
- **Database**: PostgreSQL via Neon serverless driver
- **ORM**: Drizzle ORM with schema defined in TypeScript
- **Sessions**: PostgreSQL session store using connect-pg-simple
- **File Storage**: Local filesystem storage in `uploads/` directory for resumes and profile pictures

### Key Data Models
- **Users**: Account info, profile details (name, job title, location, LinkedIn)
- **Resumes**: PDF files with visibility settings (public/private, connections-only/everyone)
- **Network Connections**: Bidirectional connections between users
- **Network Invitations**: Pending connection requests with status tracking
- **Job Offers**: Track job opportunities associated with resumes
- **Comments**: Threaded commenting on resumes

### Authentication Flow
- Password hashing with scrypt and timing-safe comparison
- Session-based authentication with PostgreSQL session store
- Password reset via email using Resend integration
- Protected routes redirect unauthenticated users to login

## External Dependencies

### Database
- **Neon PostgreSQL**: Serverless Postgres database accessed via `@neondatabase/serverless` driver
- Connection URL provided via `DATABASE_URL` environment variable

### Email Service
- **Resend**: Email delivery for password reset functionality
- Credentials fetched dynamically via Replit Connectors API

### PDF Processing
- **pdfjs-dist**: Client-side PDF rendering for resume viewing

### Image Processing
- **react-image-crop**: Profile picture cropping before upload

### Key NPM Packages
- `drizzle-orm` / `drizzle-kit`: Database ORM and migration tools
- `express-session` / `connect-pg-simple`: Session management
- `passport` / `passport-local`: Authentication
- `multer`: File upload handling
- `zod`: Runtime validation
- `@tanstack/react-query`: Data fetching and caching