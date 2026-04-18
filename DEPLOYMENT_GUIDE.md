# 🚀 Bugbl.io Deployment Guide (Railway Monolith)

The project is now configured as a **Monolith**, meaning the backend (server) and frontend (client) are built and served from a single Railway service.

## 1. Railway Setup (Backend + Frontend)

1.  **Repository**: Connect your GitHub repository to Railway.
2.  **Service**: Railway will automatically detect the root `package.json`.
3.  **Environment Variables**:
    *   `NODE_ENV`: `production`
    *   `PORT`: `8080` (Standard for Railway)
    *   `CLIENT_URL`: `https://your-app-name.up.railway.app` (Optional now, but good to have).
4.  **Build Command**: Railway will use the root `npm run build`, which now builds the frontend into the server's directory.

## 2. Vercel (Optional)
You **no longer need Vercel**. You can delete your Vercel project once the Railway deployment is stable.

## 3. Verification
Once deployed, open your **Railway Public Domain**. 
- The game should load immediately.
- Open the browser console (F12) to see: `[Socket] Initializing with SERVER_URL: Same Origin`.
- Enjoy the stable connection!
