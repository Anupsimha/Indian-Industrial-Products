# Custom Website & Subdomain Nginx Infrastructure Documentation

## Overview
The **Indian Industrial Platform (IIP)** supports dedicated custom company websites on subdomains (e.g. `https://sample.indianindustrialplatform.com`).
This document tracks the VM-level Nginx reverse-proxy and Let's Encrypt SSL configurations running on production server `200.141.14.101`.

---

## 1. Multi-Tenant Architecture & Subdomain Traffic Flow

```
User Browser
    │
    ▼
Hostinger DNS (Zone: indianindustrialplatform.com)
  - Explicit A-records: `sample -> 200.141.14.101`
  - Wildcard A-record: `* -> 200.141.14.101` (Zero-latency propagation fallback)
    │
    ▼
Production Server Nginx (Port 80 / Port 443)
  ├── `billing.indianindustrialplatform.com`  ──> Proxy: http://127.0.0.1:3010 (IIP Billing Pro)
  ├── `indianindustrialplatform.com`          ──> Proxy: http://127.0.0.1:3001 (IIP Main Frontend)
  ├── `*.indianindustrialplatform.com`        ──> Proxy: http://127.0.0.1:3001 (Tenant Website / Multi-tenant App)
  └── `/api/` (inside container)               ──> Proxy: http://backend:8000
```

---

## 2. Nginx Site Configurations on VM (`/etc/nginx/sites-available/`)

### A. Billing Subdomain (`/etc/nginx/sites-available/billing.indianindustrialplatform.com`)
- **Server Name**: `billing.indianindustrialplatform.com`
- **Proxy Pass**: `http://127.0.0.1:3010`
- **SSL Certificate**: `/etc/letsencrypt/live/billing.indianindustrialplatform.com/fullchain.pem`
- **SSL Key**: `/etc/letsencrypt/live/billing.indianindustrialplatform.com/privkey.pem`

### B. Main Platform (`/etc/nginx/sites-available/indianindustrialplatform.com`)
- **Server Name**: `indianindustrialplatform.com www.indianindustrialplatform.com`
- **Proxy Pass**: `http://127.0.0.1:3001`
- **SSL Certificate**: `/etc/letsencrypt/live/indianindustrialplatform.com/fullchain.pem`

### C. Tenant Subdomain Configuration (`/etc/nginx/sites-available/sample.indianindustrialplatform.com`)
For individual custom website subdomains provisioned with Let's Encrypt:
```nginx
server {
    client_max_body_size 100M;
    proxy_read_timeout 300s;
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;

    server_name sample.indianindustrialplatform.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    listen [::]:443 ssl;
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/sample.indianindustrialplatform.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sample.indianindustrialplatform.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    if ($host = sample.indianindustrialplatform.com) {
        return 301 https://$host$request_uri;
    }
    listen 80;
    listen [::]:80;
    server_name sample.indianindustrialplatform.com;
    return 404;
}
```

---

## 3. Let's Encrypt SSL Generation Commands on the Server
To issue an SSL certificate for any new subdomain on the production VM without stopping Nginx:
```bash
sudo certbot certonly --nginx -d <subdomain>.indianindustrialplatform.com --non-interactive --agree-tos -m info@indianindustrialproducts.com
```

### Auto-Renewal:
Certbot renews certificates automatically via standard systemd timer:
```bash
sudo systemctl status certbot.timer
```

---

## 4. Frontend Subdomain Routing (`frontend/src/App.js` & `TenantWebsitePage.jsx`)
- When a user accesses `https://<subdomain>.indianindustrialplatform.com/`, the frontend checks `window.location.hostname`.
- If the host is a custom tenant subdomain (excluding `www`, `staging`, `billing`, `api`), the app directly mounts `<TenantWebsitePage />` in full-bleed mode without top navigation bars or global footer chrome.
- The template dynamically queries `GET /api/public/site/<subdomain>` to hydrate the company's verified products, posts, reels, and selected theme tokens without any rebuild or redeploy.
