# Operon - Full Stack OAuth Project

A monorepo project featuring a Next.js web application with OAuth authentication (Google, GitHub, Passkey) and an Electron desktop application with deep-link authentication flow.

## 🏗️ Project Structure

```
operon/
├── apps/
│   ├── web/          # Next.js web app with OAuth
│   └── operon/       # Electron desktop app
├── packages/
│   ├── ui/           # Shared UI components
│   ├── eslint-config/
│   └── typescript-config/
└── turbo.json        # Turborepo configuration
```

## 🚀 Features

### Web App (`apps/web`)
- ✅ Next.js 16 with App Router
- ✅ NextAuth v5 (Auth.js) with Prisma adapter
- ✅ OAuth Providers:
  - Google OAuth
  - GitHub OAuth
  - Passkey/WebAuthn (Coming Soon)
- ✅ Shadcn UI components
- ✅ Tailwind CSS v3
- ✅ PostgreSQL database with Prisma ORM
- ✅ Beautiful gradient UI design
- ✅ Session management
- ✅ Deep-link support for desktop app

### Desktop App (`apps/operon`)
- ✅ Electron 34 with Vite
- ✅ React 19 with TypeScript
- ✅ Deep-link protocol handler (`operon://`)
- ✅ Browser-based authentication flow
- ✅ Secure token storage
- ✅ Modern gradient UI
- ✅ Cross-platform support (macOS, Windows, Linux)

## 📋 Prerequisites

- Node.js >= 18
- pnpm 9.0.0
- PostgreSQL database (for web app)

## 🛠️ Setup Instructions

### 1. Install Dependencies

```bash
# Install all dependencies
pnpm install
```

### 2. Configure Web App Environment

Create or update `apps/web/.env`:

```bash
# Database (PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/operon"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# GitHub OAuth
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
```

### 3. Setup Database

```bash
cd apps/web

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# (Optional) Open Prisma Studio
npx prisma studio
```

### 4. Get OAuth Credentials

#### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy Client ID and Client Secret to `.env`

#### GitHub OAuth
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create a new OAuth App
3. Set Homepage URL: `http://localhost:3000`
4. Set Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
5. Copy Client ID and Client Secret to `.env`

## 🎯 Running the Applications

### Development Mode

```bash
# Run all apps in development mode
pnpm dev

# Or run individually:

# Web app only (port 3000)
cd apps/web && pnpm dev

# Desktop app only
cd apps/operon && pnpm dev
```

### Production Build

```bash
# Build all apps
pnpm build

# Build web app
cd apps/web && pnpm build

# Build desktop app
cd apps/operon && pnpm electron:build
```

## 🔐 Authentication Flow

### Web App Flow
1. User visits `http://localhost:3000/login`
2. Clicks "Continue with Google" or "Continue with GitHub"
3. Completes OAuth flow
4. Redirected to `/dashboard` with session

### Desktop App Flow
1. User opens Operon Desktop app
2. Clicks "Sign In" button
3. Browser opens to `http://localhost:3000/login?from=desktop`
4. User completes OAuth authentication
5. Browser redirects to `operon://auth?token=...`
6. Desktop app receives token via deep link
7. Token stored securely in app

## 📱 Deep Link Protocol

The desktop app registers the `operon://` protocol handler:

- **Auth callback**: `operon://auth?token=<jwt-token>`
- **Platform support**: macOS, Windows, Linux

## 🎨 UI Design

Both applications feature:
- Modern gradient backgrounds
- Glassmorphism effects
- Smooth animations
- Responsive layouts
- Dark mode ready
- Premium aesthetics

## 📦 Tech Stack

### Web App
- **Framework**: Next.js 16
- **Auth**: NextAuth v5 (Auth.js)
- **Database**: PostgreSQL + Prisma
- **UI**: Shadcn UI + Tailwind CSS
- **Language**: TypeScript

### Desktop App
- **Framework**: Electron 34
- **Frontend**: React 19 + Vite
- **Storage**: electron-store
- **Language**: TypeScript

## 🔧 Development Tools

- **Monorepo**: Turborepo
- **Package Manager**: pnpm
- **Linting**: ESLint
- **Type Checking**: TypeScript

## 📝 Available Scripts

```bash
# Development
pnpm dev              # Run all apps in dev mode
pnpm build            # Build all apps
pnpm lint             # Lint all packages
pnpm check-types      # Type check all packages

# Web App
cd apps/web
pnpm dev              # Start dev server (port 3000)
pnpm build            # Build for production
pnpm start            # Start production server

# Desktop App
cd apps/operon
pnpm dev              # Start Electron in dev mode
pnpm electron:build   # Build desktop app
```

## 🐛 Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Check `DATABASE_URL` in `.env`
- Run `npx prisma migrate dev`

### OAuth Errors
- Verify redirect URIs match exactly
- Check client ID and secret
- Ensure OAuth apps are enabled

### Desktop App Deep Link Not Working
- On macOS: App must be built and installed
- On Windows: Run as administrator first time
- On Linux: Check protocol handler registration

## 🤝 Contributing

This is a monorepo managed with Turborepo and pnpm workspaces.

## 📄 License

MIT

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Auth.js (NextAuth) for authentication
- Shadcn for beautiful UI components
- Electron team for desktop capabilities
