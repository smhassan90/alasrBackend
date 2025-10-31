# 🚨 VERCEL 500 ERROR - FUNCTION_INVOCATION_FAILED FIX

## 🔍 HOW TO SEE THE ACTUAL ERROR

**Step 1: Check Vercel Function Logs**
1. Go to: https://vercel.com/dashboard
2. Click on your project: `alasrbackend`
3. Click **Deployments** tab
4. Click on the **failed deployment** (red ❌)
5. Click **Functions** tab
6. Click on the function that failed
7. Click **Runtime Logs**
8. **SEE THE ACTUAL ERROR MESSAGE!**

Common errors you'll see:
- `Cannot connect to database` → Database connection issue
- `DB_HOST is not defined` → Missing environment variable
- `Cannot find module` → Missing dependency
- `ECONNREFUSED 127.0.0.1:3306` → Using localhost database

---

## ✅ FIXES APPLIED

1. ✅ Updated `vercel.json` to use `api/index.js` (not `server.js`)
2. ✅ Added error handling in `api/index.js`
3. ✅ Updated database config for serverless
4. ✅ Reduced connection pool for Vercel

---

## 🔧 CRITICAL: SET ENVIRONMENT VARIABLES IN VERCEL

**Go to:** Vercel Dashboard → Your Project → Settings → Environment Variables

**Add ALL these (CRITICAL - Missing any will cause 500 error):**

```
# DATABASE (MUST BE REMOTE - NOT LOCALHOST!)
DB_HOST=your-remote-database-host.com
DB_PORT=3306
DB_NAME=salaahmanager
DB_USER=your-db-user
DB_PASSWORD=your-db-password

# OR use single DATABASE_URL (if using PlanetScale)
# DATABASE_URL=mysql://user:password@host:3306/database

# JWT (REQUIRED)
JWT_SECRET=your-secret-key-change-this
JWT_EXPIRE=87600h
JWT_REFRESH_SECRET=your-refresh-secret-change-this
JWT_REFRESH_EXPIRE=87600h

# SERVER (REQUIRED)
NODE_ENV=production
PORT=5000
API_VERSION=v1

# CORS (REQUIRED)
CORS_ORIGIN=https://your-frontend.vercel.app

# UPLOAD (REQUIRED)
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads

# RATE LIMITING (OPTIONAL - has defaults)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX=5
```

**⚠️ MOST COMMON ISSUE:**
- `DB_HOST` is still `localhost` → MUST be remote database!
- Options: PlanetScale, Railway MySQL, AWS RDS, Supabase

---

## 🗄️ SETUP REMOTE DATABASE (REQUIRED!)

**Vercel CANNOT connect to localhost databases!**

### Option 1: PlanetScale (Easiest for Vercel)

1. Sign up: https://planetscale.com
2. Create database: `salaahmanager`
3. Get connection string from dashboard
4. Use in Vercel:
   ```
   DB_HOST=aws.connect.psdb.cloud
   DB_USER=your-username
   DB_PASSWORD=your-password
   DB_NAME=salaahmanager
   DB_PORT=3306
   DB_SSL=true
   ```

### Option 2: Railway MySQL

1. Sign up: https://railway.app
2. New Project → MySQL Database
3. Get connection details
4. Add to Vercel env vars

### Option 3: Supabase

1. Sign up: https://supabase.com
2. Create project → Database
3. Get connection string
4. Add to Vercel

---

## 🧪 TEST HEALTH ENDPOINT (NO DATABASE NEEDED)

**If health endpoint also fails, it's NOT a database issue:**

```
GET https://alasrbackend.vercel.app/api/v1/health
```

**Expected:**
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "...",
  "uptime": 123.456
}
```

**If this also fails:**
- Check environment variables
- Check function logs
- Check if code has syntax errors

---

## 📝 DEPLOYMENT CHECKLIST

BEFORE REDEPLOYING:
- [ ] All environment variables set in Vercel dashboard
- [ ] Database is REMOTE (not localhost)
- [ ] `vercel.json` updated ✅
- [ ] `api/index.js` created ✅
- [ ] Code committed to GitHub

REDEPLOY:
- [ ] Push changes to GitHub
- [ ] Vercel auto-deploys
- [ ] Check deployment status
- [ ] If failed: Check function logs

AFTER DEPLOYMENT:
- [ ] Test: https://alasrbackend.vercel.app/api/v1/health
- [ ] Check function logs if errors
- [ ] Test actual endpoint (login, etc.)

---

## 🔍 COMMON ERRORS & FIXES

### Error 1: Database Connection Failed
```
Error: connect ECONNREFUSED 127.0.0.1:3306
```
**Fix:**
- Use remote database
- Set DB_HOST to remote host
- Set DB_SSL=true if required

### Error 2: Missing Environment Variable
```
Error: DB_HOST is not defined
```
**Fix:**
- Add ALL env vars in Vercel dashboard
- Redeploy after adding

### Error 3: Module Not Found
```
Error: Cannot find module 'mysql2'
```
**Fix:**
- Run `npm install` locally
- Commit `package.json` and `package-lock.json`
- Redeploy

### Error 4: Function Timeout
```
Error: Function execution exceeded timeout
```
**Fix:**
- Updated `vercel.json` with `maxDuration: 30`
- Optimize database queries
- Use connection pooling

---

## 🚀 QUICK FIX STEPS

1. **Check Function Logs:**
   - Vercel Dashboard → Deployments → Failed deployment → Functions → Runtime Logs
   - **Copy the actual error message**

2. **Set Environment Variables:**
   - Vercel Dashboard → Settings → Environment Variables
   - Add ALL variables listed above
   - **Most critical: DB_HOST must be remote!**

3. **Redeploy:**
   - Push changes to GitHub
   - Or click "Redeploy" in Vercel dashboard

4. **Test:**
   - https://alasrbackend.vercel.app/api/v1/health

---

## 💡 RECOMMENDATION

**For better compatibility, use Railway instead:**

Railway is built for Node.js backends:
- ✅ FREE MySQL database included
- ✅ Better for persistent connections
- ✅ Easier deployment
- ✅ No serverless cold starts

**Railway Deployment:**
1. Sign up: https://railway.app
2. Deploy from GitHub
3. Add MySQL database (auto-created)
4. Set environment variables
5. Done! ✅

---

**Check the function logs first to see the actual error!** 🔍

