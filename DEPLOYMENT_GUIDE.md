# Bugbl.io Deployment Guide

This guide explains how to deploy your game with the frontend on **Vercel** and the backend on **Railway**.

---

## 🚀 Backend: Railway (Server)

1. **Push your code** to GitHub (already done).
2. Go to [Railway.app](https://railway.app) and click **"New Project"**.
3. Select **"Deploy from GitHub repo"** and choose `bugbl`.
4. Railway will detect the `server/railway.toml` file.
5. **Set Environment Variables** in Railway (Project Settings → Variables):
   - `PORT`: `3001` (or let Railway assign one)
   - `NODE_ENV`: `production`
   - `CLIENT_URL`: `https://your-frontend-domain.vercel.app` (The URL Vercel gives you)
6. **Deployment Root**: Set this to `server` in the service settings if Railway doesn't automatically detect it.

---

## 🎨 Frontend: Vercel

1. Go to [Vercel.com](https://vercel.com) and click **"Add New" → "Project"**.
2. Select your `bugbl` repo.
3. Configure the Project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `client`
4. **Set Environment Variables**:
   - `VITE_SERVER_URL`: `https://your-backend-url.railway.app` (The URL Railway gives you)
5. Click **Deploy**.

---

## 🔗 Connection Checklist

> [!IMPORTANT]
> - Ensure `CLIENT_URL` on Railway matches your Vercel URL exactly (no trailing slash).
> - Ensure `VITE_SERVER_URL` on Vercel matches your Railway backend URL (no trailing slash).
> - Vercel only hosts the frontend assets; the real-time game logic runs on Railway.

---

## 🛠 Local testing post-cleanup
To run locally now:
- **Server**: `cd server && npm run dev`
- **Client**: `cd client && npm run dev`

Redis and Cluster mode are no longer required, making it much easier to deploy on free-tier services.
