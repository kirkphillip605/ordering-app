# ChefList - Deployment & Setup Guide

This guide provides comprehensive, step-by-step instructions for setting up, running, and deploying the **ChefList** Restaurant Purchase List PWA in both **Development** and **Production** environments using **PostgreSQL**.

---

## Table of Contents
1. [System Architecture Overview](#1-system-architecture-overview)
2. [Prerequisites](#2-prerequisites)
3. [Development Environment Setup](#3-development-environment-setup)
4. [Production Deployment (Docker Compose - Recommended)](#4-production-deployment-docker-compose---recommended)
5. [Production Deployment (Manual / VPS / PaaS)](#5-production-deployment-manual--vps--paas)
6. [Database Migrations & Schema Updates](#6-database-migrations--schema-updates)
7. [Production Best Practices & Security](#7-production-best-practices--security)
   - [SSL/HTTPS Requirement (Critical for Barcode Scanner)](#sslhttps-requirement-critical-for-barcode-scanner)
   - [Nginx Reverse Proxy Configuration](#nginx-reverse-proxy-configuration)

---

## 1. System Architecture Overview

ChefList is built as a modern, lightweight, mobile-first Progressive Web App (PWA):
- **Frontend**: React, Vite, Tailwind CSS, and Ionic React (for native-like UI components).
- **Backend**: Node.js, Express, and TypeScript.
- **Database Layer**: Drizzle ORM with **PostgreSQL** (via `pg`) for robust, production-ready data persistence.
- **Production Delivery**: In production, the Express server serves the compiled static frontend assets (`dist/` folder) alongside the API endpoints, eliminating CORS issues and simplifying deployment to a single port.

---

## 2. Prerequisites

Ensure you have the following installed on your host machine:
- **Node.js** (v18.x, v20.x, or v24.x LTS)
- **npm** (v9.x or later)
- **Docker & Docker Compose** (Required for Docker-based production deployment)
- **PostgreSQL** (Local instance or cloud-hosted database like Supabase, Neon, or RDS)

---

## 3. Development Environment Setup

First, clone the repository and install the dependencies:

```bash
# Install project dependencies (no native compilation issues!)
npm install
```

### Local Setup with PostgreSQL

1. **Create Database**:
   Create a database named `cheflist` in your local PostgreSQL instance.

2. **Configure Environment Variables**:
   Create a `.env` file in the root directory:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and configure your PostgreSQL connection string:
   ```env
   PORT=3001
   NODE_ENV=development
   JWT_SECRET=dev-secret-key-keep-it-safe
   DATABASE_URL=postgres://your_user:your_password@localhost:5432/cheflist
   ```

3. **Push Database Schema**:
   Sync your database schema with PostgreSQL:
   ```bash
   npm run db:push
   ```

4. **Start Development Servers**:
   Run both the backend API server and the Vite frontend dev server concurrently:
   ```bash
   # Terminal 1: Start Backend API Server (runs on port 3001)
   npm run server

   # Terminal 2: Start Frontend Dev Server (runs on port 5173)
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:5173`.

---

## 4. Production Deployment (Docker Compose - Recommended)

Using Docker Compose is the easiest and most reliable way to deploy ChefList to production. It spins up a production-ready PostgreSQL database container and a Node.js application container automatically.

1. **Configure Production Environment**:
   Create a `.env.production` file (or configure your host environment variables):
   ```env
   PORT=3001
   NODE_ENV=production
   JWT_SECRET=CHANGE_THIS_TO_A_LONG_RANDOM_SECURE_STRING
   DATABASE_URL=postgres://cheflist_user:cheflist_password@db:5432/cheflist_db
   ```
   *Note: The hostname in `DATABASE_URL` must match the database service name in `docker-compose.yml` (which is `db`).*

2. **Build and Run Containers**:
   Run the following command to build the application image and start the services in detached mode:
   ```bash
   docker-compose up --build -d
   ```

3. **Verify Deployment**:
   Check the status of your containers:
   ```bash
   docker-compose ps
   ```
   The application will be accessible at `http://localhost:3001`.

4. **Stop Services**:
   To stop the containers without losing database data:
   ```bash
   docker-compose down
   ```

---

## 5. Production Deployment (Manual / VPS / PaaS)

If you are deploying to a platform like Render, Heroku, Railway, or directly to a VPS without Docker:

1. **Set Environment Variables**:
   Configure the following environment variables on your hosting provider:
   - `NODE_ENV=production`
   - `PORT=3001`
   - `JWT_SECRET=your-highly-secure-random-key`
   - `DATABASE_URL=your-managed-postgres-connection-string`

2. **Build the Frontend**:
   Compile the React/Vite frontend into static assets:
   ```bash
   npm run build
   ```
   This generates a production-ready `dist/` folder in your root directory.

3. **Push Database Schema**:
   Apply the database schema to your production database:
   ```bash
   npm run db:push
   ```

4. **Start the Production Server**:
   Start the Node.js server. In production mode, the Express server automatically serves the static files from the `dist/` folder:
   ```bash
   npm start
   ```
   Your application is now live on the configured `PORT`.

---

## 6. Database Migrations & Schema Updates

When you make changes to the database schema in `server/db/schema.ts`:

### Generate Migration Files:
```bash
npm run db:generate
```

### Push Schema Changes Directly to Database:
```bash
npm run db:push
```

### Open Drizzle Studio (Database GUI):
```bash
npm run db:studio
```

---

## 7. Production Best Practices & Security

### SSL/HTTPS Requirement (Critical for Barcode Scanner)
Modern mobile browsers **strictly block camera access** on non-secure connections. To use the barcode scanner on mobile devices, **your production deployment must be served over HTTPS**.

### Nginx Reverse Proxy Configuration
It is highly recommended to place ChefList behind a reverse proxy like Nginx or Caddy to handle SSL certificates (via Let's Encrypt).

Below is a sample Nginx configuration block:

```nginx
server {
    listen 80;
    server_name cheflist.yourdomain.com;
    
    # Redirect all HTTP traffic to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name cheflist.yourdomain.com;

    # SSL Certificates (Managed by Certbot / Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/cheflist.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cheflist.yourdomain.com/privkey.pem;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-XSS-Protection "1; mode=block";
    add_header X-Content-Type-Options "nosniff";
    add_header Referrer-Policy "no-referrer-when-downgrade";
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Proxy requests to the Node.js/Express App
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
