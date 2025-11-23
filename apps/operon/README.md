# Operon Desktop

An Electron-based desktop application with OAuth authentication via web browser.

## Features

- 🔐 Browser-based OAuth authentication
- 🔗 Deep-link protocol handler (`operon://`)
- 💾 Secure token storage
- 🎨 Modern gradient UI
- ⚡ Built with Vite + React + TypeScript

## Development

```bash
# Install dependencies
pnpm install

# Start development mode
pnpm dev
```

## Building

```bash
# Build for production
pnpm electron:build
```

## How It Works

1. Click "Sign In" button
2. Browser opens to web app login page
3. Complete OAuth authentication (Google/GitHub)
4. Browser redirects to `operon://auth?token=...`
5. Desktop app receives token via deep link
6. Token stored securely and user authenticated

## Tech Stack

- Electron 34
- React 19
- Vite 6
- TypeScript
- electron-store for secure storage
