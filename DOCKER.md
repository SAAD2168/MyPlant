# Docker Operations Guide

## Initial Setup and Running

1. Build all services:
```bash
docker-compose build
```

2. Start the application:
```bash
docker-compose up -d
```

3. Access the services:
- Frontend: http://localhost:80
- Backend API: http://localhost:5000

## Making Changes

When making changes to the codebase, use the following commands to rebuild:

```bash
# Build with specific approach for each service
docker compose build --no-cache frontend model && docker compose build backend

# Immediately clean up dangling images after build
docker image prune -f
```

## Basic Operations

```bash
# Start containers
docker compose up -d

# Stop containers
docker compose down

# View logs
docker compose logs -f

# View status
docker compose ps
```