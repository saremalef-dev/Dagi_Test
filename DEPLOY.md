# Chess Wagering App - Deployment Guide

## 🚀 Quick Deploy to Render

### Prerequisites
1. GitHub account
2. Render account (free tier works!)
3. Push your code to GitHub

### Step 1: Prepare Your Repository

```bash
# Initialize git (if not already done)
git init
git add .
git commit -m "Initial commit - Chess Wagering App"

# Create GitHub repo and push
git remote add origin <your-github-repo-url>
git push -u origin main
```

### Step 2: Deploy PostgreSQL Database

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"PostgreSQL"**
3. Configure:
   - **Name:** `chess-wagering-db`
   - **Database:** `chess_wagering`
   - **User:** `chess_user`
   - **Region:** Choose closest to you
   - **Plan:** Free tier
4. Click **"Create Database"**
5. **Copy the Internal Database URL** (starts with `postgresql://`)

### Step 3: Deploy Backend API

1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository
3. Configure:
   - **Name:** `chess-wagering-backend`
   - **Region:** Same as database
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm install && npx prisma generate && npx prisma migrate deploy`
   - **Start Command:** `npm start`
4. Add Environment Variables:
   - `DATABASE_URL` = (paste the Internal Database URL from Step 2)
   - `PORT` = `3001`
   - `NODE_ENV` = `production`
   - `FRONTEND_URL` = `https://<your-frontend-name>.onrender.com` (you'll set this after deploying frontend)
5. Click **"Create Web Service"**
6. Wait for deployment (5-10 minutes)
7. **Copy your backend URL** (e.g., `https://chess-wagering-backend.onrender.com`)

### Step 4: Deploy Frontend

1. Click **"New +"** → **"Static Site"**
2. Connect same GitHub repository
3. Configure:
   - **Name:** `chess-wagering-frontend`
   - **Branch:** `main`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `.next`
4. Add Environment Variable:
   - `NEXT_PUBLIC_BACKEND_URL` = (paste your backend URL from Step 3)
5. Click **"Create Static Site"**
6. Wait for deployment

### Step 5: Update Backend CORS

1. Go back to your **Backend Service** settings
2. Update the `FRONTEND_URL` environment variable to your actual frontend URL
3. Click **"Save Changes"**
4. Backend will automatically redeploy

### Step 6: Test Your App! 🎮

1. Visit your frontend URL
2. Create a game
3. Open incognito window, join the game
4. Play chess!

## 🔧 Troubleshooting

### Backend Won't Start
- Check logs: Dashboard → Backend Service → Logs
- Verify `DATABASE_URL` is set correctly
- Ensure migrations ran: look for "Prisma Migrate" in logs

### Frontend Shows Connection Error
- Verify `NEXT_PUBLIC_BACKEND_URL` is correct
- Check backend is running (visit backend-url/health)
- Check CORS settings in backend

### Database Connection Issues
- Ensure using **Internal Database URL**, not External
- Verify backend and database are in same region

## 📝 Important Notes

- **Free Tier Limitations:**
  - Backend sleeps after 15 minutes of inactivity
  - First request after sleep takes ~30 seconds
  - Upgrade to paid plan ($7/month) for always-on

- **Custom Domain (Optional):**
  - Go to Settings → Custom Domain
  - Add your domain
  - Update DNS records

## 🎉 You're Live!

Share your chess wagering app with friends and start playing!
