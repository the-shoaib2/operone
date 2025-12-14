// import type { Client, ClientChannel } from 'ssh2';
import * as fs from 'fs';

export interface SSHConfig {
  host: string;
  port?: number;
  username: string;
  privateKeyPath?: string;
  password?: string;
}

export class SSHClient {
  private client: any | null = null;

  constructor(private config: SSHConfig) {
  }

  async connect(): Promise<void> {
    // TEMPORARY: Commented out to debug build
    /*
    const req = eval('require');
    const ssh2 = req('ssh2');
    const Client = ssh2.Client;
    this.client = new Client();
    */
    throw new Error('SSH currently disabled to fix build');

/*
    return new Promise((resolve, reject) => {
      if (!this.client) {
        return reject(new Error('SSH Client not initialized'));
      }

      this.client
        .on('ready', resolve)
        .on('error', reject)
        .connect({
          host: this.config.host,
          port: this.config.port || 22,
          username: this.config.username,
          privateKey: this.config.privateKeyPath
            ? fs.readFileSync(this.config.privateKeyPath)
            : undefined,
          password: this.config.password,
        });
    });
*/
  }


  execute(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.client) {
        return reject(new Error('SSH Client not connected'));
      }

      this.client.exec(command, (err: any, stream: any) => {
        if (err) return reject(err);

        let stdout = '';
        let stderr = '';

        stream
          .on('close', (code: number, signal: string) => {
            if (code === 0) resolve(stdout);
            else reject(new Error(`Command failed with code ${code}: ${stderr}`));
          })
          .on('data', (data: Buffer) => {
            stdout += data.toString();
          })
          .stderr.on('data', (data: Buffer) => {
            stderr += data.toString();
          });
      });
    });
  }

  disconnect(): void {
    if (this.client) {
      this.client.end();
      this.client = null;
    }
  }
}
