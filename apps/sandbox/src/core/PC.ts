import { FileSystem } from './FileSystem';
import { MockMCPServer } from './MockMCP';
import type { Network } from './Network';

export class PC {
  id: string;
  hostname: string;
  ip: string;
  fs: FileSystem;
  mcpServer: MockMCPServer;
  status: 'online' | 'offline' | 'booting';
  logs: string[] = [];
  network: Network;

  services: Map<string, { port: number, type: string, status: 'running' | 'stopped' }> = new Map();

  constructor(id: string, hostname: string, ip: string, network: Network) {
    this.id = id;
    this.hostname = hostname;
    this.ip = ip;
    this.network = network;
    this.status = 'online';
    
    this.fs = new FileSystem();
    this.mcpServer = new MockMCPServer('system-server');
    
    // Add default tools
    this.addDefaultTools();

    // Start default services
    this.startService('file-server', 21);

    this.log(`System initialized. IP: ${ip}`);
  }

  startService(type: string, port: number) {
    this.services.set(type, { port, type, status: 'running' });
    this.log(`Service started: ${type} on port ${port}`);
  }

  stopService(type: string) {
    const service = this.services.get(type);
    if (service) {
      service.status = 'stopped';
      this.log(`Service stopped: ${type}`);
    }
  }

  // Simulate receiving a packet/request
  async handleRequest(port: number, payload: any): Promise<{ status: number, data?: any, error?: string }> {
    // Find service listening on this port
    const service = Array.from(this.services.values()).find(s => s.port === port && s.status === 'running');
    
    if (!service) {
      return { status: 404, error: 'Connection refused: No service on port ' + port };
    }

    // Handle based on service type
    if (service.type === 'file-server') {
        return this.handleFileServerRequest(payload);
    }

    return { status: 501, error: 'Service type not implemented' };
  }

  private handleFileServerRequest(payload: any) {
      if (payload.action === 'read') {
          const content = this.fs.readFile(payload.path);
          if (content !== null) {
              return { status: 200, data: content };
          } else {
              return { status: 404, error: 'File not found' };
          }
      }
      if (payload.action === 'write') {
          this.fs.writeFile(payload.path, payload.content);
          return { status: 200, data: 'File written' };
      }
      return { status: 400, error: 'Invalid action' };
  }

  private addDefaultTools() {
    this.mcpServer.registerTool({
      name: 'echo',
      description: 'Echo back the input',
      schema: { type: 'object', properties: { message: { type: 'string' } } },
      execute: async ({ message }) => `ECHO: ${message}`
    });
    
    this.mcpServer.registerTool({
      name: 'read_file',
      description: 'Read a file from the simulated FS',
      schema: { type: 'object', properties: { path: { type: 'string' } } },
      execute: async ({ path }) => {
        const content = this.fs.readFile(path);
        return content || `Error: File ${path} not found`;
      }
    });

    this.mcpServer.registerTool({
      name: 'list_files',
      description: 'List files in directory',
      schema: { type: 'object', properties: { path: { type: 'string' } } },
      execute: async ({ path }) => {
         return this.fs.ls(path).join('\n');
      }
    });
  }

  log(message: string) {
    const timestamp = new Date().toISOString();
    this.logs.push(`[${timestamp}] ${message}`);
  }

  async executeCommand(command: string): Promise<string> {
    this.log(`Command received: ${command}`);
    
    const parts = command.trim().split(/\s+/);
    const cmd = parts[0];
    const args = parts.slice(1);

    try {
      switch (cmd) {
        // File System Commands
        case 'ls':
          return this.cmdLs(args);
        case 'cat':
          return this.cmdCat(args);
        case 'echo':
          return args.join(' ');
        case 'touch':
          return this.cmdTouch(args);
        case 'rm':
          return this.cmdRm(args);
        case 'mkdir':
          return this.cmdMkdir(args);
        case 'pwd':
          return '/home';

        // Network Commands
        case 'ping':
          return this.cmdPing(args);
        case 'ifconfig':
          return this.cmdIfconfig();
        case 'netstat':
          return this.cmdNetstat();

        // System Commands
        case 'hostname':
          return this.hostname;
        case 'whoami':
          return 'user';
        case 'uptime':
          return this.cmdUptime();
        case 'ps':
          return this.cmdPs();
        case 'status':
          return `Host: ${this.hostname}\nIP: ${this.ip}\nStatus: ${this.status}`;

        // Service Commands
        case 'service':
          return this.cmdService(args);
        
        // Networking Commands (Topology-aware)
        case 'route':
          return this.cmdRoute();
        case 'traceroute':
          return this.cmdTraceroute(args);
        case 'ssh':
          return this.cmdSsh(args);
        case 'scp':
          return this.cmdScp(args);
        
        // Help
        case 'help':
          return this.cmdHelp();
        
        case 'clear':
          return '\n'.repeat(50); // Simulate clear

        default:
          return `Command not found: ${cmd}\nType 'help' for available commands`;
      }
    } catch (error: any) {
      return `Error: ${error.message}`;
    }
  }

  private cmdLs(args: string[]): string {
    const path = args[0] || '/';
    const files = this.fs.ls(path);
    return files.length > 0 ? files.join('\n') : 'No files found';
  }

  private cmdCat(args: string[]): string {
    if (args.length === 0) return 'Usage: cat <filename>';
    const content = this.fs.readFile(args[0]);
    return content !== null ? content : `cat: ${args[0]}: No such file`;
  }

  private cmdTouch(args: string[]): string {
    if (args.length === 0) return 'Usage: touch <filename>';
    this.fs.writeFile(args[0], '');
    return '';
  }

  private cmdRm(args: string[]): string {
    if (args.length === 0) return 'Usage: rm <filename>';
    const deleted = this.fs.deleteFile(args[0]);
    return deleted ? '' : `rm: cannot remove '${args[0]}': No such file`;
  }

  private cmdMkdir(args: string[]): string {
    if (args.length === 0) return 'Usage: mkdir <dirname>';
    // Simplified - just create a marker file
    this.fs.writeFile(`${args[0]}/.dir`, '');
    return '';
  }

  private cmdPing(args: string[]): string {
    if (args.length === 0) return 'Usage: ping <hostname|ip>';
    const target = args[0];
    // Simulate ping
    return `PING ${target}\n64 bytes from ${target}: icmp_seq=1 ttl=64 time=0.5 ms\n64 bytes from ${target}: icmp_seq=2 ttl=64 time=0.4 ms\n64 bytes from ${target}: icmp_seq=3 ttl=64 time=0.6 ms\n--- ${target} ping statistics ---\n3 packets transmitted, 3 received, 0% packet loss`;
  }

  private cmdIfconfig(): string {
    return `eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet ${this.ip}  netmask 255.255.255.0  broadcast 192.168.1.255
        ether 02:42:ac:11:00:02  txqueuelen 0  (Ethernet)
        RX packets 1234  bytes 567890 (567.8 KB)
        TX packets 987  bytes 123456 (123.4 KB)`;
  }

  private cmdNetstat(): string {
    const serviceList = Array.from(this.services.entries())
      .map(([name, svc]) => `tcp        0      0 ${this.ip}:${svc.port}           0.0.0.0:*               LISTEN      ${name}`)
      .join('\n');
    
    return `Active Internet connections (servers and established)
Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program
${serviceList || 'No active connections'}`;
  }

  private cmdUptime(): string {
    return `up 2 days, 3:45, 1 user, load average: 0.15, 0.20, 0.18`;
  }

  private cmdPs(): string {
    const services = Array.from(this.services.entries())
      .map(([name], i) => `${1000 + i}  pts/0    00:00:0${i} ${name}`)
      .join('\n');
    
    return `  PID TTY          TIME CMD
  1    ?        00:00:01 init
  100  ?        00:00:00 sshd
${services}`;
  }

  private cmdService(args: string[]): string {
    if (args.length < 2) return 'Usage: service <name> <start|stop|status>';
    
    const [serviceName, action] = args;
    
    switch (action) {
      case 'start':
        if (serviceName === 'file-server') {
          this.startService('file-server', 21);
          return `Starting file-server service... [OK]`;
        }
        return `Service ${serviceName} not found`;
      
      case 'stop':
        this.stopService(serviceName);
        return `Stopping ${serviceName} service... [OK]`;
      
      case 'status':
        const svc = this.services.get(serviceName);
        if (svc) {
          return `${serviceName} is ${svc.status} on port ${svc.port}`;
        }
        return `${serviceName} is not running`;
      
      default:
        return `Unknown action: ${action}`;
    }
  }

  private cmdRoute(): string {
    const topology = this.network.currentTopology;
    const allPCs = this.network.getAllPCs();
    const hubPC = allPCs[0];
    
    let output = `Current Topology: ${topology}\n`;
    
    switch (topology) {
      case 'star':
        output += `Hub: ${hubPC.hostname} (${hubPC.ip})\n`;
        output += `All traffic routes through hub\n`;
        break;
      case 'mesh':
        output += `Full mesh topology\n`;
        output += `Direct connections to all nodes\n`;
        break;
      case 'bus':
        output += `Linear bus topology\n`;
        output += `Traffic travels along the bus\n`;
        break;
      case 'ring':
        output += `Ring topology\n`;
        output += `Traffic follows circular path\n`;
        break;
      case 'tree':
        output += `Binary tree topology\n`;
        output += `Root: ${hubPC.hostname} (${hubPC.ip})\n`;
        break;
    }
    
    output += `\nConnected PCs: ${allPCs.length}`;
    return output;
  }

  private cmdTraceroute(args: string[]): string {
    if (args.length === 0) return 'Usage: traceroute <hostname|ip>';
    
    const target = args[0];
    let targetPC = this.network.getPcByIp(target) || this.network.getPcByHostname(target);
    
    if (!targetPC) {
      return `traceroute: unknown host ${target}`;
    }
    
    const path = this.network.findRoutingPath(this.id, targetPC.id);
    
    if (path.length === 0) {
      return `traceroute: no route to host ${target}`;
    }
    
    let output = `Tracing route to ${targetPC.hostname} (${targetPC.ip})\n`;
    output += `over a maximum of ${path.length - 1} hops:\n\n`;
    
    for (let i = 0; i < path.length; i++) {
      const pc = this.network.getPC(path[i]);
      if (pc) {
        const latency = (Math.random() * 2 + i * 0.5).toFixed(1);
        output += `  ${i + 1}  ${pc.hostname} (${pc.ip})  ${latency}ms\n`;
      }
    }
    
    output += `\nTrace complete.`;
    return output;
  }

  private cmdSsh(args: string[]): string {
    if (args.length === 0) return 'Usage: ssh <hostname|ip>';
    
    const target = args[0];
    const targetPC = this.network.getPcByIp(target) || this.network.getPcByHostname(target);
    
    if (!targetPC) {
      return `ssh: Could not resolve hostname ${target}`;
    }
    
    if (targetPC.status !== 'online') {
      return `ssh: connect to host ${target} port 22: No route to host`;
    }
    
    const path = this.network.findRoutingPath(this.id, targetPC.id);
    
    if (path.length === 0) {
      return `ssh: connect to host ${target} port 22: No route to host`;
    }
    
    return `Connected to ${targetPC.hostname} (${targetPC.ip})\nWelcome to ${targetPC.hostname}\n\nNote: This is a simulated SSH connection.\nUse the network map to select ${targetPC.hostname} to interact with it.`;
  }

  private cmdScp(args: string[]): string {
    if (args.length < 2) return 'Usage: scp <file> <hostname|ip>';
    
    const filename = args[0];
    const target = args[1];
    
    const fileContent = this.fs.readFile(filename);
    if (fileContent === null) {
      return `scp: ${filename}: No such file or directory`;
    }
    
    const targetPC = this.network.getPcByIp(target) || this.network.getPcByHostname(target);
    
    if (!targetPC) {
      return `scp: Could not resolve hostname ${target}`;
    }
    
    const path = this.network.findRoutingPath(this.id, targetPC.id);
    
    if (path.length === 0) {
      return `scp: connect to host ${target} port 22: No route to host`;
    }
    
    // Simulate file transfer
    targetPC.fs.writeFile(filename, fileContent);
    this.log(`SCP: Copied ${filename} to ${targetPC.hostname}`);
    targetPC.log(`SCP: Received ${filename} from ${this.hostname}`);
    
    return `${filename}                                    100%  ${fileContent.length}B   ${(fileContent.length / 1024).toFixed(1)}KB/s   00:00`;
  }

  private cmdHelp(): string {
    return `Available commands:

File System:
  ls [path]          - List files
  cat <file>         - Display file contents
  touch <file>       - Create empty file
  rm <file>          - Remove file
  mkdir <dir>        - Create directory
  pwd                - Print working directory

Network:
  ping <host>        - Ping a host
  ifconfig           - Show network configuration
  netstat            - Show network connections
  route              - Show routing table and topology
  traceroute <host>  - Trace route to host
  ssh <host>         - Connect to remote host
  scp <file> <host>  - Secure copy file to host

System:
  hostname           - Show hostname
  whoami             - Show current user
  uptime             - Show system uptime
  ps                 - Show running processes
  status             - Show PC status

Services:
  service <name> <start|stop|status> - Manage services

Other:
  echo <text>        - Print text
  help               - Show this help
  clear              - Clear screen`;
  }
}
