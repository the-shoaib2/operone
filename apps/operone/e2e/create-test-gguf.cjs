#!/usr/bin/env node
/**
 * Script to create a minimal valid GGUF file for testing
 * GGUF format: https://github.com/ggerganov/ggml/blob/master/docs/gguf.md
 */

const fs = require('fs');
const path = require('path');

function createMinimalGGUF(outputPath) {
    const buffer = Buffer.alloc(1024); // 1KB file
    let offset = 0;

    // Magic number: "GGUF" (4 bytes)
    buffer.write('GGUF', offset, 'ascii');
    offset += 4;

    // Version: 3 (4 bytes, little-endian uint32)
    buffer.writeUInt32LE(3, offset);
    offset += 4;

    // Tensor count: 0 (8 bytes, little-endian uint64)
    buffer.writeBigUInt64LE(0n, offset);
    offset += 8;

    // Metadata KV count: 2 (8 bytes, little-endian uint64)
    buffer.writeBigUInt64LE(2n, offset);
    offset += 8;

    // Metadata KV 1: general.name
    // Key length
    buffer.writeBigUInt64LE(BigInt('general.name'.length), offset);
    offset += 8;
    // Key string
    buffer.write('general.name', offset, 'utf8');
    offset += 'general.name'.length;
    // Value type: 8 (string)
    buffer.writeUInt32LE(8, offset);
    offset += 4;
    // Value length
    const modelName = 'test-model';
    buffer.writeBigUInt64LE(BigInt(modelName.length), offset);
    offset += 8;
    // Value string
    buffer.write(modelName, offset, 'utf8');
    offset += modelName.length;

    // Metadata KV 2: general.architecture
    // Key length
    buffer.writeBigUInt64LE(BigInt('general.architecture'.length), offset);
    offset += 8;
    // Key string
    buffer.write('general.architecture', offset, 'utf8');
    offset += 'general.architecture'.length;
    // Value type: 8 (string)
    buffer.writeUInt32LE(8, offset);
    offset += 4;
    // Value length
    const arch = 'llama';
    buffer.writeBigUInt64LE(BigInt(arch.length), offset);
    offset += 8;
    // Value string
    buffer.write(arch, offset, 'utf8');
    offset += arch.length;

    // Write to file
    fs.writeFileSync(outputPath, buffer);
    console.log(`Created minimal GGUF file at: ${outputPath}`);
    console.log(`File size: ${buffer.length} bytes`);
}

// Create the test fixture
const fixturesDir = path.join(__dirname, 'fixtures');
if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
}

const outputPath = path.join(fixturesDir, 'test-model.gguf');
createMinimalGGUF(outputPath);
