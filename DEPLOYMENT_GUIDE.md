# 🚀 Bugbl.io Deployment Guide (Render + Vercel)

This project is now configured with a clear separation between the **Frontend (Vercel)** and the **Backend (Render)**.

## 1. Backend (Render.com)
Deploy your Server to Render for stable WebSocket support.

1.  **New Web Service**: Create a new Web Service on Render and connect your GitHub repo.
2.  **Root Directory**: Set this to **`server`**. (This is critical!)
3.  **Command Settings**:
    *   **Build Command**: `npm install`
    *   **Start Command**: `node index.js`
4.  **Environment Variables**:
    *   `PORT`: `10000` (Render default)
    *   `CLIENT_URL`: `https://bugbl.vercel.app` (Your Vercel URL)
5.  **Copy the URL**: Once deployed, copy your Render URL (e.g., `https://bugbl-server.onrender.com`).

## 2. Frontend (Vercel)
Deploy your React app to Vercel for fast global performance.

1.  **Project Settings**: Go to your Vercel project Settings → Environment Variables.
2.  **Update `VITE_SERVER_URL`**: Paste your Render URL here.
3.  **Redeploy**: Go to the "Deployments" tab and **Redeploy** so the new URL is baked into the build.

## 3. Verification
- Open your Vercel link.
- Open the console (F12).
- You should see: `[Socket] Initializing with SERVER_URL: https://...onrender.com`.
- The "Connection failed" message should disappear!
