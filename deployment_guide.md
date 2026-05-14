# 🚀 Deployment Guide: System Design Simulator

I've prepared your project for deployment by updating the Go module structure and fixing frontend build errors. Your project is now ready to be hosted on **Render** (or any Docker-compatible platform).

## 🛠️ What I've Done
1.  **Go Module Update**: Synchronized the Go module name and all internal package imports to match your GitHub repository (`github.com/Rohan0639/system-design-simulator`).
2.  **Frontend Fixes**: Resolved TypeScript "unused variable" errors that were blocking the production build.
3.  **Docker Verification**: Verified that both the Backend and Frontend build successfully using their respective Dockerfiles.

---

## 📦 Deployment Steps

### 1. Push Changes to GitHub
First, you need to push the fixes I made to your repository so Render can see them.
```bash
git add .
git commit -m "chore: prepare for deployment (fix module names & build errors)"
git push origin main
```

### 2. Connect to Render
1.  Go to [Render.com](https://render.com/) and log in.
2.  Click **New +** > **Blueprint**.
3.  Connect your GitHub repository: `Rohan0639/system-design-simulator`.
4.  Render will automatically detect the `render.yaml` file and set up two services:
    *   `sys-design-sim-backend`
    *   `sys-design-sim-frontend`

### 3. Configure Environment Variables
In the Render dashboard, you **must** add your secret API key for the AI Architect to work:
1.  Go to the **Backend** service settings.
2.  Add an Environment Variable:
    *   **Key**: `GROK_API_KEY`
    *   **Value**: *[Your Groq/X.AI API Key]*

### 4. Final Connection (The "Glue")
Once the backend is live, Render will give you a URL (e.g., `https://sys-design-sim-backend.onrender.com`).
1.  Check if this URL matches the `VITE_API_URL` in your `render.yaml`.
2.  If it's different, update the `VITE_API_URL` in the **Frontend** service settings on Render and trigger a re-deploy.

## 🌐 Alternative: Frontend on Vercel

If you prefer using **Vercel** for your frontend (recommended for faster global performance), you can use a **Split Deployment** strategy:

### 1. Backend (Render/Railway/Fly.io)
The backend **must** stay on a platform that supports WebSockets (like Render). Vercel Serverless Functions do not support persistent WebSocket connections.
- Follow the Render steps above for the `sys-design-sim-backend` service.

### 2. Frontend (Vercel)
1.  Go to [Vercel](https://vercel.com).
2.  Import your repository.
3.  Set the **Root Directory** to `frontend`.
4.  Add an **Environment Variable**:
    *   **Key**: `VITE_API_URL`
    *   **Value**: `https://your-backend-url.onrender.com`
5.  Deploy!

---

## 🔍 Verification
- **Health Check**: Visit `https://your-backend-url.onrender.com/health`. You should see `{"status":"ok"}`.
- **WebSocket**: Open the frontend (on Vercel) and start a simulation. If the lines start pulsing and charts move, the connection is successful!

> [!TIP]
> Since you are using the **Free Plan** on Render, the backend may "spin down" after inactivity. The first request might take ~30 seconds to wake it up.
