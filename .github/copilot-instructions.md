# EverUndang - Copilot Development Instructions

## Project Overview

**EverUndang** is a digital wedding/event invitation platform built with modern DevOps practices. It provides an interactive, customizable invitation experience with real-time RSVP management, guestbook functionality, and comprehensive admin controls.

---

## Technology Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT (jsonwebtoken), Argon2 for hashing
- **Validation**: Zod schemas
- **QR Generation**: qrcode library
- **Container**: Docker with multi-stage builds

### Frontend
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v7
- **State Management**: TanStack Query (React Query)
- **Styling**: CSS (custom design system)
- **Container**: Nginx serving static build

### DevOps
- **Containerization**: Docker & Docker Compose
- **CI/CD**: GitHub Actions
- **Registry**: GitHub Container Registry (GHCR)
- **Hosting**: Render (static site + web service + managed Postgres)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React SPA)                   │
│  - Hash-based routing for static hosting                    │
│  - TanStack Query for server state                          │
│  - Responsive design with theme support                     │
└─────────────────────────┬───────────────────────────────────┘
                          │ REST API (JSON)
┌─────────────────────────▼───────────────────────────────────┐
│                    Backend (Express API)                     │
│  - /api/invitations/* endpoints                             │
│  - Owner/Admin authentication middleware                    │
│  - Rate limiting with behavioral analysis                   │
│  - Audit logging for security events                        │
└─────────────────────────┬───────────────────────────────────┘
                          │ SQL via pg driver
┌─────────────────────────▼───────────────────────────────────┐
│                    PostgreSQL Database                       │
│  - invitations, rsvps, guestbook_entries, guest_codes       │
│  - Custom ENUM types for status, rsvp_mode, etc.            │
└─────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
EverUndang/
├── .github/
│   ├── copilot-instructions.md    # This file
│   └── workflows/                 # CI/CD pipelines
├── backend/
│   ├── src/
│   │   ├── config.ts              # Environment configuration
│   │   ├── db.ts                  # Database initialization
│   │   ├── server.ts              # Express app entry point
│   │   ├── types.ts               # TypeScript type definitions
│   │   ├── middleware/            # Auth and other middleware
│   │   ├── repositories/          # Data access layer
│   │   ├── routes/                # API route handlers
│   │   ├── scripts/               # Migration and seed scripts
│   │   └── utils/                 # Helper utilities
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/                   # API client functions
│   │   ├── components/            # Reusable UI components
│   │   ├── context/               # React context providers
│   │   ├── data/                  # Static data and templates
│   │   ├── hooks/                 # Custom React hooks
│   │   ├── pages/                 # Route page components
│   │   ├── router.tsx             # Route definitions
│   │   └── types.ts               # Frontend type definitions
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml             # Local development setup
└── README.md
```

---

## Key Entities

### Invitation
- Slug-based public URL (`/i/:slug`)
- Couple info, event details, custom sections
- Theme customization (colors, background, music)
- Status workflow: draft → published → closed
- RSVP modes: open, passcode-protected, guest-code-only

### RSVP
- Guest response (yes/maybe/no)
- Party size tracking
- Optional message
- Device fingerprinting for duplicate prevention

### GuestBook
- Guest messages displayed on invitation page
- Moderation support (planned)

### Guest Codes
- Pre-generated unique codes for invite-only RSVPs
- Optional `issuedTo` field for tracking

---

## Development Guidelines

### Code Style
- Use TypeScript strict mode
- Prefer async/await over callbacks
- Use Zod for runtime validation
- Keep functions small and focused
- Add JSDoc comments for public APIs

### Security Practices
- Never expose secret hashes in API responses
- Validate all user inputs with Zod schemas
- Use parameterized queries (pg driver handles this)
- Sanitize outputs to prevent XSS
- Implement rate limiting on sensitive endpoints

### Testing Strategy
- Unit tests for utilities and validators
- Integration tests for API endpoints
- E2E tests for critical user flows (planned)

### Performance Guidelines
- Use database indexes for frequent queries
- Implement pagination for list endpoints
- Cache static assets aggressively
- Optimize bundle size with tree shaking

---

## Iteration Philosophy

This project follows an **infinite iteration model**:

1. **Analyze** - Identify weaknesses, inefficiencies, or missing features
2. **Implement** - Make meaningful improvements with clean code
3. **Document** - Explain every change with clear reasoning
4. **Repeat** - Always look for the next improvement opportunity

### Priority Areas
1. **Security** - Rate limiting, input validation, audit logging
2. **Performance** - Query optimization, caching, lazy loading
3. **UX** - Loading states, error handling, accessibility
4. **Features** - Unique differentiators from competitors
5. **DevOps** - Monitoring, alerting, deployment improvements

---

## Implemented Features

### 1. Smart Rate Limiting with Behavioral Analysis ✅
Advanced rate limiting that adapts based on user behavior patterns. Includes:
- Progressive delays for suspicious activity
- Device fingerprint correlation
- IP-based tracking with configurable limits
- Endpoint-specific rate limits (RSVP, guestbook, admin, etc.)

### 2. Gift Registry with Template Suggestions ✅
Gift suggestion system based on curated templates:
- Pre-defined gift categories (kitchen, home decor, experiences, etc.)
- Price range filtering (budget, moderate, premium, luxury)
- Gift reservation system for guests
- Couple preference storage

### 3. Event Analytics Dashboard ✅
Owner dashboard showing:
- RSVP trends over time (SQL-based aggregation)
- Daily activity summaries
- Response time analysis
- Predicted attendance based on RSVP patterns

### 4. Data Export ✅
Export functionality for event management:
- CSV export for RSVPs
- CSV export for guestbook entries
- JSON full event reports
- Text summary exports

---

## Environment Variables

### Backend
```env
PORT=4000
DATABASE_URL=postgres://user:pass@host:5432/db
ADMIN_SECRET=your-admin-secret
FRONTEND_URL=http://localhost:5173
FRONTEND_ORIGINS=http://localhost:5173
INVITE_OWNER_JWT_SECRET=jwt-secret-key
OWNER_TOKEN_TTL_SECONDS=2592000
ADMIN_IP_ALLOWLIST=127.0.0.1
```

### Frontend
```env
VITE_API_URL=http://localhost:4000
```

---

## API Endpoints

### Public
- `GET /health` - Health check
- `GET /api/invitations` - List published invitations
- `GET /api/invitations/slug/:slug` - Get invitation by slug
- `POST /api/invitations/:id/rsvp` - Submit RSVP
- `POST /api/invitations/:id/guestbook` - Add guestbook entry

### Owner (requires x-owner-token header)
- `GET /api/invitations/:id/manage` - Get invitation with guestbook
- `PUT /api/invitations/:id` - Update invitation
- `GET /api/invitations/:id/rsvp/manage` - Get RSVP stats and list
- `POST /api/invitations/:id/guest-codes` - Generate guest codes
- `POST /api/invitations/:id/rotate-owner-link` - Rotate owner token

### Admin (requires x-admin-k header)
- `GET /api/invitations` - List all invitations
- `PUT /api/invitations/:id` - Update any invitation
- `DELETE /api/invitations/:id` - Delete invitation
- `POST /api/invitations/:id/admin/rotate-owner-link` - Admin rotate owner link

---

## Commit Message Convention

Follow conventional commits:
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types: feat, fix, docs, style, refactor, perf, test, chore

---

## Future Roadmap

- [ ] Multi-language invitation templates
- [ ] Email/SMS notification system
- [ ] Payment integration for premium features
- [ ] Mobile app companion
- [ ] Offline-capable PWA
- [ ] A/B testing for invitation designs
- [ ] Integration with calendar apps
- [ ] Video message support
- [ ] Virtual event streaming integration

---

**Remember: This project evolves perpetually. Every improvement opens doors for the next.**
