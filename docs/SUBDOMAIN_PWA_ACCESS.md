## Subdomain access for the PWA (recommended)

Goal: access the PWA at a stable HTTPS URL like `https://pwa.automatrix.pk` while keeping the Docker Compose stack unchanged.

This guide assumes:
- Your VPS already has nginx (common on Hostinger/VPS setups).
- The stack is running with the current `docker-compose.yml` ports:
  - PWA container exposed on `127.0.0.1:8080` (host port) → container `80`
  - Gateway API exposed on `127.0.0.1:8788` (host port) → container `8788`

If you already have other apps on this VPS, this setup **does not require** restarting Mosquitto and **does not require** changing the compose file.

---

## 1) Pick subdomains

Recommended:
- **PWA**: `pwa.automatrix.pk`
- **Gateway API** (optional but cleaner): `api.automatrix.pk`

You *can* also host the gateway under the same PWA domain (e.g. `pwa.yourdomain.com/api/*`), but using a dedicated API subdomain makes CORS + debugging simpler.

---

## 2) DNS records

Create these DNS records at your domain provider:

- `pwa` → **A record** to your VPS public IPv4
- (optional) `api` → **A record** to your VPS public IPv4

Wait for DNS to propagate (can be minutes to hours).

---

## 3) Nginx reverse proxy (PWA subdomain)

Create a file on the VPS:
- `/etc/nginx/sites-available/kc-pvdg-pwa.conf`

With this server block (HTTP only for now; TLS comes next):

```nginx
server {
  listen 80;
  server_name pwa.automatrix.pk;

  # PWA (nginx-in-container) is exposed as host port 8080
  location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

Enable it and reload nginx:

```bash
sudo ln -sf /etc/nginx/sites-available/kc-pvdg-pwa.conf /etc/nginx/sites-enabled/kc-pvdg-pwa.conf
sudo nginx -t
sudo systemctl reload nginx
```

You should now be able to open `http://pwa.automatrix.pk`.

---

## 4) Nginx reverse proxy (Gateway API subdomain) (optional)

Create:
- `/etc/nginx/sites-available/kc-pvdg-api.conf`

```nginx
server {
  listen 80;
  server_name api.automatrix.pk;

  location / {
    proxy_pass http://127.0.0.1:8788;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

Enable + reload:

```bash
sudo ln -sf /etc/nginx/sites-available/kc-pvdg-api.conf /etc/nginx/sites-enabled/kc-pvdg-api.conf
sudo nginx -t
sudo systemctl reload nginx
```

Smoke test:
- `curl -sS http://api.automatrix.pk/api/health`

---

## 5) TLS / HTTPS certificates (Let’s Encrypt)

Install certbot for nginx (Ubuntu/Debian typical):

```bash
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx
```

Issue certs:

```bash
sudo certbot --nginx -d pwa.automatrix.pk
# optional:
sudo certbot --nginx -d api.automatrix.pk
```

Certbot will update nginx configs to serve HTTPS and usually adds HTTP→HTTPS redirects.

Verify auto-renew:

```bash
sudo certbot renew --dry-run
```

---

## 6) Update gateway CORS for your PWA domain

In the repo `.env` used by Docker Compose on the VPS, set:

```bash
CORS_ORIGIN=https://pwa.automatrix.pk
KC_PVDG_PUBLIC_MODE=1
```

Then restart only this stack (does not touch other services like Mosquitto):

```bash
cd /opt/kc_pv_dg
docker compose up -d
```

---

## 7) Update the PWA to call the gateway (recommended options)

### Option A (recommended): same-origin `/api` (no special PWA env needed)

Point nginx on the **PWA** domain to proxy `/api` to the gateway:

```nginx
location /api/ {
  proxy_pass http://127.0.0.1:8788/api/;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Real-IP $remote_addr;
}
```

Pros:
- No CORS headaches (browser sees same origin).
- PWA keeps using relative `fetch('/api/...')`.

### Option B: dedicated API domain with `VITE_GATEWAY_URL`

If you want the PWA to call `https://api.yourdomain.com` directly, build the PWA with:

```bash
VITE_GATEWAY_URL=https://api.automatrix.pk
```

Then ensure gateway `CORS_ORIGIN` includes `https://pwa.yourdomain.com`.
Then ensure gateway `CORS_ORIGIN` includes `https://pwa.automatrix.pk`.

Note: this repo’s production PWA is built in Docker; set the env at build time (or keep Option A).

---

## 8) Final “this is correct” checklist

- `https://pwa.automatrix.pk` loads
- `https://pwa.automatrix.pk/api/health` returns `{ ok: true }` (if using Option A)
- PWA login works (installer/manufacturer)
- PWA “Gateway commissioning” → Refresh list shows MQTT-discovered sites

