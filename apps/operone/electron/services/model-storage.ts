import Store from 'electron-store';
import * as fs from 'fs';
import * as path from 'path';
import { nanoid } from 'nanoid';
import type { GGUFModelMetadata } from '@repo/types';

interface ModelStorageSchema {
  ggufModels: Record<string, GGUFModelMetadata>;
}

/**
 * Service to manage GGUF model metadata storage
 */
export class ModelStorageService {
  private store: Store<ModelStorageSchema>;

  constructor() {
    this.store = new Store<ModelStorageSchema>({
      name: 'gguf-models',
      defaults: {
        ggufModels: {}
      }
    });
  }

  /**
   * Import a GGUF model and store its metadata
   */
  async importModel(filePath: string, metadata: Partial<GGUFModelMetadata>): Promise<GGUFModelMetadata> {
    // Validate file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`Model file not found: ${filePath}`);
    }

    // Get file stats
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;

    // Generate unique ID
    const id = metadata.id || nanoid();

    // Create model metadata
    const modelMetadata: GGUFModelMetadata = {
      id,
      name: metadata.name || path.basename(filePath, '.gguf'),
      filePath: path.resolve(filePath),
      fileSize,
      importedAt: new Date(),
      description: metadata.description,
      contextSize: metadata.contextSize,
      parameterCount: metadata.parameterCount,
      quantization: metadata.quantization
    };

    // Store metadata
    const models = this.store.get('ggufModels', {});
    models[id] = modelMetadata;
    this.store.set('ggufModels', models);

    return modelMetadata;
  }

  /**
   * Get all imported GGUF models
   */
  listModels(): GGUFModelMetadata[] {
    const models = this.store.get('ggufModels', {});
    
    // Filter out models whose files no longer exist
    const validModels = Object.values(models).filter(model => {
      return fs.existsSync(model.filePath);
    });

    return validModels;
  }

  /**
   * Get a specific model by ID
   */
  getModel(id: string): GGUFModelMetadata | null {
    const models = this.store.get('ggufModels', {});
    const model = models[id];

    if (!model) {
      return null;
    }

    // Verify file still exists
    if (!fs.existsSync(model.filePath)) {
      // Remove stale entry
      this.removeModel(id);
      return null;
    }

    return model;
  }

  /**
   * Remove a model from storage
   */
  removeModel(id: string): boolean {
    const models = this.store.get('ggufModels', {});
    
    if (!models[id]) {
      return false;
    }

    delete models[id];
    this.store.set('ggufModels', models);
    return true;
  }

  /**
   * Update model metadata
   */
  updateModel(id: string, updates: Partial<GGUFModelMetadata>): GGUFModelMetadata | null {
    const models = this.store.get('ggufModels', {});
    const model = models[id];

    if (!model) {
      return null;
    }

    const updatedModel: GGUFModelMetadata = {
      ...model,
      ...updates,
      id: model.id, // Prevent ID change
      filePath: model.filePath, // Prevent path change
      fileSize: model.fileSize, // Prevent size change
      importedAt: model.importedAt // Prevent import date change
    };

    models[id] = updatedModel;
    this.store.set('ggufModels', models);

    return updatedModel;
  }

  /**
   * Validate a GGUF file
   */
  async validateGGUFFile(filePath: string): Promise<{ valid: boolean; error?: string }> {
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return { valid: false, error: 'File not found' };
      }

      // Check file extension
      const ext = path.extname(filePath).toLowerCase();
      if (ext !== '.gguf') {
        return { valid: false, error: 'File must have .gguf extension' };
      }

      // Check if file is readable
      try {
        fs.accessSync(filePath, fs.constants.R_OK);
      } catch {
        return { valid: false, error: 'File is not readable' };
      }

      // Basic GGUF magic number check (first 4 bytes should be "GGUF")
      const fd = fs.openSync(filePath, 'r');
      const buffer = Buffer.alloc(4);
      fs.readSync(fd, buffer, 0, 4, 0);
      fs.closeSync(fd);

      const magic = buffer.toString('ascii');
      if (magic !== 'GGUF') {
        return { valid: false, error: 'Invalid GGUF file format (magic number mismatch)' };
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
   * Note: This is a simplified version. Full GGUF parsing would require more complex logic.
   */
  async extractMetadata(filePath: string): Promise<Partial<GGUFModelMetadata>> {
    const fileName = path.basename(filePath, '.gguf');
    
    // Try to extract info from filename (common naming patterns)
    // Example: llama-2-7b-chat.Q4_K_M.gguf
    
    let parameterCount: string | undefined;
    let quantization: string | undefined;

    // Look for parameter count (e.g., 7b, 13b, 70b)
    const paramMatch = fileName.match(/(\d+)b/i);
    if (paramMatch) {
      parameterCount = `${paramMatch[1]}B`;
    }

    // Look for quantization (e.g., Q4_K_M, Q5_0, etc.)
    const quantMatch = fileName.match(/Q\d+[_K]?[_M]?[_S]?[_L]?/i);
    if (quantMatch) {
      quantization = quantMatch[0].toUpperCase();
    }

    return {
      name: fileName,
      parameterCount,
      quantization
    };
  }
}

// Singleton instance
let modelStorageService: ModelStorageService | null = null;

export function getModelStorageService(): ModelStorageService {
  if (!modelStorageService) {
    modelStorageService = new ModelStorageService();
  }
  return modelStorageService;
}
