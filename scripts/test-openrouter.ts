#!/usr/bin/env tsx
/**
 * Test script for OpenRouter API integration
 * Tests the default configuration with the free model
 */

import { createDefaultConfig, ModelProvider } from '@repo/operone';

async function testOpenRouter() {
  console.log('🧪 Testing OpenRouter API Integration\n');
  
  // Get default config
  const config = createDefaultConfig();
  
  console.log('📋 Configuration:');
  console.log(`  Provider: ${config.type}`);
  console.log(`  Model: ${config.model}`);
  console.log(`  API Key: ${config.apiKey?.substring(0, 20)}...`);
  console.log(`  Base URL: ${config.baseURL}\n`);
  
  // Create provider
  console.log('🔧 Creating model provider...');
  const provider = new ModelProvider(config);
  
  // Test connection
  console.log('🔌 Testing connection...');
  const result = await provider.testConnection();
  
  if (result.success) {
    console.log('✅ Connection successful!\n');
    
    // Try a simple generation
    console.log('💬 Testing message generation...');
    try {
      const model = provider.getModel();
      const { generateText } = await import('ai');
      
      const response = await generateText({
        model,
        prompt: 'Say "Hello from OpenRouter!" and nothing else.',
        maxTokens: 50,
      });
      
      console.log('✅ Generation successful!');
      console.log(`📝 Response: ${response.text}\n`);
      
      console.log('🎉 All tests passed!');
      process.exit(0);
    } catch (error) {
      console.error('❌ Generation failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  } else {
    console.error('❌ Connection failed:', result.error);
    console.error('\n💡 Troubleshooting:');
    console.error('  1. Check if the API key is valid');
    console.error('  2. Verify internet connection');
    console.error('  3. Check OpenRouter service status at https://openrouter.ai/status');
    process.exit(1);
  }
}

// Run the test
testOpenRouter().catch((error) => {
  console.error('❌ Test failed with error:', error);
  process.exit(1);
});
