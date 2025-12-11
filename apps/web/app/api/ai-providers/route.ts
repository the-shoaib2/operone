import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { encryptApiKey, decryptApiKey } from '@/lib/encryption';
import { z } from 'zod';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Validation schema
const createProviderSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['openai', 'anthropic', 'google', 'mistral', 'ollama', 'openrouter', 'custom']),
  model: z.string().min(1),
  apiKey: z.string().optional(),
  baseURL: z.string().url().optional(),
  organization: z.string().optional(),
  isDefault: z.boolean().optional(),
});

/**
 * GET /api/ai-providers
 * Get all AI providers for the authenticated user
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const providers = await prisma.aIProvider.findMany({
      where: { userId: session.user.id },
      orderBy: [
        { isActive: 'desc' },
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // Return providers without decrypted API keys
    const sanitizedProviders = providers.map(provider => ({
      id: provider.id,
      name: provider.name,
      type: provider.type,
      model: provider.model,
      baseURL: provider.baseURL,
      organization: provider.organization,
      isActive: provider.isActive,
      isDefault: provider.isDefault,
      hasApiKey: !!provider.apiKey,
      createdAt: provider.createdAt.toISOString(),
      updatedAt: provider.updatedAt.toISOString(),
    }));

    return NextResponse.json({ providers: sanitizedProviders });
  } catch (error) {
    console.error('Error fetching AI providers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch providers' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai-providers
 * Create a new AI provider configuration
 */
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createProviderSchema.parse(body);

    // Check provider limit (max 10 per user)
    const providerCount = await prisma.aIProvider.count({
      where: { userId: session.user.id },
    });

    if (providerCount >= 10) {
      return NextResponse.json(
        { error: 'Maximum provider limit reached (10)' },
        { status: 400 }
      );
    }

    // Encrypt API key if provided
    const encryptedApiKey = validatedData.apiKey
      ? encryptApiKey(validatedData.apiKey)
      : null;

    // If this is set as default, unset other defaults
    if (validatedData.isDefault) {
      await prisma.aIProvider.updateMany({
        where: { userId: session.user.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Create the provider
    const provider = await prisma.aIProvider.create({
      data: {
        userId: session.user.id,
        name: validatedData.name,
        type: validatedData.type,
        model: validatedData.model,
        apiKey: encryptedApiKey,
        baseURL: validatedData.baseURL,
        organization: validatedData.organization,
        isDefault: validatedData.isDefault || false,
        isActive: false, // New providers are not active by default
      },
    });

    // If this is the first provider, make it active
    if (providerCount === 0) {
      await prisma.aIProvider.update({
        where: { id: provider.id },
        data: { isActive: true },
      });
    }

    return NextResponse.json({
      provider: {
        id: provider.id,
        name: provider.name,
        type: provider.type,
        model: provider.model,
        baseURL: provider.baseURL,
        organization: provider.organization,
        isActive: provider.isActive,
        isDefault: provider.isDefault,
        hasApiKey: !!provider.apiKey,
        createdAt: provider.createdAt.toISOString(),
        updatedAt: provider.updatedAt.toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error creating AI provider:', error);
    return NextResponse.json(
      { error: 'Failed to create provider' },
      { status: 500 }
    );
  }
}
