# Coolify Docker Compose - Configuration Guide

## 🚨 Common Issue: "no available server" / Traefik routing fails

When deploying docker-compose apps on Coolify, Traefik needs proper configuration to route traffic.

### Required Labels (on the service you want to expose)

```yaml
labels:
  - "traefik.enable=true"
  - "coolify.managed=true"
  - "coolify.port=3000"  # Your app port
```

### Required Network Configuration

**DON'T use external network:**
```yaml
# ❌ WRONG
networks:
  coolify:
    external: true
```

**DO use bridge network:**
```yaml
# ✅ CORRECT
networks:
  myapp_network:
    driver: bridge
```

### Required Port Exposure

```yaml
services:
  app:
    expose:
      - "3000"  # Internal exposure, not ports mapping
```

### Full Working Example

```yaml
services:
  app:
    build: .
    restart: unless-stopped
    expose:
      - "3000"
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    labels:
      - "traefik.enable=true"
      - "coolify.managed=true"
      - "coolify.port=3000"
    networks:
      - app_network

  db:
    image: postgres:16-alpine
    # ... db config
    networks:
      - app_network

networks:
  app_network:
    driver: bridge
```

### After Pushing Changes

1. **Reload Compose File** in Coolify (button next to Save)
2. **Deploy**

---
*Documented after 3 failed attempts on different projects. Don't forget this!*
