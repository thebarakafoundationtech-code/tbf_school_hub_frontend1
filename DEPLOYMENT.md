# Deployment Guide: Baraka School Hub

This guide walks you through deploying the application to your server using PM2.

---

## 1. Exporting from Google AI Studio

You can export the project in two ways:
1. **Export to GitHub**:
   - In the Google AI Studio top bar / settings menu (top right), click the **Export** or **GitHub** button.
   - Connect your GitHub account and push the project to a new or existing repository.
2. **Download ZIP**:
   - Click the settings / export menu in Google AI Studio and select **Download as ZIP**.
   - Unzip the files on your server.

---

## 2. Server Prerequisites

On your Ubuntu/Debian Linux VPS or dedicated server, ensure Node.js 20+ and PM2 are installed:

```bash
# Update package list
sudo apt update

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally
sudo npm install -g pm2
```

---

## 3. Clone & Setup Project

```bash
# Clone your repository
git clone <YOUR_GITHUB_REPO_URL>
cd <REPO_NAME>

# Install all dependencies
npm install

# Setup your environment variables
cp .env.example .env
nano .env   # Fill in your GEMINI_API_KEY, APP_URL, etc.
```

---

## 4. Build for Production

Compile the client bundle and backend server bundle:

```bash
npm run build
```

This generates:
- `dist/` containing the static frontend assets (`dist/index.html`, `dist/assets/*`).
- `dist/server.cjs`: the bundled self-contained Node.js Express server.

---

## 5. Launch with PM2

The repository includes a ready-to-use `ecosystem.config.cjs`:

```bash
# Start the application with PM2
pm2 start ecosystem.config.cjs

# Verify the app is running
pm2 status
pm2 logs baraka-school-hub

# Configure PM2 to automatically restart on server reboots
pm2 save
pm2 startup
```

Alternatively, you can run directly via:
```bash
pm2 start dist/server.cjs --name "baraka-school-hub" --env NODE_ENV=production
```

---

## 6. (Optional) Nginx Reverse Proxy Setup

To route standard port 80/443 (HTTP/HTTPS) traffic to port 3000:

```nginx
server {
    listen 80;
    server_name your-domain.edu.tz;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Then reload Nginx:
```bash
sudo systemctl reload nginx
```
