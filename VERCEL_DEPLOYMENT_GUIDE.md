# 🚀 VERCEL DEPLOYMENT GUIDE - FIX 500 ERROR

## ⚠️ CRITICAL: VERCEL FOR BACKEND APIS

**IMPORTANT:** Vercel is optimized for **frontend apps** and **serverless functions**. For a full Node.js backend with MySQL, consider:

1. **Railway** (Recommended - Easy MySQL setup)
2. **Render** (Free tier available)
3. **Heroku** (Paid)
4. **DigitalOcean App Platform**
5. **AWS EC2 / Elastic Beanstalk**

---

## 🔧 IF YOU MUST USE VERCEL - FIXES

### **Step 1: Update vercel.json**

Already created! ✅

### **Step 2: Add Environment Variables in Vercel Dashboard**

1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. Add ALL these variables:

```env
# Server
NODE_ENV=production
PORT=5000
API_VERSION=v1

# Database (USE PRODUCTION DATABASE URL!)
DB_HOST=your-production-db-host
DB_PORT=3306
DB_NAME=salaahmanager
DB_USER=your-db-user
DB_PASSWORD=your-db-password

# JWT
JWT_SECRET=your-super-secret-production-key-change-this
JWT_EXPIRE=87600h
JWT_REFRESH_SECRET=your-refresh-secret-production-key
JWT_REFRESH_EXPIRE=87600h

# CORS (Your frontend URL)
CORS_ORIGIN=https://your-frontend.vercel.app

# Upload
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX=5
```

**⚠️ IMPORTANT:** 
- Use a **production MySQL database** (not localhost!)
- Options: **PlanetScale**, **Railway MySQL**, **Supabase**, **AWS RDS**

---

### **Step 3: Check Vercel Function Logs**

1. Go to **Deployments** tab
2. Click on your failed deployment
3. Click **Functions** tab
4. Check **Runtime Logs** for actual error

Common errors:
- Database connection timeout
- Missing environment variables
- Port binding issues
- Missing dependencies

---

### **Step 4: Update package.json for Vercel**

Add this to your `package.json`:

```json
{
  "engines": {
    "node": "18.x"
  }
}
```

---

### **Step 5: Database Connection Issues**

Vercel serverless functions have **cold starts**. Your database connection might timeout.

**Fix:** Update `src/config/database.js`:

```javascript
dialectOptions: {
  connectTimeout: 60000,
  // Add SSL if your database requires it
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: false
  } : false
}
```

---

## 🎯 BETTER ALTERNATIVE: RAILWAY (EASIEST!)

### **Why Railway?**
✅ Built for Node.js backends
✅ Free MySQL database included
✅ Auto-deploys from GitHub
✅ Easy environment variables
✅ Persistent connections

### **Deploy to Railway:**

1. **Go to** https://railway.app
2. **Sign up** with GitHub
3. **New Project** → **Deploy from GitHub repo**
4. **Add MySQL Database**:
   - Click "+ New" → "Database" → "MySQL"
   - Railway auto-creates database
5. **Add Environment Variables:**
   - Copy your `.env` values
   - Railway gives you `DATABASE_URL` automatically
6. **Deploy!**

### **Update database.js for Railway:**

```javascript
// Use DATABASE_URL if provided (Railway format)
const dbConfig = process.env.DATABASE_URL 
  ? {
      url: process.env.DATABASE_URL,
      dialect: 'mysql'
    }
  : {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      dialect: 'mysql'
    };
```

---

## 🐛 DEBUGGING 500 ERROR ON VERCEL

### **Check These:**

1. **Environment Variables:**
   ```bash
   # Missing variables cause 500 errors
   # Verify ALL are set in Vercel dashboard
   ```

2. **Database Connection:**
   ```bash
   # Vercel serverless functions can't connect to localhost
   # Must use remote database (PlanetScale, Railway, etc.)
   ```

3. **Function Timeout:**
   ```bash
   # Vercel has 10s timeout for free tier
   # Database connections might timeout
   ```

4. **Missing Dependencies:**
   ```bash
   # Check package.json includes all dependencies
   # Vercel auto-installs, but verify
   ```

5. **Port Binding:**
   ```bash
   # Vercel handles port automatically
   # Don't hardcode PORT in server.js
   ```

---

## ✅ QUICK FIX CHECKLIST

- [ ] Created `vercel.json` ✅
- [ ] Created `api/index.js` ✅
- [ ] Set ALL environment variables in Vercel dashboard
- [ ] Using **remote database** (not localhost)
- [ ] Database allows connections from Vercel IPs
- [ ] Checked Vercel function logs for actual error
- [ ] Verified `package.json` has correct dependencies

---

## 📝 MINIMAL VERCEL CONFIGURATION

**vercel.json:**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "api/index.js"
    }
  ]
}
```

**api/index.js:**
```javascript
require('dotenv').config();
module.exports = require('../src/app');
```

---

## 🔍 ACTUAL ERROR CHECK

**To find the REAL error:**

1. Vercel Dashboard → Your Project
2. **Deployments** tab
3. Click failed deployment
4. **Functions** tab
5. **Runtime Logs**

**Look for:**
- Database connection errors
- Missing environment variable errors
- Module not found errors
- Timeout errors

---

## 🚨 COMMON VERCEL 500 ERRORS

### **Error 1: Cannot connect to database**
```
Error: connect ECONNREFUSED
```
**Fix:** Use remote database, not localhost

### **Error 2: Missing environment variable**
```
Error: DB_HOST is not defined
```
**Fix:** Add all env vars in Vercel dashboard

### **Error 3: Module not found**
```
Error: Cannot find module 'mysql2'
```
**Fix:** Ensure package.json has all dependencies

### **Error 4: Function timeout**
```
Error: Function execution exceeded timeout
```
**Fix:** Optimize database queries or use Railway instead

---

## 💡 RECOMMENDATION

**For this project, use RAILWAY instead of VERCEL:**

1. Better for Node.js backends
2. Free MySQL database included
3. Simpler deployment
4. No serverless cold start issues
5. Persistent database connections

**Railway Deployment:**
1. Sign up at railway.app
2. Deploy from GitHub
3. Add MySQL database
4. Set environment variables
5. Done! ✅

---

## 🔗 ALTERNATIVE PLATFORMS

| Platform | Best For | Free Tier | MySQL Setup |
|----------|----------|-----------|-------------|
| **Railway** | Node.js APIs | ✅ Yes | ✅ Easy |
| **Render** | Full-stack apps | ✅ Yes | ✅ Easy |
| **Heroku** | Established apps | ❌ No | ✅ Easy |
| **DigitalOcean** | Production | ❌ No | ✅ Easy |
| **Vercel** | Frontend/Serverless | ✅ Yes | ⚠️ Hard |

---

**Copy this guide and follow the steps!** 🚀

