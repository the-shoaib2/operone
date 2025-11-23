# Web App - OAuth Authentication

Next.js web application with OAuth authentication (Google, GitHub, Passkey).

## Features

- 🔐 NextAuth v5 (Auth.js)
- 🎨 Shadcn UI + Tailwind CSS
- 🗄️ PostgreSQL + Prisma ORM
- 🔑 OAuth Providers:
  - Google
  - GitHub
  - Passkey (Coming Soon)
- 🖥️ Desktop app integration via deep links

## Setup

1. **Install dependencies**:
```bash
pnpm install
```

2. **Configure environment** (`.env`):
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/operon"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
```

3. **Setup database**:
```bash
npx prisma generate
npx prisma migrate dev --name init
```

4. **Start development server**:
```bash
pnpm dev
```

Visit `http://localhost:3000/login`

## OAuth Setup

### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials
3. Add redirect URI: `http://localhost:3000/api/auth/callback/google`

### GitHub OAuth
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create OAuth App
3. Set callback URL: `http://localhost:3000/api/auth/callback/github`

## Tech Stack

- Next.js 16
- NextAuth v5
- Prisma + PostgreSQL
- Shadcn UI
- Tailwind CSS
- TypeScript
