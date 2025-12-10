import { LocalModel, ModelConfig } from '../LocalModel';
import { ModelProvider, ModelOptions } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export interface GGUFConfig extends ModelConfig {
  name?: string;
  description?: string;
  tags?: string[];
}

export interface GGUFMetadata {
  name: string;
  path: string;
  size: number;
  description?: string;
  tags?: string[];
  contextSize: number;
  gpuLayers: number;
  threads: number;
  createdAt: Date;
  lastUsed?: Date;
}

export class GGUFProvider implements ModelProvider {
  id = 'gguf';
  providerType = 'local' as const;
  private localModel: LocalModel;
  private metadata: GGUFMetadata;

  constructor(config: GGUFConfig) {
    this.localModel = new LocalModel(config);
    
    // Extract metadata
    const stats = fs.existsSync(config.path) ? fs.statSync(config.path) : null;
    this.metadata = {
      name: config.name || path.basename(config.path, '.gguf'),
      path: config.path,
      size: stats?.size || 0,
      description: config.description,
      tags: config.tags,
      contextSize: config.contextSize || 2048,
      gpuLayers: config.gpuLayers || 0,
      threads: config.threads || 4,
      createdAt: new Date(),
    };
  }

  async load(): Promise<void> {
    await this.localModel.load();
    this.metadata.lastUsed = new Date();
  }

  async generate(prompt: string, options?: ModelOptions): Promise<string> {
    if (!this.localModel.isLoaded()) {
      await this.load();
    }
    this.metadata.lastUsed = new Date();
    return await this.localModel.generate(prompt, options);
  }

  async *stream(prompt: string, options?: ModelOptions): AsyncIterable<string> {
    if (!this.localModel.isLoaded()) {
      await this.load();
    }
    this.metadata.lastUsed = new Date();
    yield* this.localModel.stream(prompt, options);
  }

  isReady(): boolean {
    return this.localModel.isReady();
  }

  isLoaded(): boolean {
    return this.localModel.isLoaded();
  }

  getMetadata(): GGUFMetadata {
    return { ...this.metadata };
  }

  updateMetadata(updates: Partial<GGUFMetadata>): void {
    this.metadata = { ...this.metadata, ...updates };
  }

  /**
   * Validate GGUF file
   */
  static validateGGUFFile(filePath: string): { valid: boolean; error?: string } {
    try {
      if (!fs.existsSync(filePath)) {
        return { valid: false, error: 'File does not exist' };
      }

      const stats = fs.statSync(filePath);
      if (!stats.isFile()) {
        return { valid: false, error: 'Path is not a file' };
      }

      if (stats.size === 0) {
        return { valid: false, error: 'File is empty' };
      }

      // Check file extension
      if (!filePath.toLowerCase().endsWith('.gguf')) {
        return { valid: false, error: 'File must have .gguf extension' };
      }

      // Read magic bytes (GGUF files start with "GGUF")
      const fd = fs.openSync(filePath, 'r');
      const buffer = Buffer.alloc(4);
      fs.readSync(fd, buffer, 0, 4, 0);
      fs.closeSync(fd);

      const magic = buffer.toString('ascii');
      if (magic !== 'GGUF') {
        return { valid: false, error: 'Invalid GGUF file format (missing magic bytes)' };
      }

      return { valid: true };
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Unknown validation error' 
      };
    }
  }

  /**
   * Extract basic metadata from GGUF file
   */
  static extractMetadata(filePath: string): Partial<GGUFMetadata> {
    const stats = fs.statSync(filePath);
    const fileName = path.basename(filePath, '.gguf');
    
    // Try to extract model info from filename
    // Common patterns: model-name-7B-Q4_K_M.gguf, llama-2-13b-chat.Q5_K_S.gguf
    const sizeMatch = fileName.match(/(\d+)B/i);
    const quantMatch = fileName.match(/Q\d+_[KMS](_[MS])?/i);
    
    return {
      name: fileName,
      path: filePath,
      size: stats.size,
      tags: [
        sizeMatch ? `${sizeMatch[1]}B` : undefined,
        quantMatch ? quantMatch[0] : undefined,
      ].filter(Boolean) as string[],
      createdAt: stats.birthtime,
    };
  }

  /**
   * Get recommended settings based on file size
   */
  static getRecommendedSettings(fileSize: number): {
    contextSize: number;
    gpuLayers: number;
    threads: number;
  } {
    // Size in GB
    const sizeGB = fileSize / (1024 * 1024 * 1024);
    
    let contextSize = 2048;
    let gpuLayers = 0;
    let threads = 4;

    if (sizeGB < 2) {
      // Small models (< 2GB) - likely 3B or smaller
      contextSize = 4096;
      gpuLayers = 32;
      threads = 4;
    } else if (sizeGB < 5) {
      // Medium models (2-5GB) - likely 7B
      contextSize = 4096;
      gpuLayers = 24;
      threads = 6;
    } else if (sizeGB < 10) {
      // Large models (5-10GB) - likely 13B
      contextSize = 2048;
      gpuLayers = 16;
      threads = 8;
    } else {
      // Very large models (> 10GB) - likely 30B+
      contextSize = 2048;
      gpuLayers = 8;
      threads = 8;
    }

    return { contextSize, gpuLayers, threads };
  }
}
