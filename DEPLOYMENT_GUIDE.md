# BARAKA FOUNDATION SCHOOL HUB - FRONTEND DEPLOYMENT GUIDE

This guide provides exact commands for deploying and running the **TBF School Hub Frontend** on your production server.

---

## 🖥️ Production Server Details

| Property | Value |
|---|---|
| **Server Host IP** | `169.58.198.162` |
| **SSH Port** | `2202` |
| **SSH User** | `developer` |
| **SSH Private Key** | `id_rsa_tbf_frontend_dev` |
| **GitHub Repository** | `https://github.com/thebarakafoundationtech-code/tbf_school_hub_frontend1.git` |
| **Ingress Port** | `3000` |
| **API Base URL** | `https://schubapi.thebarakafoundation.or.tz/api/v1` |

---

## 🚀 Step 1: Push Code to GitHub Repository

If pushing from your local terminal:
```bash
# 1. Add remote (if not already added)
git remote add origin https://github.com/thebarakafoundationtech-code/tbf_school_hub_frontend1.git

# 2. Set Git credentials
git config user.name "thebarakafoundationtech-code"
git config user.email "thebarakafoundationtech@gmail.com"

# 3. Push to main branch
git branch -M main
git push -u origin main
```
*(When prompted for password by GitHub, use your GitHub Personal Access Token with repo permissions)*.

---

## 🌐 Step 2: Connect to Your Production Server via SSH

From your local machine where your SSH private key (`id_rsa_tbf_frontend_dev`) is located:

```bash
ssh -i id_rsa_tbf_frontend_dev -p 2202 developer@169.58.198.162
```

---

## 🐳 Step 3: Server Setup & Running with Docker (First-Time Setup)

Once logged into your server terminal:

```bash
# 1. Clone the repository
git clone https://github.com/thebarakafoundationtech-code/tbf_school_hub_frontend1.git /var/www/tbf-school-hub-frontend
cd /var/www/tbf-school-hub-frontend

# 2. Copy and configure .env file
cp .env.example .env

# 3. Start the application using Docker Compose
docker compose up -d --build

# 4. Check running containers and logs
docker compose ps
docker compose logs -f
```

---

## 🔄 Step 4: Updating the App on the Server (Whenever you push changes)

Whenever you push new updates to GitHub, simply SSH into your server and run:

```bash
ssh -i id_rsa_tbf_frontend_dev -p 2202 developer@169.58.198.162 "cd /var/www/tbf-school-hub-frontend && git pull origin main && docker compose up -d --build && docker image prune -f"
```

---

## 🔒 GitHub Actions Auto-Deploy Configuration (Optional)

To enable automatic deployment on every `git push origin main`:
In GitHub Repository > **Settings > Secrets and variables > Actions**:
- `SERVER_HOST`: `169.58.198.162`
- `SERVER_USER`: `developer`
- `SERVER_SSH_PORT`: `2202`
- `SERVER_SSH_KEY`: *(Paste the content of your `id_rsa_tbf_frontend_dev` private key file)*

