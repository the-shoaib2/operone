import { describe, it, expect, beforeEach } from 'vitest';
import { ShellExecutor } from './ShellExecutor';
import { ShellExecutionTool } from './ShellExecutionTool';
import * as exports from './index';

describe('@operone/shell', () => {
  it('should export modules', () => {
    expect(exports).toBeDefined();
    expect(exports.ShellExecutor).toBeDefined();
  });
});

describe('ShellExecutor', () => {
  let executor: ShellExecutor;

  beforeEach(() => {
    executor = new ShellExecutor();
  });

  describe('Basic Command Execution', () => {
    it('should execute simple echo command', async () => {
      const result = await executor.execute('echo', ['Hello World']);
      console.log('Echo command output:', { stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode });
      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe('Hello World');
      expect(result.stderr).toBe('');
    });

    it('should execute node command to get cwd', async () => {
      const result = await executor.execute('node', ['-e', 'console.log(process.cwd())']);
      console.log('CWD command output:', { stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode });
      expect(result.exitCode).toBe(0);
      expect(result.stdout.length).toBeGreaterThan(0);
      expect(result.stderr).toBe('');
    });

    it('should execute node command to list files', async () => {
      const result = await executor.execute('node', ['-e', 'console.log(require(\"fs\").readdirSync(\".\").join(\"\\n\"))']);
      console.log('List files output:', { stdout: result.stdout.slice(0, 200) + '...', stderr: result.stderr, exitCode: result.exitCode });
      expect(result.exitCode).toBe(0);
      expect(result.stdout.length).toBeGreaterThan(0);
    });

    it('should execute node --version', async () => {
      const result = await executor.execute('node', ['--version']);
      console.log('Node version output:', { stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/^v\d+\.\d+\.\d+/);
    });

    it('should execute npm --version', async () => {
      const result = await executor.execute('npm', ['--version']);
      console.log('NPM version output:', { stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).match(/^\d+\.\d+\.\d+/);
    });
  });

  describe('Command with Options', () => {
    it('should execute command with custom cwd', async () => {
      const tempDir = process.platform === 'win32' ? process.env.TEMP || 'C:\\\\Windows\\\\Temp' : '/tmp';
      const result = await executor.execute('node', ['-e', 'console.log(process.cwd())'], { cwd: tempDir });
      console.log('Custom CWD output:', { stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode });
      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim().toLowerCase()).toContain('temp');
    });

    it('should execute command with custom environment variable', async () => {
      const result = await executor.execute('node', ['-e', 'console.log(process.env.TEST_VAR)'], {
        env: { TEST_VAR: 'custom_value' }
      });
      console.log('Custom env output:', { stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('custom_value');
    });

    it('should handle timeout correctly', async () => {
      // Test with a command that sleeps longer than timeout using Node.js
      const result = await executor.execute('node', ['-e', 'setTimeout(() => {}, 10000)'], { timeout: 1000 });
      console.log('Timeout test output:', { stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode });
      // Timeout should kill the process
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toMatch(/TIMEDOUT|timeout|killed/i);
    }, 7000);
  });

  describe('Command Validation', () => {
    it('should allow all commands by default', async () => {
      const executor = new ShellExecutor();
      await expect(executor.execute('echo', ['test'])).resolves.toBeDefined();
    });

    it('should restrict commands when whitelist is provided', async () => {
      const executor = new ShellExecutor({ allowedCommands: ['echo', 'pwd'] });

      await expect(executor.execute('echo', ['test'])).resolves.toBeDefined();
      await expect(executor.execute('pwd')).resolves.toBeDefined();

      await expect(executor.execute('ls', ['-la'])).rejects.toThrow('Command not allowed: ls');
    });

    it('should allow adding and removing commands dynamically', () => {
      const executor = new ShellExecutor({ allowedCommands: ['echo'] });

      expect(executor.getAllowedCommands()).toContain('echo');

      executor.allowCommand('pwd');
      expect(executor.getAllowedCommands()).toContain('pwd');

      executor.disallowCommand('echo');
      expect(executor.getAllowedCommands()).not.toContain('echo');
    });
  });

  describe('Streaming Output', () => {
    it('should stream command output', async () => {
      const chunks: string[] = [];

      const result = await executor.executeStream(
        'echo',
        ['Hello', 'World'],
        (data) => chunks.push(data)
      );

      console.log('Stream output:', { chunks: chunks.length, finalStdout: result.stdout, exitCode: result.exitCode });
      expect(result.exitCode).toBe(0);
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.join('')).toContain('Hello World');
    });

    it('should stream multiple lines of output', async () => {
      const chunks: string[] = [];

      const result = await executor.executeStream(
        'node',
        ['-e', 'console.log(\"line1\"); console.log(\"line2\"); console.log(\"line3\");'],
        (data) => chunks.push(data)
      );

      console.log('Multi-line stream output:', { chunks: chunks.length, output: chunks.join('').replace(/\n/g, '|'), exitCode: result.exitCode });
      expect(result.exitCode).toBe(0);
      const output = chunks.join('');
      expect(output).toContain('line1');
      expect(output).toContain('line2');
      expect(output).toContain('line3');
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent command', async () => {
      const result = await executor.execute('nonexistent-command');
      console.log('Non-existent command output:', { stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode });
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr.length).toBeGreaterThan(0);
    });

    it('should handle command that fails', async () => {
      const result = await executor.execute('node', ['-e', 'require(\"fs\").readFileSync(\"/nonexistent/file\")']);
      console.log('Failed command output:', { stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode });
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('ENOENT');
    });
  });

  describe('Complex Commands', () => {
    it('should execute git status', async () => {
      const result = await executor.execute('git', ['status']);
      console.log('Git status output:', { stdout: result.stdout.slice(0, 100) + '...', stderr: result.stderr, exitCode: result.exitCode });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('On branch');
    });

    it('should execute npm list --depth=0', async () => {
      const result = await executor.execute('npm', ['list', '--depth=0']);
      console.log('NPM list output:', { stdout: result.stdout.slice(0, 200) + '...', stderr: result.stderr, exitCode: result.exitCode });
      // npm list might fail if dependencies aren't installed, but should still run
      expect([0, 1]).toContain(result.exitCode);
      if (result.exitCode === 0) {
        expect(result.stdout).toContain('@operone/shell');
      }
    }, 10000);

    it('should find TypeScript files using Node.js', async () => {
      const findCode = 'const fs=require(\"fs\");const path=require(\"path\");function find(d,e,depth=0,max=2){if(depth>max)return[];let r=[];try{fs.readdirSync(d).forEach(f=>{const p=path.join(d,f);const s=fs.statSync(p);if(s.isDirectory()&&depth<max){r.push(...find(p,e,depth+1,max));}else if(s.isFile()&&f.endsWith(e)){r.push(p);}})}catch(e){}return r;}console.log(find(\".\",\".ts\",0,2).join(\"\\n\"));';
      const result = await executor.execute('node', ['-e', findCode]);
      console.log('Find TypeScript files output:', { stdout: result.stdout.slice(0, 200) + '...', stderr: result.stderr, exitCode: result.exitCode });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('.ts');
      expect(result.stdout).toContain('index.test.ts');
    }, 10000);
  });
});

describe('Shell Language Commands', () => {
  let executor: ShellExecutor;

  beforeEach(() => {
    executor = new ShellExecutor();
  });

  describe('Shell Language Demonstration', () => {
    it('should demonstrate variable usage with Node.js', async () => {
      const result = await executor.execute('node', ['-e', 'const myVar = \"hello world\"; console.log(myVar);']);
      console.log('Variable output:', { stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('hello world');
    });

    it('should demonstrate command execution with Node.js', async () => {
      const result = await executor.execute('node', ['-e', 'console.log(\"Current date:\", new Date().toISOString());']);
      console.log('Command execution output:', { stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Current date:');
    });

    it('should demonstrate string filtering with Node.js', async () => {
      const result = await executor.execute('node', ['-e', 'const text = \"hello world\"; if(text.includes(\"hello\")) console.log(text);']);
      console.log('String filtering output:', { stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('hello');
    });

    it('should demonstrate file operations with Node.js', async () => {
      const tempDir = process.platform === 'win32' ? process.env.TEMP || 'C:\\\\Windows\\\\Temp' : '/tmp';
      const testFile = process.platform === 'win32' ? `${tempDir}\\\\test.txt` : `${tempDir}/test.txt`;
      const escapedPath = testFile.replace(/\\/g, '\\\\');
      const result = await executor.execute('node', ['-e', `require(\"fs\").writeFileSync(\"${escapedPath}\", \"test content\"); console.log(require(\"fs\").readFileSync(\"${escapedPath}\", \"utf8\"));`]);
      console.log('File operations output:', { stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('test content');
    });

    it('should demonstrate text processing with Node.js', async () => {
      const result = await executor.execute('node', ['-e', 'console.log(\"hello world\".replace(\"world\", \"universe\"));']);
      console.log('Text processing output:', { stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('hello universe');
    });

    it('should demonstrate array filtering with Node.js', async () => {
      const result = await executor.execute('node', ['-e', 'const items = [\"apple\", \"banana\", \"cherry\"]; console.log(items.filter(i => i.startsWith(\"b\")).join(\"\\n\"));']);
      console.log('Array filtering output:', { stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('banana');
    });
  });
});

describe('ShellExecutionTool', () => {
  let tool: ShellExecutionTool;

  beforeEach(() => {
    tool = new ShellExecutionTool();
  });

  describe('MCP Tool Interface', () => {
    it('should have correct tool metadata', () => {
      expect(tool.name).toBe('shell');
      expect(tool.description).toBe('Execute shell commands locally or remotely');
      expect(tool.capabilities).toContain('local');
      expect(tool.capabilities).toContain('remote');
      expect(tool.capabilities).toContain('distributed');
    });
  });

  describe('Command Execution', () => {
    it('should execute simple commands successfully', async () => {
      const result = await tool.execute({
        command: 'echo "Hello from MCP Tool"'
      });
      console.log('MCP Tool echo output:', { success: result.success, stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode });
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Hello from MCP Tool');
      expect(result.exitCode).toBe(0);
    });

    it('should execute commands with custom directory', async () => {
      const tempDir = process.platform === 'win32' ? process.env.TEMP || 'C:\\\\Windows\\\\Temp' : '/tmp';
      const result = await tool.execute({
        command: 'node -e "console.log(process.cwd())"',
        cwd: tempDir
      });
      console.log('MCP Tool custom directory output:', { success: result.success, stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode });
      expect(result.success).toBe(true);
      expect(result.stdout.trim().toLowerCase()).toContain('temp');
    });

    it('should execute commands with environment variables', async () => {
      const result = await tool.execute({
        command: 'node -e "console.log(process.env.CUSTOM_VAR)"',
        env: { CUSTOM_VAR: 'test_value' }
      });
      console.log('MCP Tool env vars output:', { success: result.success, stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode });
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('test_value');
    });

    it('should handle command failures gracefully', async () => {
      const result = await tool.execute({
        command: 'node -e "require(\\"fs\\").readFileSync(\\"/nonexistent/file\\")"'
      });
      console.log('MCP Tool failure output:', { success: result.success, stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode });
      expect(result.success).toBe(false);
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('ENOENT');
    });
  });

  describe('Security', () => {
    it('should block dangerous commands', async () => {
      const dangerousCommands = [
        'rm -rf /',
        'dd if=/dev/zero of=/dev/sda',
        'mkfs.ext4 /dev/sda1'
      ];

      for (const cmd of dangerousCommands) {
        await expect(tool.execute({ command: cmd })).rejects.toThrow('Command blocked for security reasons');
      }
    });

    it('should allow safe commands', async () => {
      const safeCommands = [
        'node -e "console.log(require(\\"fs\\").readdirSync(\\".\\").join(\\"\\\\n\\"))"',
        'node -e "console.log(process.cwd())"',
        'echo test',
        'node -e "console.log(require(\\"fs\\").readdirSync(\\".\\").filter(f => f.endsWith(\\".js\\")).join(\\"\\\\n\\"))"'
      ];

      for (const cmd of safeCommands) {
        const result = await tool.execute({ command: cmd });
        expect(result.success).toBe(true);
      }
    });
  });
});
