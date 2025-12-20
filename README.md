# HRM8 Backend API

## Overview

This is the backend API for the HRM8 (Human Resource Management) system. It's built with Express.js, TypeScript, Prisma, and PostgreSQL following a layered architecture pattern.

## Important Guidelines for Cursor AI

**CRITICAL**: When working on this backend:
1. **DO NOT create excessive README files**. Keep documentation minimal and focused.
2. **Follow the existing patterns** - analyze the codebase structure before making changes.
3. **Update BACKEND_STRUCTURE.md** (not this README) when making significant architectural changes.
4. After updating BACKEND_STRUCTURE.md, **tell the user to update BACKEND_STRUCTURE.mdc** for their reference.
5. This README.md is for human reference only - use BACKEND_STRUCTURE.md for AI context.

## Quick Start

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate

# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

## Tech Stack

- **Runtime**: Node.js with Express.js
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Session-based with HTTP-only cookies
- **Package Manager**: pnpm

## Project Structure

See `BACKEND_STRUCTURE.md` for detailed architecture and patterns.

## Environment Variables

Create a `.env` file in the backend root:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/hrm8"
PORT=3000
FRONTEND_URL="http://localhost:8080"
BACKEND_URL="http://localhost:3000"
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NODE_ENV="development"

# Email Configuration (optional - for production)
# If not set, emails will be logged to console in development mode
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@hrm8.com
EMAIL_FROM_NAME=HRM8

# Cloudinary Configuration (for file uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## Key Features

- Company-based multi-tenancy
- Role-based access control (Company Admin, Employee)
- Session-based authentication
- Company verification system
- Employee invitation system
- Email domain auto-join

## API Routes

- `/api/auth/*` - Authentication endpoints
- `/api/companies/*` - Company management
- `/api/employees/*` - Employee management

For detailed endpoint documentation, see the route files in `src/routes/`.

"stripe listen --forward-to localhost:3000/api/payments/stripe-webhook"

## Pending Verification Flow

- `POST /api/auth/resend-verification` allows pending company admins to request a new verification email. Provide the registered email in the body (`{ "email": "admin@corp.com" }`). The backend re-issues a token (24h expiry) only if the account is still awaiting verification.
- `POST /api/auth/login` now returns structured error metadata when authentication fails. When status `403` is accompanied by `details.code === 'PENDING_VERIFICATION'`, the frontend should redirect the user to the “Check your email” screen and offer the resend action above. Other codes include `INVALID_CREDENTIALS`, `ACCOUNT_INACTIVE`, `INVITATION_PENDING`, and `ACCOUNT_NOT_ACTIVE`.

