# Operone - AI-Powered Desktop & Web Platform

A modern monorepo featuring AI-integrated applications with robust authentication, comprehensive UI components, and cross-platform support.

## 🌟 Overview

Operone is a full-stack platform that combines web and desktop applications with AI capabilities, built with modern technologies and best practices. The project includes a Next.js web application, Electron desktop app, documentation site, and a comprehensive AI/MCP integration system.

## 🏗️ Project Structure

```
operone/
├── apps/
│   ├── web/              # Next.js web app with OAuth & WebAuthn
│   ├── operone/          # Electron desktop app with deep-link auth
│   └── docs/             # Documentation & component showcase
├── packages/
│   ├── eslint-config/    # Shared ESLint configurations
│   ├── mcp/              # Model Context Protocol tools
│   ├── operone/          # Core AI & reasoning engine
│   ├── types/            # Shared TypeScript types
│   └── typescript-config/ # Shared TypeScript configs
├── tests/
│   ├── e2e/              # End-to-end tests
│   └── integration/      # Integration tests
└── python/               # Python connectors and models (planned)
```

## 🚀 Features

### Web Application (`apps/web`)
- ✅ **Next.js 16** with App Router
- ✅ **Advanced Authentication**: OAuth (Google, GitHub) + WebAuthn/Passkey
- ✅ **Session Management**: Secure token handling and persistence
- ✅ **Modern UI**: 55+ shadcn/ui components with Tailwind CSS
- ✅ **Database**: PostgreSQL with Prisma ORM
- ✅ **Security**: Encryption utilities, API error handling
- ✅ **Testing**: Playwright e2e tests, comprehensive error boundaries

### Desktop Application (`apps/operone`)
- ✅ **Electron 34** with Vite for fast development
- ✅ **React 19** with TypeScript
- ✅ **Deep-Link Protocol**: `operone://` for seamless auth flow
- ✅ **Browser Authentication**: Secure OAuth integration
- ✅ **Cross-Platform**: macOS, Windows, Linux support
- ✅ **Modern UI**: Consistent design system with web app

### Documentation Site (`apps/docs`)
- ✅ **Component Library**: Live showcase of 55+ UI components
- ✅ **Interactive Demos**: Real-time component experimentation
- ✅ **Development Guide**: Usage examples and best practices
- ✅ **Responsive Design**: Mobile-friendly documentation

### AI & MCP Integration (`packages/`)
- ✅ **Model Provider**: Unified AI model interface
- ✅ **RAG System**: Retrieval-Augmented Generation capabilities
- ✅ **Memory Management**: Persistent context and learning
- ✅ **MCP Tools**: File, Shell, and Log tools for AI agents
- ✅ **Reasoning Engine**: Advanced decision-making systems

## 📋 Prerequisites

- **Node.js** >= 18
- **pnpm** 9.0.0
- **PostgreSQL** (for web app authentication)
- **Git** for version control

## 🛠️ Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/the-shoaib2/operone.git
cd operone
pnpm install
```

### 2. Environment Setup

Create environment files:

```bash
# Web app environment
cp apps/web/.env.example apps/web/.env

# Documentation environment
cp apps/docs/.env.example apps/docs/.env
```

Configure `apps/web/.env`:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/operone"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# OAuth Providers
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
```

### 3. Database Setup

```bash
cd apps/web
npx prisma generate
npx prisma migrate dev --name init
npx prisma studio  # Optional: View database
```

### 4. Start Development

```bash
# Run all applications
pnpm dev

# Or run individually:
pnpm dev:web        # Web app (http://localhost:3000)
pnpm dev:desktop    # Desktop app
pnpm dev:docs       # Documentation (http://localhost:3001)
```

## 🔐 Authentication System

### Web Application Flow
1. Visit `http://localhost:3000/login`
2. Choose OAuth provider (Google/GitHub) or Passkey
3. Complete authentication flow
4. Redirect to dashboard with secure session

### Desktop Application Flow
1. Launch Operone desktop app
2. Click "Sign In" → Opens browser
3. Complete OAuth authentication in browser
4. Deep-link redirect: `operone://auth?token=...`
5. Secure token storage in desktop app

### WebAuthn/Passkey Support
- Hardware security key integration
- Biometric authentication (Face ID, Touch ID)
- Passwordless login experience
- Cross-device synchronization

## 🎨 UI Component System

### Available Components (55+)
- **Forms**: Button, Input, Select, Checkbox, Radio, Switch
- **Layout**: Card, Sheet, Sidebar, Separator, Scroll Area
- **Navigation**: Tabs, Breadcrumb, Menubar, Command
- **Feedback**: Dialog, Alert, Toast, Popover, Tooltip
- **Data Display**: Table, Badge, Avatar, Chart, Calendar
- **Advanced**: Data Table, Carousel, Resizable, Sidebar

### Usage Example

```tsx
import { Button, Card, CardContent, CardHeader, CardTitle } from '@repo/ui'

export default function MyComponent() {
  return (
    <Card className="w-96">
      <CardHeader>
        <CardTitle>Welcome to Operone</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button variant="default">Get Started</Button>
        <Button variant="outline">Learn More</Button>
      </CardContent>
    </Card>
  )
}
```

## 🤖 AI & MCP Features

### Model Provider Integration
```typescript
import { ModelProvider } from '@repo/operone'

const provider = new ModelProvider({
  provider: 'openai',
  model: 'gpt-4',
  apiKey: process.env.OPENAI_API_KEY
})

const response = await provider.generate({
  prompt: 'Hello, Operone!',
  context: [...]
})
```

### MCP Tools
- **FileTool**: File system operations
- **ShellTool**: Command execution
- **LogTool**: Log analysis and monitoring

### RAG System
- Document indexing and retrieval
- Vector similarity search
- Context-aware responses

## 📱 Deep Link Protocol

The desktop app registers custom protocol handlers:

- **Authentication**: `operone://auth?token=<jwt>`
- **Actions**: `operone://action?type=<type>&data=<data>`
- **Platform Support**: macOS, Windows, Linux

## 🔧 Development Tools

### Monorepo Management
- **Turborepo**: Fast builds and caching
- **pnpm Workspaces**: Efficient dependency management
- **Changesets**: Version management and publishing

### Code Quality
- **ESLint**: Consistent code style
- **TypeScript**: Static type checking
- **Prettier**: Code formatting
- **Vitest**: Unit testing
- **Playwright**: E2E testing

### Available Scripts

```bash
# Development
pnpm dev              # Run all apps
pnpm dev:web          # Web app only
pnpm dev:desktop      # Desktop app only
pnpm dev:docs         # Documentation only

# Building
pnpm build            # Build all apps
pnpm build:web        # Web app production build
pnpm build:desktop    # Desktop app build
pnpm build:docs       # Documentation build

# Testing
pnpm test             # Run all tests
pnpm test:unit        # Unit tests
pnpm test:e2e         # End-to-end tests
pnpm test:coverage    # Coverage reports

# Code Quality
pnpm lint             # Lint all packages
pnpm check-types      # Type checking
pnpm format           # Format code
```

## 🌐 Architecture

### Technology Stack

#### Frontend
- **React 19**: Latest React features
- **Next.js 16**: Full-stack framework
- **TypeScript**: Type safety
- **Tailwind CSS**: Utility-first styling
- **shadcn/ui**: Component library

#### Backend
- **Node.js**: Runtime environment
- **PostgreSQL**: Primary database
- **Prisma**: Database ORM
- **NextAuth**: Authentication
- **Electron**: Desktop framework

#### AI/ML
- **OpenAI API**: GPT models
- **MCP Protocol**: Tool integration
- **Vector DB**: Embedding storage
- **RAG Pipeline**: Document processing

### Security Features
- JWT token authentication
- OAuth 2.0 integration
- WebAuthn/Passkey support
- Encryption utilities
- Secure token storage
- CORS protection
- Rate limiting

## 📊 Testing Strategy

### Unit Tests
- Component testing with Vitest
- Utility function testing
- API endpoint testing
- Coverage reporting

### Integration Tests
- Database operations
- Authentication flows
- API integration
- Cross-package functionality

### E2E Tests
- User journey testing
- Cross-browser testing
- Mobile responsiveness
- Desktop app functionality

## 🚀 Deployment

### Web Application
```bash
# Build for production
pnpm build:web

# Deploy to Vercel (recommended)
vercel --prod

# Or other platforms
# Netlify, Railway, DigitalOcean, etc.
```

### Desktop Application
```bash
# Build distributables
pnpm build:desktop

# Outputs:
# - dist/ (Web build)
# - dist-electron/ (Electron build)
# - Installer packages for each platform
```

### Documentation
```bash
# Build static docs
pnpm build:docs

# Deploy to Vercel/Netlify
vercel --prod
```

## 🔍 Troubleshooting

### Common Issues

#### Database Connection
```bash
# Check PostgreSQL status
brew services list | grep postgresql  # macOS
sudo systemctl status postgresql       # Linux

# Reset database
npx prisma migrate reset
```

#### OAuth Setup
- Verify redirect URIs match exactly
- Check client ID and secrets
- Ensure OAuth apps are enabled
- Test with OAuth playground tools

#### Desktop Deep Links
- **macOS**: App must be built and installed
- **Windows**: Run as administrator first time
- **Linux**: Check protocol handler registration

#### Development Issues
```bash
# Clear caches
pnpm store prune
rm -rf .turbo
rm -rf node_modules
pnpm install

# Reset database
npx prisma migrate reset
```

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** changes: `git commit -m 'Add amazing feature'`
4. **Push** to branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

### Development Guidelines
- Follow existing code patterns
- Add tests for new features
- Update documentation
- Use semantic commit messages
- Ensure all tests pass

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Next.js Team** - Amazing framework
- **Auth.js** - Authentication solution
- **shadcn/ui** - Beautiful components
- **Electron** - Desktop capabilities
- **Vercel** - Hosting platform
- **OpenAI** - AI models
- **MCP Community** - Protocol development

## 📞 Support

- **Documentation**: [Visit docs site](http://localhost:3001)
- **Issues**: [GitHub Issues](https://github.com/your-org/operone/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/operone/discussions)
- **Community**: [Discord Server](https://discord.gg/your-server)

---

**Built with ❤️ by the Operone team**
