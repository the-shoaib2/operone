# Traditional OS Services Implementation Guide
**Using Operone Automation Library**

---

## 📋 Overview

This guide demonstrates how to implement **11 traditional OS lab services** using the **Operone automation library**. Leverage `@operone/automation`, `@operone/shell`, and `@operone/networking` packages to configure, manage, and monitor network services across distributed environments.

---

## 🚀 Quick Start

### Installation
```bash
# Install required packages
npm install @operone/automation @operone/shell @operone/networking @repo/types

# Optional: Install desktop automation dependencies
npm install robotjs
```

### Basic Setup
```typescript
import { BrowserAutomation } from '@operone/automation';
import { ShellExecutionTool } from '@operone/shell';
import { PeerNetwork } from '@operone/networking';

// Initialize automation tools
const browser = new BrowserAutomation({ headless: false });
const shell = new ShellExecutionTool();
const network = new PeerNetwork({
  port: 9876,
  enableTLS: true,
  maxPeers: 50
});
```

---

## 📧 1. Mail Server Implementation

### **Postfix + Dovecot IMAP/POP3 Server**

```typescript
import { ShellExecutionTool } from '@operone/shell';

export class MailServerAutomation {
  constructor(private shell: ShellExecutionTool) {}

  async installPostfix(): Promise<void> {
    await this.shell.execute({
      command: 'sudo apt update && sudo apt install -y postfix dovecot-imapd dovecot-pop3d'
    });
  }

  async configurePostfix(domain: string): Promise<void> {
    const config = `
myhostname = mail.${domain}
mydomain = ${domain}
myorigin = $mydomain
mydestination = $mydomain, localhost
relay_domains = 
mynetworks = 127.0.0.0/8 [::ffff:127.0.0.0]/104 [::1]/128
mailbox_size_limit = 0
recipient_delimiter = +
inet_interfaces = all
inet_protocols = ipv4
smtpd_tls_security_level = encrypt
smtpd_tls_cert_file=/etc/ssl/certs/ssl-cert-snakeoil.pem
smtpd_tls_key_file=/etc/ssl/private/ssl-cert-snakeoil.key
smtpd_use_tls=yes
    `.trim();

    await this.shell.execute({
      command: `echo '${config}' | sudo tee /etc/postfix/main.cf`
    });
  }

  async configureDovecot(): Promise<void> {
    await this.shell.execute({
      command: 'sudo sed -i "s/#mail_location = maildir:~/mail_location = maildir:~/Maildir/g" /etc/dovecot/conf.d/10-mail.conf'
    });
    
    await this.shell.execute({
      command: 'sudo sed -i "s/#disable_plaintext_auth = yes/disable_plaintext_auth = no/g" /etc/dovecot/conf.d/10-auth.conf'
    });
  }

  async setupSpamFilter(): Promise<void> {
    // Install SpamAssassin
    await this.shell.execute({
      command: 'sudo apt install -y spamassassin spamc'
    });
    
    // Configure Postfix to use SpamAssassin
    await this.shell.execute({
      command: 'echo "content_filter = spamassassin" | sudo tee -a /etc/postfix/main.cf'
    });
  }

  async enableServices(): Promise<void> {
    await this.shell.execute({ command: 'sudo systemctl restart postfix' });
    await this.shell.execute({ command: 'sudo systemctl restart dovecot' });
    await this.shell.execute({ command: 'sudo systemctl enable postfix' });
    await this.shell.execute({ command: 'sudo systemctl enable dovecot' });
  }

  async createEmailAccount(username: string, password: string): Promise<void> {
    await this.shell.execute({
      command: `sudo useradd -m ${username}`
    });
    
    await this.shell.execute({
      command: `echo "${username}:${password}" | sudo chpasswd`
    });
  }
}

// Usage
const mailServer = new MailServerAutomation(shell);
await mailServer.installPostfix();
await mailServer.configurePostfix('example.com');
await mailServer.configureDovecot();
await mailServer.setupSpamFilter();
await mailServer.enableServices();
await mailServer.createEmailAccount('testuser', 'securepassword');
```

---

## 🌐 2. DHCP Server Implementation

### **ISC DHCP Server**

```typescript
export class DHCPServerAutomation {
  constructor(private shell: ShellExecutionTool) {}

  async installDHCPServer(): Promise<void> {
    await this.shell.execute({
      command: 'sudo apt install -y isc-dhcp-server'
    });
  }

  async configureDHCP(networkConfig: {
    subnet: string;
    netmask: string;
    rangeStart: string;
    rangeEnd: string;
    router: string;
    dns: string[];
  }): Promise<void> {
    const config = `
subnet ${networkConfig.subnet} netmask ${networkConfig.netmask} {
  range ${networkConfig.rangeStart} ${networkConfig.rangeEnd};
  option routers ${networkConfig.router};
  option domain-name-servers ${networkConfig.dns.join(', ')};
  option domain-name "local.lan";
  default-lease-time 600;
  max-lease-time 7200;
}
    `.trim();

    await this.shell.execute({
      command: `echo '${config}' | sudo tee /etc/dhcp/dhcpd.conf`
    });
  }

  async configureInterface(interfaceName: string): Promise<void> {
    await this.shell.execute({
      command: `echo "INTERFACESv4=\"${interfaceName}\"" | sudo tee /etc/default/isc-dhcp-server`
    });
  }

  async enableService(): Promise<void> {
    await this.shell.execute({ command: 'sudo systemctl restart isc-dhcp-server' });
    await this.shell.execute({ command: 'sudo systemctl enable isc-dhcp-server' });
  }

  async addStaticReservation(
    hostname: string, 
    macAddress: string, 
    ipAddress: string
  ): Promise<void> {
    const reservation = `
host ${hostname} {
  hardware ethernet ${macAddress};
  fixed-address ${ipAddress};
}
    `.trim();

    await this.shell.execute({
      command: `echo '${reservation}' | sudo tee -a /etc/dhcp/dhcpd.conf`
    });
    
    await this.shell.execute({ command: 'sudo systemctl restart isc-dhcp-server' });
  }
}

// Usage
const dhcpServer = new DHCPServerAutomation(shell);
await dhcpServer.installDHCPServer();
await dhcpServer.configureDHCP({
  subnet: '192.168.1.0',
  netmask: '255.255.255.0',
  rangeStart: '192.168.1.100',
  rangeEnd: '192.168.1.200',
  router: '192.168.1.1',
  dns: ['8.8.8.8', '8.8.4.4']
});
await dhcpServer.configureInterface('eth0');
await dhcpServer.enableService();
```

---

## 🖥️ 3. Web Server Implementation

### **Apache/Nginx with SSL/TLS**

```typescript
export class WebServerAutomation {
  constructor(private shell: ShellExecutionTool) {}

  async installNginx(): Promise<void> {
    await this.shell.execute({
      command: 'sudo apt update && sudo apt install -y nginx'
    });
  }

  async configureNginx(siteConfig: {
    domain: string;
    rootPath: string;
    port: number;
    ssl: boolean;
  }): Promise<void> {
    const config = `
server {
    listen ${siteConfig.port};
    server_name ${siteConfig.domain};
    root ${siteConfig.rootPath};
    index index.html index.htm;

    location / {
        try_files $uri $uri/ =404;
    }

    location /phpmyadmin {
        root /usr/share/;
        index index.php index.html index.htm;
        location ~ \\.php$ {
            include snippets/fastcgi-php.conf;
            fastcgi_pass unix:/var/run/php/php7.4-fpm.sock;
        }
    }

    access_log /var/log/nginx/${siteConfig.domain}.access.log;
    error_log /var/log/nginx/${siteConfig.domain}.error.log;
}
    `.trim();

    await this.shell.execute({
      command: `echo '${config}' | sudo tee /etc/nginx/sites-available/${siteConfig.domain}`
    });
    
    await this.shell.execute({
      command: `sudo ln -sf /etc/nginx/sites-available/${siteConfig.domain} /etc/nginx/sites-enabled/`
    });
  }

  async setupSSL(domain: string): Promise<void> {
    // Install Certbot
    await this.shell.execute({
      command: 'sudo apt install -y certbot python3-certbot-nginx'
    });
    
    // Get SSL certificate
    await this.shell.execute({
      command: `sudo certbot --nginx -d ${domain} --non-interactive --agree-tos --email admin@${domain}`
    });
    
    // Setup auto-renewal
    await this.shell.execute({
      command: 'echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -'
    });
  }

  async enableService(): Promise<void> {
    await this.shell.execute({ command: 'sudo ufw allow \'Nginx Full\'' });
    await this.shell.execute({ command: 'sudo systemctl restart nginx' });
    await this.shell.execute({ command: 'sudo systemctl enable nginx' });
  }

  async setupBasicAuth(username: string, password: string, protectedPath: string): Promise<void> {
    await this.shell.execute({
      command: `echo "${username}:$(openssl passwd -apr1 ${password})" | sudo tee /etc/nginx/.htpasswd`
    });
    
    await this.shell.execute({
      command: `sudo sed -i "/location ${protectedPath}/,/}/ s/}/    auth_basic "Restricted";\\n    auth_basic_user_file /etc/nginx/.htpasswd;\\n}/" /etc/nginx/sites-available/default`
    });
  }
}

// Usage
const webServer = new WebServerAutomation(shell);
await webServer.installNginx();
await webServer.configureNginx({
  domain: 'example.com',
  rootPath: '/var/www/example.com',
  port: 80,
  ssl: false
});
await webServer.setupSSL('example.com');
await webServer.enableService();
```

---

## 🔍 4. DNS Server Implementation

### **BIND9 DNS Server**

```typescript
export class DNSServerAutomation {
  constructor(private shell: ShellExecutionTool) {}

  async installBIND(): Promise<void> {
    await this.shell.execute({
      command: 'sudo apt install -y bind9 bind9utils bind9-doc'
    });
  }

  async configureForwardZone(domain: string, records: Array<{
    name: string;
    type: 'A' | 'CNAME' | 'MX' | 'TXT';
    value: string;
    priority?: number;
  }>): Promise<void> {
    let zoneConfig = `
$TTL    86400
@       IN      SOA     ns1.${domain}. admin.${domain}. (
                        2024120101     ; Serial
                        3600           ; Refresh
                        1800           ; Retry
                        604800         ; Expire
                        86400 )        ; Minimum TTL

@       IN      NS      ns1.${domain}.
@       IN      A       192.168.1.10
ns1     IN      A       192.168.1.10
    `.trim();

    records.forEach(record => {
      if (record.type === 'MX' && record.priority) {
        zoneConfig += `\n${record.name}    IN      ${record.type}    ${record.priority} ${record.value}`;
      } else {
        zoneConfig += `\n${record.name}    IN      ${record.type}    ${record.value}`;
      }
    });

    await this.shell.execute({
      command: `echo '${zoneConfig}' | sudo tee /etc/bind/db.${domain}`
    });
  }

  async configureReverseZone(network: string, records: Array<{
    ip: string;
    hostname: string;
  }>): Promise<void> {
    const zoneConfig = `
$TTL    86400
@       IN      SOA     ns1.${network}. admin.${network}. (
                        2024120101     ; Serial
                        3600           ; Refresh
                        1800           ; Retry
                        604800         ; Expire
                        86400 )        ; Minimum TTL

@       IN      NS      ns1.${network}.
    `.trim();

    records.forEach(record => {
      const lastOctet = record.ip.split('.').pop();
      zoneConfig += `\n${lastOctet}    IN      PTR    ${record.hostname}.`;
    });

    await this.shell.execute({
      command: `echo '${zoneConfig}' | sudo tee /etc/bind/db.${network.replace(/\./g, '-')}`
    });
  }

  async updateBINDConfig(domain: string, network: string): Promise<void> {
    const config = `
zone "${domain}" {
    type master;
    file "/etc/bind/db.${domain}";
    allow-update { none; };
};

zone "${network}.in-addr.arpa" {
    type master;
    file "/etc/bind/db.${network.replace(/\./g, '-')}";
    allow-update { none; };
};
    `.trim();

    await this.shell.execute({
      command: `echo '${config}' | sudo tee /etc/bind/named.conf.local`
    });
  }

  async enableService(): Promise<void> {
    await this.shell.execute({ command: 'sudo rndc reload' });
    await this.shell.execute({ command: 'sudo systemctl restart bind9' });
    await this.shell.execute({ command: 'sudo systemctl enable bind9' });
  }

  async testDNS(domain: string): Promise<void> {
    await this.shell.execute({ command: `dig @localhost ${domain}` });
    await this.shell.execute({ command: `dig -x 192.168.1.10` });
  }
}

// Usage
const dnsServer = new DNSServerAutomation(shell);
await dnsServer.installBIND();
await dnsServer.configureForwardZone('example.com', [
  { name: 'www', type: 'A', value: '192.168.1.20' },
  { name: 'mail', type: 'A', value: '192.168.1.30' },
  { name: '@', type: 'MX', value: 'mail.example.com', priority: 10 }
]);
await dnsServer.configureReverseZone('1.168.192', [
  { ip: '192.168.1.10', hostname: 'ns1.example.com' },
  { ip: '192.168.1.20', hostname: 'www.example.com' }
]);
await dnsServer.updateBINDConfig('example.com', '1.168.192');
await dnsServer.enableService();
```

---

## 🖨️ 5. Print Server Implementation

### **CUPS Print Server**

```typescript
export class PrintServerAutomation {
  constructor(private shell: ShellExecutionTool) {}

  async installCUPS(): Promise<void> {
    await this.shell.execute({
      command: 'sudo apt update && sudo apt install -y cups cups-pdf printer-driver-gutenprint'
    });
  }

  async configureCUPS(): Promise<void> {
    // Allow remote access
    await this.shell.execute({
      command: 'sudo cupsctl --remote-admin --remote-any --share-printers'
    });
    
    // Add user to lpadmin group
    await this.shell.execute({
      command: 'sudo usermod -a -G lpadmin $USER'
    });
  }

  async addPrinter(printerName: string, deviceUri: string, driver: string): Promise<void> {
    await this.shell.execute({
      command: `lpadmin -p ${printerName} -v ${deviceUri} -m ${driver} -E`
    });
  }

  async setupPrinterPermissions(username: string): Promise<void> {
    await this.shell.execute({
      command: `sudo usermod -a -G lpadmin ${username}`
    });
  }

  async enableService(): Promise<void> {
    await this.shell.execute({ command: 'sudo systemctl restart cups' });
    await this.shell.execute({ command: 'sudo systemctl enable cups' });
    await this.shell.execute({ command: 'sudo ufw allow 631' });
  }

  async listPrinters(): Promise<void> {
    await this.shell.execute({ command: 'lpstat -p' });
  }

  async printTestPage(printerName: string): Promise<void> {
    await this.shell.execute({
      command: `echo "Test Page" | lp -d ${printerName} -o landscape`
    });
  }
}

// Usage
const printServer = new PrintServerAutomation(shell);
await printServer.installCUPS();
await printServer.configureCUPS();
await printServer.addPrinter('HP_LaserJet', 'usb://HP/LaserJet?serial=123456', 'drv:///sample.drv/generic.ppd');
await printServer.enableService();
```

---

## 📁 6. NFS Server Implementation

### **Network File System**

```typescript
export class NFSServerAutomation {
  constructor(private shell: ShellExecutionTool) {}

  async installNFSServer(): Promise<void> {
    await this.shell.execute({
      command: 'sudo apt update && sudo apt install -y nfs-kernel-server nfs-common'
    });
  }

  async createSharedDirectory(path: string, permissions: string = '777'): Promise<void> {
    await this.shell.execute({ command: `sudo mkdir -p ${path}` });
    await this.shell.execute({ command: `sudo chmod ${permissions} ${path}` });
    await this.shell.execute({ command: `sudo chown nobody:nogroup ${path}` });
  }

  async configureExports(shareConfig: Array<{
    path: string;
    network: string;
    options: string;
  }>): Promise<void> {
    let exportsConfig = '';
    shareConfig.forEach(share => {
      exportsConfig += `${share.path} ${share.network}(${share.options})\n`;
    });

    await this.shell.execute({
      command: `echo '${exportsConfig.trim()}' | sudo tee /etc/exports`
    });
  }

  async enableService(): Promise<void> {
    await this.shell.execute({ command: 'sudo exportfs -a' });
    await this.shell.execute({ command: 'sudo systemctl restart nfs-kernel-server' });
    await this.shell.execute({ command: 'sudo systemctl enable nfs-kernel-server' });
    await this.shell.execute({ command: 'sudo ufw allow nfs' });
  }

  async mountNFSClient(serverIP: string, remotePath: string, localPath: string): Promise<void> {
    await this.shell.execute({ command: `sudo mkdir -p ${localPath}` });
    await this.shell.execute({
      command: `sudo mount -t nfs ${serverIP}:${remotePath} ${localPath}`
    });
    
    // Add to fstab for persistent mounting
    await this.shell.execute({
      command: `echo "${serverIP}:${remotePath} ${localPath} nfs defaults 0 0" | sudo tee -a /etc/fstab`
    });
  }
}

// Usage
const nfsServer = new NFSServerAutomation(shell);
await nfsServer.installNFSServer();
await nfsServer.createSharedDirectory('/srv/nfs/shared');
await nfsServer.configureExports([
  {
    path: '/srv/nfs/shared',
    network: '192.168.1.0/24',
    options: 'rw,sync,no_subtree_check'
  }
]);
await nfsServer.enableService();
```

---

## 🤝 7. Samba Server Implementation

### **Windows/Linux File Sharing**

```typescript
export class SambaServerAutomation {
  constructor(private shell: ShellExecutionTool) {}

  async installSamba(): Promise<void> {
    await this.shell.execute({
      command: 'sudo apt update && sudo apt install -y samba samba-common-bin'
    });
  }

  async createSambaUser(username: string, password: string): Promise<void> {
    await this.shell.execute({
      command: `sudo useradd -M -s /usr/sbin/nologin ${username}`
    });
    
    await this.shell.execute({
      command: `(echo "${password}"; echo "${password}") | sudo smbpasswd -a ${username}`
    });
  }

  async configureSamba(globalConfig: {
    workgroup: string;
    serverString: string;
    security: 'user' | 'share' | 'domain';
  }): Promise<void> {
    const config = `
[global]
   workgroup = ${globalConfig.workgroup}
   server string = ${globalConfig.serverString}
   security = ${globalConfig.security}
   map to guest = Bad User
   dns proxy = no

# Authentication
   obey pam restrictions = yes
   pam password change = yes
   unix password sync = yes
   passwd program = /usr/bin/passwd %u
   passwd chat = *Enter\\snew\\s*\\spassword:* %n\\n *Retype\\snew\\s*\\spassword:* %n\\n *password\\supdated\\ssuccessfully* .
   pam password change = yes

# Logging
   log file = /var/log/samba/log.%m
   max log size = 1000
   log level = 1

# Performance
   socket options = TCP_NODELAY IPTOS_LOWDELAY SO_RCVBUF=65536 SO_SNDBUF=65536
    `.trim();

    await this.shell.execute({
      command: `echo '${config}' | sudo tee /etc/samba/smb.conf`
    });
  }

  async addShare(shareConfig: {
    name: string;
    path: string;
    comment: string;
    browsable: boolean;
    writable: boolean;
    guest: boolean;
    validUsers?: string;
  }): Promise<void> {
    const config = `
[${shareConfig.name}]
   comment = ${shareConfig.comment}
   path = ${shareConfig.path}
   browsable = ${shareConfig.browsable ? 'yes' : 'no'}
   writable = ${shareConfig.writable ? 'yes' : 'no'}
   guest ok = ${shareConfig.guest ? 'yes' : 'no'}
   read only = ${shareConfig.writable ? 'no' : 'yes'}
   create mask = 0775
   directory mask = 0775
    `.trim();

    if (shareConfig.validUsers) {
      config += `\n   valid users = ${shareConfig.validUsers}`;
    }

    await this.shell.execute({
      command: `echo '${config}' | sudo tee -a /etc/samba/smb.conf`
    });
  }

  async enableService(): Promise<void> {
    await this.shell.execute({ command: 'sudo systemctl restart smbd nmbd' });
    await this.shell.execute({ command: 'sudo systemctl enable smbd nmbd' });
    await this.shell.execute({ command: 'sudo ufw allow samba' });
  }

  async testConfig(): Promise<void> {
    await this.shell.execute({ command: 'testparm -s' });
  }
}

// Usage
const sambaServer = new SambaServerAutomation(shell);
await sambaServer.installSamba();
await sambaServer.configureSamba({
  workgroup: 'WORKGROUP',
  serverString: 'Operone Samba Server',
  security: 'user'
});
await sambaServer.createSambaUser('sambauser', 'password123');
await sambaServer.addShare({
  name: 'shared',
  path: '/srv/samba/shared',
  comment: 'Shared Files',
  browsable: true,
  writable: true,
  guest: false,
  validUsers: 'sambauser'
});
await sambaServer.enableService();
```

---

## 🔐 8. Proxy Server Implementation

### **Squid Proxy Server**

```typescript
export class ProxyServerAutomation {
  constructor(private shell: ShellExecutionTool) {}

  async installSquid(): Promise<void> {
    await this.shell.execute({
      command: 'sudo apt update && sudo apt install -y squid'
    });
  }

  async configureSquid(config: {
    httpPort: number;
    cacheSize: string;
    cacheDir: string;
    allowedNetworks: string[];
    blockedSites?: string[];
  }): Promise<void> {
    let squidConfig = `
# Port Configuration
http_port ${config.httpPort}

# Cache Configuration
cache_dir ufs ${config.cacheDir} ${config.cacheSize} 16 256
cache_mem 256 MB
maximum_object_size 4 MB
cache_swap_low 90
cache_swap_high 95

# Access Lists
acl localnet src ${config.allowedNetworks.join(' ')}
acl SSL_ports port 443
acl Safe_ports port 80          # http
acl Safe_ports port 21          # ftp
acl Safe_ports port 443         # https
acl Safe_ports port 70          # gopher
acl Safe_ports port 210         # wais
acl Safe_ports port 1025-65535  # unregistered ports
acl Safe_ports port 280         # http-mgmt
acl Safe_ports port 488         # gss-http
acl Safe_ports port 591         # filemaker
acl Safe_ports port 777         # multiling http

# Access Rules
http_access deny !Safe_ports
http_access deny CONNECT !SSL_ports
http_access allow localnet
http_access deny all

# Logging
access_log /var/log/squid/access.log squid
cache_log /var/log/squid/cache.log
    `.trim();

    // Add blocked sites if provided
    if (config.blockedSites && config.blockedSites.length > 0) {
      squidConfig += `\n\n# Blocked Sites\nacl blocked_sites dstdomain ${config.blockedSites.join(' ')}\nhttp_access deny blocked_sites`;
    }

    await this.shell.execute({
      command: `echo '${squidConfig}' | sudo tee /etc/squid/squid.conf`
    });
  }

  async createCacheDir(cacheDir: string): Promise<void> {
    await this.shell.execute({ command: `sudo mkdir -p ${cacheDir}` });
    await this.shell.execute({ command: `sudo chown proxy:proxy ${cacheDir}` });
    await this.shell.execute({ command: `sudo chmod 750 ${cacheDir}` });
  }

  async enableService(): Promise<void> {
    await this.shell.execute({ command: 'sudo squid -z' }); // Initialize cache
    await this.shell.execute({ command: 'sudo systemctl restart squid' });
    await this.shell.execute({ command: 'sudo systemctl enable squid' });
    await this.shell.execute({ command: `sudo ufw allow ${config.httpPort}` });
  }

  async addAuthentication(authMethod: 'basic' | 'digest', authFile: string): Promise<void> {
    if (authMethod === 'basic') {
      await this.shell.execute({
        command: `echo "auth_param basic program /usr/lib/squid/basic_ncsa_auth ${authFile}" | sudo tee -a /etc/squid/squid.conf`
      });
      
      await this.shell.execute({
        command: 'echo "auth_param basic children 5" | sudo tee -a /etc/squid/squid.conf'
      });
      
      await this.shell.execute({
        command: 'echo "auth_param basic realm Squid proxy-caching web server" | sudo tee -a /etc/squid/squid.conf'
      });
      
      await this.shell.execute({
        command: 'echo "auth_param basic credentialsttl 2 hours" | sudo tee -a /etc/squid/squid.conf'
      });
      
      await this.shell.execute({
        command: 'echo "acl authenticated proxy_auth REQUIRED" | sudo tee -a /etc/squid/squid.conf'
      });
      
      await this.shell.execute({
        command: 'echo "http_access allow authenticated" | sudo tee -a /etc/squid/squid.conf'
      });
    }
  }
}

// Usage
const proxyServer = new ProxyServerAutomation(shell);
await proxyServer.installSquid();
await proxyServer.createCacheDir('/var/spool/squid');
await proxyServer.configureSquid({
  httpPort: 3128,
  cacheSize: '10000',
  cacheDir: '/var/spool/squid',
  allowedNetworks: ['192.168.1.0/24', '10.0.0.0/8'],
  blockedSites: ['facebook.com', 'twitter.com', 'youtube.com']
});
await proxyServer.enableService();
```

---

## 🔧 9. Shell Scripting Automation

### **System Administration Scripts**

```typescript
export class ShellScriptAutomation {
  constructor(private shell: ShellExecutionTool) {}

  async createMonitoringScript(): Promise<void> {
    const script = `#!/bin/bash

# System Monitoring Script
LOG_FILE="/var/log/system-monitor.log"
DATE=\$(date '+%Y-%m-%d %H:%M:%S')

# CPU Usage
CPU_USAGE=\$(top -bn1 | grep "Cpu(s)" | awk '{print \$2}' | cut -d'%' -f1)

# Memory Usage
MEM_USAGE=\$(free | grep Mem | awk '{printf("%.2f", \$3/\$2 * 100.0)}')

# Disk Usage
DISK_USAGE=\$(df -h / | awk 'NR==2 {print \$5}' | cut -d'%' -f1)

# Network Connections
NET_CONNECTIONS=\$(netstat -an | grep ESTABLISHED | wc -l)

# Log results
echo "\$DATE - CPU: \$CPU_USAGE%, MEM: \$MEM_USAGE%, DISK: \$DISK_USAGE%, Connections: \$NET_CONNECTIONS" >> \$LOG_FILE

# Alert if thresholds exceeded
if (( \$(echo "\$CPU_USAGE > 80" | bc -l) )); then
    echo "ALERT: High CPU usage: \$CPU_USAGE%" | logger -t system-monitor
fi

if (( \$(echo "\$MEM_USAGE > 90" | bc -l) )); then
    echo "ALERT: High memory usage: \$MEM_USAGE%" | logger -t system-monitor
fi

if [ "\$DISK_USAGE" -gt 85 ]; then
    echo "ALERT: High disk usage: \$DISK_USAGE%" | logger -t system-monitor
fi
    `.trim();

    await this.shell.execute({
      command: `echo '${script}' | sudo tee /usr/local/bin/system-monitor.sh`
    });
    
    await this.shell.execute({ command: 'sudo chmod +x /usr/local/bin/system-monitor.sh' });
  }

  async createBackupScript(backupConfig: {
    sourcePaths: string[];
    backupDir: string;
    retentionDays: number;
  }): Promise<void> {
    const script = `#!/bin/bash

# Backup Script
BACKUP_DIR="${backupConfig.backupDir}"
RETENTION_DAYS=${backupConfig.retentionDays}
DATE=\$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_\$DATE.tar.gz"

# Create backup directory
mkdir -p \$BACKUP_DIR

# Create backup
tar -czf "\$BACKUP_DIR/\$BACKUP_FILE" ${backupConfig.sourcePaths.join(' ')}

# Remove old backups
find \$BACKUP_DIR -name "backup_*.tar.gz" -mtime +\$RETENTION_DAYS -delete

# Log backup
echo "\$(date): Created backup \$BACKUP_FILE" >> \$BACKUP_DIR/backup.log
    `.trim();

    await this.shell.execute({
      command: `echo '${script}' | sudo tee /usr/local/bin/backup.sh`
    });
    
    await this.shell.execute({ command: 'sudo chmod +x /usr/local/bin/backup.sh' });
  }

  async createUserManagementScript(): Promise<void> {
    const script = `#!/bin/bash

# User Management Script
ACTION=\$1
USERNAME=\$2

case \$ACTION in
    "add")
        if [ -z "\$USERNAME" ]; then
            echo "Usage: \$0 add <username>"
            exit 1
        fi
        
        # Add user with home directory
        useradd -m -s /bin/bash \$USERNAME
        
        # Set random password
        PASSWORD=\$(openssl rand -base64 12)
        echo "\$USERNAME:\$PASSWORD" | chpasswd
        
        echo "User \$USERNAME created with password: \$PASSWORD"
        echo "\$USERNAME:\$PASSWORD" >> /tmp/user_passwords.log
        ;;
        
    "delete")
        if [ -z "\$USERNAME" ]; then
            echo "Usage: \$0 delete <username>"
            exit 1
        fi
        
        # Delete user and home directory
        userdel -r \$USERNAME
        echo "User \$USERNAME deleted"
        ;;
        
    "list")
        echo "Current users:"
        awk -F: '(\$3 >= 1000) && (\$1 != "nobody") { print \$1 }' /etc/passwd
        ;;
        
    *)
        echo "Usage: \$0 {add|delete|list} [username]"
        exit 1
        ;;
esac
    `.trim();

    await this.shell.execute({
      command: `echo '${script}' | sudo tee /usr/local/bin/user-manager.sh`
    });
    
    await this.shell.execute({ command: 'sudo chmod +x /usr/local/bin/user-manager.sh' });
  }

  async setupCronJobs(): Promise<void> {
    // Add monitoring cron job (every 5 minutes)
    await this.shell.execute({
      command: 'echo "*/5 * * * * /usr/local/bin/system-monitor.sh" | sudo crontab -'
    });
    
    // Add backup cron job (daily at 2 AM)
    await this.shell.execute({
      command: 'echo "0 2 * * * /usr/local/bin/backup.sh" | sudo crontab -'
    });
  }
}

// Usage
const scriptAutomation = new ShellScriptAutomation(shell);
await scriptAutomation.createMonitoringScript();
await scriptAutomation.createBackupScript({
  sourcePaths: ['/home', '/etc', '/var/www'],
  backupDir: '/backup',
  retentionDays: 7
});
await scriptAutomation.createUserManagementScript();
await scriptAutomation.setupCronJobs();
```

---

## 🛡️ 10. OS Security Implementation

### **Security Hardening & Access Control**

```typescript
export class SecurityAutomation {
  constructor(private shell: ShellExecutionTool) {}

  async setupFirewall(): Promise<void> {
    // Configure UFW firewall
    await this.shell.execute({ command: 'sudo ufw --force reset' });
    await this.shell.execute({ command: 'sudo ufw default deny incoming' });
    await this.shell.execute({ command: 'sudo ufw default allow outgoing' });
    
    // Allow essential services
    await this.shell.execute({ command: 'sudo ufw allow ssh' });
    await this.shell.execute({ command: 'sudo ufw allow 80/tcp' });
    await this.shell.execute({ command: 'sudo ufw allow 443/tcp' });
    
    await this.shell.execute({ command: 'sudo ufw --force enable' });
  }

  async setupFail2Ban(): Promise<void> {
    await this.shell.execute({
      command: 'sudo apt install -y fail2ban'
    });
    
    // Configure fail2ban
    const config = `
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
logpath = /var/log/nginx/error.log
maxretry = 3
    `.trim();

    await this.shell.execute({
      command: `echo '${config}' | sudo tee /etc/fail2ban/jail.local`
    });
    
    await this.shell.execute({ command: 'sudo systemctl restart fail2ban' });
    await this.shell.execute({ command: 'sudo systemctl enable fail2ban' });
  }

  async setupEncryption(homeDir: string): Promise<void> {
    // Install ecryptfs-utils
    await this.shell.execute({
      command: 'sudo apt install -y ecryptfs-utils'
    });
    
    // Setup encrypted home directory
    await this.shell.execute({
      command: `sudo ecryptfs-setup-private --force`
    });
  }

  async setupSELinux(): Promise<void> {
    await this.shell.execute({
      command: 'sudo apt install -y selinux-utils policycoreutils'
    });
    
    await this.shell.execute({
      command: 'echo "SELINUX=enforcing" | sudo tee /etc/selinux/config'
    });
    
    await this.shell.execute({
      command: 'sudo setenforce 1'
    });
  }

  async setupIntrusionDetection(): Promise<void> {
    // Install AIDE (Advanced Intrusion Detection Environment)
    await this.shell.execute({
      command: 'sudo apt install -y aide'
    });
    
    // Initialize AIDE database
    await this.shell.execute({ command: 'sudo aide --init' });
    await this.shell.execute({
      command: 'sudo mv /var/lib/aide/aide.db.new /var/lib/aide/aide.db'
    });
    
    // Setup daily AIDE check
    await this.shell.execute({
      command: 'echo "0 5 * * * /usr/bin/aide --check" | sudo crontab -'
    });
  }

  async setupLogMonitoring(): Promise<void> {
    // Install logwatch
    await this.shell.execute({
      command: 'sudo apt install -y logwatch'
    });
    
    // Configure logwatch
    await this.shell.execute({
      command: 'echo "Range = yesterday" | sudo tee -a /etc/logwatch/conf/logwatch.conf'
    });
    
    await this.shell.execute({
      command: 'echo "Detail = High" | sudo tee -a /etc/logwatch/conf/logwatch.conf'
    });
    
    // Setup daily email reports
    await this.shell.execute({
      command: 'echo "MailTo = admin@example.com" | sudo tee -a /etc/logwatch/conf/logwatch.conf'
    });
  }
}

// Usage
const securityAutomation = new SecurityAutomation(shell);
await securityAutomation.setupFirewall();
await securityAutomation.setupFail2Ban();
await securityAutomation.setupIntrusionDetection();
await securityAutomation.setupLogMonitoring();
```

---

## 💻 11. Shell/CLI Development

### **Custom Command-Line Interface**

```typescript
export class CLIDevelopmentAutomation {
  constructor(private shell: ShellExecutionTool) {}

  async createPythonCLI(cliName: string): Promise<void> {
    const script = `#!/usr/bin/env python3

import argparse
import os
import subprocess
import json
from pathlib import Path

class ${cliName.charAt(0).toUpperCase() + cliName.slice(1)}CLI:
    def __init__(self):
        self.parser = argparse.ArgumentParser(description='${cliName} - System Management CLI')
        self.subparsers = self.parser.add_subparsers(dest='command', help='Available commands')
        
        # Setup subcommands
        self.setup_commands()
    
    def setup_commands(self):
        # File operations
        file_parser = self.subparsers.add_parser('file', help='File operations')
        file_subparsers = file_parser.add_subparsers(dest='file_action')
        
        # List files
        list_parser = file_subparsers.add_parser('list', help='List files')
        list_parser.add_argument('path', nargs='?', default='.', help='Directory path')
        
        # Copy file
        copy_parser = file_subparsers.add_parser('copy', help='Copy file')
        copy_parser.add_argument('source', help='Source file')
        copy_parser.add_argument('destination', help='Destination file')
        
        # System operations
        system_parser = self.subparsers.add_parser('system', help='System operations')
        system_subparsers = system_parser.add_subparsers(dest='system_action')
        
        # System info
        info_parser = system_subparsers.add_parser('info', help='System information')
        
        # Process management
        process_parser = system_subparsers.add_parser('process', help='Process management')
        process_parser.add_argument('action', choices=['list', 'kill', 'restart'])
        process_parser.add_argument('--pid', help='Process ID')
        process_parser.add_argument('--name', help='Process name')
        
        # Network operations
        network_parser = self.subparsers.add_parser('network', help='Network operations')
        network_subparsers = network_parser.add_subparsers(dest='network_action')
        
        # Network status
        status_parser = network_subparsers.add_parser('status', help='Network status')
        
        # Port scan
        scan_parser = network_subparsers.add_parser('scan', help='Port scan')
        scan_parser.add_argument('host', help='Target host')
        scan_parser.add_argument('--ports', default='1-1000', help='Port range')
    
    def handle_file_list(self, path):
        try:
            files = os.listdir(path)
            for f in sorted(files):
                file_path = os.path.join(path, f)
                if os.path.isdir(file_path):
                    print(f"📁 {f}/")
                else:
                    size = os.path.getsize(file_path)
                    print(f"📄 {f} ({size} bytes)")
        except Exception as e:
            print(f"Error: {e}")
    
    def handle_file_copy(self, source, destination):
        try:
            import shutil
            shutil.copy2(source, destination)
            print(f"Copied {source} to {destination}")
        except Exception as e:
            print(f"Error: {e}")
    
    def handle_system_info(self):
        try:
            # System information
            print("=== System Information ===")
            
            # OS info
            with open('/etc/os-release') as f:
                for line in f:
                    if line.startswith('PRETTY_NAME'):
                        print(f"OS: {line.split('=')[1].strip().replace('"', '')}")
                        break
            
            # CPU info
            cpu_info = subprocess.check_output(['lscpu'], text=True)
            for line in cpu_info.split('\\n'):
                if 'Model name' in line:
                    print(f"CPU: {line.split(':')[1].strip()}")
                    break
            
            # Memory info
            with open('/proc/meminfo') as f:
                for line in f:
                    if line.startswith('MemTotal'):
                        mem_kb = int(line.split()[1])
                        mem_gb = mem_kb / (1024 * 1024)
                        print(f"Memory: {mem_gb:.1f} GB")
                        break
            
            # Disk usage
            disk_usage = subprocess.check_output(['df', '-h', '/'], text=True)
            lines = disk_usage.split('\\n')
            if len(lines) > 1:
                print(f"Disk: {lines[1].split()[4]} used")
            
        except Exception as e:
            print(f"Error: {e}")
    
    def handle_process_list(self):
        try:
            output = subprocess.check_output(['ps', 'aux'], text=True)
            lines = output.split('\\n')
            print(lines[0])  # Header
            for line in lines[1:11]:  # First 10 processes
                print(line)
        except Exception as e:
            print(f"Error: {e}")
    
    def handle_network_status(self):
        try:
            # Network interfaces
            interfaces = subprocess.check_output(['ip', 'addr'], text=True)
            print("=== Network Interfaces ===")
            for line in interfaces.split('\\n'):
                if 'inet ' in line and '127.0.0.1' not in line:
                    print(line.strip())
            
            # Active connections
            connections = subprocess.check_output(['netstat', '-an'], text=True)
            print("\\n=== Active Connections ===")
            tcp_count = connections.count('TCP')
            udp_count = connections.count('UDP')
            print(f"TCP connections: {tcp_count}")
            print(f"UDP connections: {udp_count}")
            
        except Exception as e:
            print(f"Error: {e}")
    
    def run(self):
        args = self.parser.parse_args()
        
        if args.command == 'file':
            if args.file_action == 'list':
                self.handle_file_list(args.path)
            elif args.file_action == 'copy':
                self.handle_file_copy(args.source, args.destination)
        
        elif args.command == 'system':
            if args.system_action == 'info':
                self.handle_system_info()
            elif args.system_action == 'process':
                if args.action == 'list':
                    self.handle_process_list()
                elif args.action == 'kill' and args.pid:
                    subprocess.run(['kill', args.pid])
                    print(f"Killed process {args.pid}")
        
        elif args.command == 'network':
            if args.network_action == 'status':
                self.handle_network_status()
        
        else:
            self.parser.print_help()

if __name__ == '__main__':
    cli = ${cliName.charAt(0).toUpperCase() + cliName.slice(1)}CLI()
    cli.run()
    `.trim();

    await this.shell.execute({
      command: `echo '${script}' | sudo tee /usr/local/bin/${cliName}`
    });
    
    await this.shell.execute({ command: `sudo chmod +x /usr/local/bin/${cliName}` });
  }

  async createBashCLI(cliName: string): Promise<void> {
    const script = `#!/bin/bash

# ${cliName.toUpperCase()} - System Management CLI
VERSION="1.0.0"

# Colors
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
NC='\\033[0m' # No Color

# Print functions
print_info() {
    echo -e "\${BLUE}[INFO]\${NC} \$1"
}

print_success() {
    echo -e "\${GREEN}[SUCCESS]\${NC} \$1"
}

print_warning() {
    echo -e "\${YELLOW}[WARNING]\${NC} \$1"
}

print_error() {
    echo -e "\${RED}[ERROR]\${NC} \$1"
}

# File operations
cmd_file_list() {
    local path="\${1:-.}"
    print_info "Listing files in: \$path"
    ls -la "\$path"
}

cmd_file_copy() {
    local source="\$1"
    local destination="\$2"
    
    if [ -z "\$source" ] || [ -z "\$destination" ]; then
        print_error "Usage: \${0} file copy <source> <destination>"
        return 1
    fi
    
    print_info "Copying \$source to \$destination"
    cp "\$source" "\$destination"
    print_success "File copied successfully"
}

cmd_file_search() {
    local pattern="\$1"
    local path="\${2:-.}"
    
    if [ -z "\$pattern" ]; then
        print_error "Usage: \${0} file search <pattern> [path]"
        return 1
    fi
    
    print_info "Searching for '\$pattern' in \$path"
    find "\$path" -name "*\$pattern*" -type f
}

# System operations
cmd_system_info() {
    print_info "System Information"
    echo "===================="
    echo "OS: \$(uname -s) \$(uname -r)"
    echo "Hostname: \$(hostname)"
    echo "Uptime: \$(uptime -p)"
    echo "Load Average: \$(uptime | awk -F'load average:' '{print \$2}')"
    echo ""
    echo "Memory Usage:"
    free -h
    echo ""
    echo "Disk Usage:"
    df -h
}

cmd_system_monitor() {
    print_info "System Monitor (Press Ctrl+C to exit)"
    watch -n 1 'echo "=== CPU & Memory ===" && top -bn1 | head -10 && echo "" && echo "=== Processes ===" && ps aux | head -10'
}

cmd_process_kill() {
    local pid="\$1"
    
    if [ -z "\$pid" ]; then
        print_error "Usage: \${0} process kill <pid>"
        return 1
    fi
    
    print_info "Killing process \$pid"
    kill "\$pid"
    print_success "Process killed"
}

# Network operations
cmd_network_status() {
    print_info "Network Status"
    echo "==============="
    echo "Interfaces:"
    ip addr show | grep -E "^[0-9]|inet " | sed 's/^[[:space:]]*/  /'
    echo ""
    echo "Active Connections:"
    netstat -an | grep ESTABLISHED | wc -l | xargs echo "Connections:"
}

cmd_network_test() {
    local host="\${1:-google.com}"
    print_info "Testing connection to \$host"
    ping -c 4 "\$host"
}

# Service operations
cmd_service_status() {
    local service="\$1"
    
    if [ -z "\$service" ]; then
        print_error "Usage: \${0} service status <service-name>"
        return 1
    fi
    
    print_info "Status of \$service:"
    systemctl status "\$service" --no-pager
}

cmd_service_restart() {
    local service="\$1"
    
    if [ -z "\$service" ]; then
        print_error "Usage: \${0} service restart <service-name>"
        return 1
    fi
    
    print_info "Restarting \$service"
    sudo systemctl restart "\$service"
    print_success "Service restarted"
}

# Help function
show_help() {
    cat << EOF
${cliName.toUpperCase()} v${VERSION} - System Management CLI

USAGE:
    ${cliName} <command> <subcommand> [options]

COMMANDS:
    file        File operations
        list <path>           List files in directory
        copy <src> <dest>      Copy file
        search <pattern>       Search for files
    
    system      System operations
        info                   Show system information
        monitor                Real-time system monitor
        process kill <pid>     Kill process by PID
    
    network     Network operations
        status                 Show network status
        test [host]            Test connectivity
    
    service     Service operations
        status <service>       Show service status
        restart <service>      Restart service
    
    help        Show this help message
    version     Show version information

EXAMPLES:
    ${cliName} file list /home
    ${cliName} file copy file.txt backup.txt
    ${cliName} system info
    ${cliName} network status
    ${cliName} service restart nginx

EOF
}

# Main command router
case "\${1:-help}" in
    "file")
        case "\${2:-help}" in
            "list")
                cmd_file_list "\${3}"
                ;;
            "copy")
                cmd_file_copy "\${3}" "\${4}"
                ;;
            "search")
                cmd_file_search "\${3}" "\${4}"
                ;;
            *)
                print_error "Unknown file subcommand: \${2}"
                show_help
                ;;
        esac
        ;;
    "system")
        case "\${2:-help}" in
            "info")
                cmd_system_info
                ;;
            "monitor")
                cmd_system_monitor
                ;;
            "process")
                if [ "\${3}" = "kill" ]; then
                    cmd_process_kill "\${4}"
                else
                    print_error "Unknown process subcommand: \${3}"
                fi
                ;;
            *)
                print_error "Unknown system subcommand: \${2}"
                show_help
                ;;
        esac
        ;;
    "network")
        case "\${2:-help}" in
            "status")
                cmd_network_status
                ;;
            "test")
                cmd_network_test "\${3}"
                ;;
            *)
                print_error "Unknown network subcommand: \${2}"
                show_help
                ;;
        esac
        ;;
    "service")
        case "\${2:-help}" in
            "status")
                cmd_service_status "\${3}"
                ;;
            "restart")
                cmd_service_restart "\${3}"
                ;;
            *)
                print_error "Unknown service subcommand: \${2}"
                show_help
                ;;
        esac
        ;;
    "version")
        echo "${cliName.toUpperCase()} v${VERSION}"
        ;;
    "help"|*)
        show_help
        ;;
esac
    `.trim();

    await this.shell.execute({
      command: `echo '${script}' | sudo tee /usr/local/bin/${cliName}`
    });
    
    await this.shell.execute({ command: `sudo chmod +x /usr/local/bin/${cliName}` });
  }
}

// Usage
const cliAutomation = new CLIDevelopmentAutomation(shell);
await cliAutomation.createPythonCLI('sysadmin');
await cliAutomation.createBashCLI('ops');
```

---

## 🚀 Distributed Implementation

### **Managing Multiple Servers Simultaneously**

```typescript
import { PeerNetwork } from '@operone/networking';
import { MCPBroker } from '@operone/mcp';

export class DistributedServiceManager {
  constructor(
    private network: PeerNetwork,
    private mcp: MCPBroker,
    private shell: ShellExecutionTool
  ) {}

  async deployMailServerToAllPeers(domain: string): Promise<void> {
    const peers = await this.network.getConnectedPeers();
    
    const deploymentPromises = peers.map(async (peer) => {
      try {
        // Execute mail server setup on remote peer
        await this.mcp.executeRemote(peer.id, 'shell', {
          command: 'sudo apt update && sudo apt install -y postfix dovecot-imapd'
        });
        
        await this.mcp.executeRemote(peer.id, 'shell', {
          command: `echo "myhostname = mail.${domain}" | sudo tee -a /etc/postfix/main.cf`
        });
        
        await this.mcp.executeRemote(peer.id, 'shell', {
          command: 'sudo systemctl restart postfix dovecot'
        });
        
        console.log(`✅ Mail server deployed to peer ${peer.id}`);
      } catch (error) {
        console.error(`❌ Failed to deploy mail server to peer ${peer.id}:`, error);
      }
    });
    
    await Promise.all(deploymentPromises);
  }

  async monitorAllServers(): Promise<void> {
    const peers = await this.network.getConnectedPeers();
    
    const monitoringPromises = peers.map(async (peer) => {
      try {
        const result = await this.mcp.executeRemote(peer.id, 'shell', {
          command: 'df -h | grep -vE "^Filesystem|tmpfs|cdrom" | awk \'{print $5 " " $1}\''
        });
        
        console.log(`📊 Peer ${peer.id} disk usage:`, result.stdout);
      } catch (error) {
        console.error(`❌ Failed to monitor peer ${peer.id}:`, error);
      }
    });
    
    await Promise.all(monitoringPromises);
  }
}

// Usage
const distributedManager = new DistributedServiceManager(network, mcp, shell);
await distributedManager.deployMailServerToAllPeers('example.com');
await distributedManager.monitorAllServers();
```

---

## 📚 Complete Usage Example

```typescript
import { BrowserAutomation, DesktopAutomation } from '@operone/automation';
import { ShellExecutionTool } from '@operone/shell';
import { PeerNetwork } from '@operone/networking';
import { MCPBroker } from '@operone/mcp';

// Initialize all services
const browser = new BrowserAutomation({ headless: false });
const desktop = new DesktopAutomation();
const shell = new ShellExecutionTool();
const network = new PeerNetwork({ port: 9876, enableTLS: true });
const mcp = new MCPBroker();

// Start distributed network
await network.start();
await mcp.start();

// Create service managers
const mailServer = new MailServerAutomation(shell);
const dhcpServer = new DHCPServerAutomation(shell);
const webServer = new WebServerAutomation(shell);
const dnsServer = new DNSServerAutomation(shell);
const printServer = new PrintServerAutomation(shell);
const nfsServer = new NFSServerAutomation(shell);
const sambaServer = new SambaServerAutomation(shell);
const proxyServer = new ProxyServerAutomation(shell);
const scriptAutomation = new ShellScriptAutomation(shell);
const securityAutomation = new SecurityAutomation(shell);
const cliAutomation = new CLIDevelopmentAutomation(shell);

// Deploy all services
async function deployCompleteInfrastructure() {
  console.log('🚀 Deploying complete OS infrastructure...');
  
  // Core services
  await mailServer.installPostfix();
  await dhcpServer.installDHCPServer();
  await webServer.installNginx();
  await dnsServer.installBIND();
  
  // File and print services
  await printServer.installCUPS();
  await nfsServer.installNFSServer();
  await sambaServer.installSamba();
  await proxyServer.installSquid();
  
  // Security and automation
  await securityAutomation.setupFirewall();
  await scriptAutomation.createMonitoringScript();
  await cliAutomation.createBashCLI('ops');
  
  console.log('✅ Infrastructure deployment complete!');
}

// Run deployment
deployCompleteInfrastructure().catch(console.error);
```

---

## 🎯 Key Benefits

### **✅ What You Get**
- **Complete OS Lab Coverage**: All 11 traditional services implemented
- **Distributed Management**: Configure multiple servers simultaneously
- **Automation-First**: Script everything, reduce manual errors
- **Cross-Platform**: Works on Linux, with adaptations for macOS/Windows
- **Security Built-In**: TLS encryption, authentication, access control
- **Monitoring Included**: Real-time status and alerting
- **Scalable Architecture**: Add services as needed

### **🔧 Advanced Features**
- **Browser Automation**: Configure web-based admin interfaces
- **Desktop Automation**: GUI-based server management
- **Shell Scripting**: Custom automation scripts
- **CLI Development**: Build custom management tools
- **Security Hardening**: Firewall, fail2ban, intrusion detection
- **Backup & Recovery**: Automated backup systems
- **Performance Monitoring**: System health tracking

---

## 📞 Support & Documentation

For more information:
- **Project Repository**: `/Users/ratulhasan/Desktop/Shoaib/operone`
- **Package Documentation**: Check individual package README files
- **API Reference**: TypeScript interfaces in `@repo/types`
- **Examples**: See `/packages/*/src/__tests__/` for usage examples

---

**🎉 Congratulations! You now have a complete automation framework for implementing all traditional OS lab services using the Operone library!**
