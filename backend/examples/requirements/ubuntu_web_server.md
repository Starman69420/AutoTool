# Ubuntu Web Server Setup

## Server Specifications
- Operating System: Ubuntu 22.04 LTS
- Memory: 4GB RAM minimum
- CPU: 2 cores minimum

## Software Requirements

### Web Server
1. Install and configure Nginx web server
2. Set up a basic website with a "Hello World" index page
3. Configure Nginx to listen on port 80

### Database
1. Install and configure MySQL 8.0
2. Create a database named 'webapp'
3. Create a database user 'webuser' with appropriate permissions

### Security Requirements
1. Configure UFW firewall to allow only HTTP (80), HTTPS (443), and SSH (22) traffic
2. Disable root SSH login
3. Configure SSH to use key-based authentication only (no password authentication)
4. Set up automatic security updates
5. Install and configure fail2ban to protect against brute force attacks

### Performance Optimizations
1. Configure Nginx with appropriate worker settings based on available CPU
2. Set up browser caching for static assets
3. Configure gzip compression for text-based resources
4. Set up logrotate for Nginx and MySQL logs

## Validation Steps
1. Nginx should be running and accessible on port 80
2. The web page should display "Hello World"
3. MySQL should be running and the 'webapp' database should be accessible by 'webuser'
4. SSH should reject root login attempts
5. UFW should be properly configured to allow only the specified ports