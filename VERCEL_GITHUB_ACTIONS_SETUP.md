# 🚀 VERCEL DEPLOYMENT VIA GITHUB ACTIONS - SETUP GUIDE

═══════════════════════════════════════════════════════════════
# ✅ WORKFLOW UPDATED
═══════════════════════════════════════════════════════════════

**The `production.yml` workflow now includes Vercel deployment!**

**Workflow:**
```
git push → GitHub Actions builds → Deploys to Vercel → Live! ✅
```

═══════════════════════════════════════════════════════════════
# 🔧 STEP 1: GET VERCEL CREDENTIALS
═══════════════════════════════════════════════════════════════

## Get Vercel Token

1. **Go to:** https://vercel.com/account/tokens
2. **Click:** "Create Token"
3. **Name:** "GitHub Actions Deployment"
4. **Scope:** Full Account (or Project - if you have Pro)
5. **Expiration:** Never (or set a date)
6. **Click:** "Create"
7. **Copy the token** (you'll only see it once!)

**Example token:** `xXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXx`

## Get Vercel Org ID & Project ID

### Method 1: From Vercel Dashboard

1. **Go to:** Your Vercel project dashboard
2. **Click:** Settings → General
3. **Scroll down** to see:
   - **Project ID:** `prj_xxxxxxxxxxxxxxxxxx`
   - **Organization ID:** `team_xxxxxxxxxxxxxxxxxx` or `user_xxxxxxxxxxxxxxxxxx`

### Method 2: From URL

**Vercel Project URL:**
```
https://vercel.com/[org-name]/[project-name]
```

**In Vercel Dashboard:**
1. Go to Settings → General
2. Look for:
   - **Project ID** (format: `prj_xxxxxxxxxxxxx`)
   - **Team ID** or **User ID** (format: `team_xxxxxxxxxxxxx` or `user_xxxxxxxxxxxxx`)

### Method 3: Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Link project (shows IDs)
vercel link
```

═══════════════════════════════════════════════════════════════
# 🔐 STEP 2: ADD GITHUB SECRETS
═══════════════════════════════════════════════════════════════

## Add Secrets to GitHub

1. **Go to:** Your GitHub Repository
2. **Click:** Settings (top menu)
3. **Click:** Secrets and variables → Actions
4. **Click:** "New repository secret"

## Add These 3 Secrets:

### Secret 1: VERCEL_TOKEN
- **Name:** `VERCEL_TOKEN`
- **Value:** Paste your Vercel token (from Step 1)
- **Click:** "Add secret"

### Secret 2: VERCEL_ORG_ID
- **Name:** `VERCEL_ORG_ID`
- **Value:** Paste your Organization/Team/User ID
  - Format: `team_xxxxxxxxxxxxx` or `user_xxxxxxxxxxxxx`
- **Click:** "Add secret"

### Secret 3: VERCEL_PROJECT_ID
- **Name:** `VERCEL_PROJECT_ID`
- **Value:** Paste your Project ID
  - Format: `prj_xxxxxxxxxxxxx`
- **Click:** "Add secret"

## Verify Secrets Added:

**Should see:**
- ✅ `VERCEL_TOKEN`
- ✅ `VERCEL_ORG_ID`
- ✅ `VERCEL_PROJECT_ID`

═══════════════════════════════════════════════════════════════
# 🚀 STEP 3: COMMIT & PUSH UPDATED WORKFLOW
═══════════════════════════════════════════════════════════════

## Commit the Updated Workflow:

```bash
git add .github/workflows/production.yml
git commit -m "Add Vercel deployment to GitHub Actions"
git push origin master
```

═══════════════════════════════════════════════════════════════
# 🧪 STEP 4: TEST THE DEPLOYMENT
═══════════════════════════════════════════════════════════════

## Trigger a Test Deployment:

```bash
# Make a small change
echo "# Test deployment" >> README.md
git add README.md
git commit -m "Test GitHub Actions + Vercel deployment"
git push origin master
```

## Check Results:

### In GitHub Actions:
1. **Go to:** Repository → Actions tab
2. **Click:** "Production Build & Deploy"
3. **See workflow running:**
   - ✅ Build steps
   - ✅ Deploy to Vercel step
   - ✅ Deployment complete

### In Vercel Dashboard:
1. **Go to:** Vercel Dashboard → Deployments
2. **Should see:**
   - ✅ New deployment created
   - ✅ Triggered by GitHub Actions
   - ✅ Status: Building → Ready

═══════════════════════════════════════════════════════════════
# 📊 WORKFLOW OUTPUT
═══════════════════════════════════════════════════════════════

## What You'll See in GitHub Actions:

```
✅ Checkout code
✅ Setup Node.js
✅ Install dependencies
✅ Verify mysql2 installation
✅ Check build
✅ Display deployment info
✅ Build complete
✅ Deploy to Vercel
   → Preparing deployment...
   → Uploading files...
   → Building...
   → Deploying...
   → Deployment ready!
✅ Deployment complete
```

## Deployment URL:

**Shown in workflow logs:**
```
✅ Deployment to Vercel completed!
🔗 Live URL: https://alasrbackend.vercel.app
```

═══════════════════════════════════════════════════════════════
# 🔍 TROUBLESHOOTING
═══════════════════════════════════════════════════════════════

## Error: "VERCEL_TOKEN is not set"

**Problem:** Secret not added
**Fix:** 
1. GitHub → Settings → Secrets → Actions
2. Add `VERCEL_TOKEN` secret

## Error: "Invalid Vercel token"

**Problem:** Token expired or wrong
**Fix:**
1. Create new token: https://vercel.com/account/tokens
2. Update `VERCEL_TOKEN` secret in GitHub

## Error: "Project not found"

**Problem:** Wrong Project ID or Org ID
**Fix:**
1. Check Project ID in Vercel dashboard
2. Check Org ID in Vercel dashboard
3. Update secrets in GitHub

## Error: "Deployment failed"

**Problem:** Build error on Vercel
**Fix:**
1. Check Vercel deployment logs
2. Check GitHub Actions logs
3. Verify environment variables are set in Vercel

═══════════════════════════════════════════════════════════════
# 📝 QUICK REFERENCE: SECRET VALUES
═══════════════════════════════════════════════════════════════

## Where to Find Each Value:

| Secret Name | Where to Find | Example Format |
|-------------|---------------|----------------|
| `VERCEL_TOKEN` | https://vercel.com/account/tokens | `xXxXxXxXxX...` |
| `VERCEL_ORG_ID` | Vercel Dashboard → Settings → General | `team_xxxxx` or `user_xxxxx` |
| `VERCEL_PROJECT_ID` | Vercel Dashboard → Settings → General | `prj_xxxxx` |

═══════════════════════════════════════════════════════════════
# ✅ CHECKLIST
═══════════════════════════════════════════════════════════════

**Setup:**
- [ ] Created Vercel token ✅
- [ ] Got VERCEL_ORG_ID ✅
- [ ] Got VERCEL_PROJECT_ID ✅
- [ ] Added `VERCEL_TOKEN` secret in GitHub ✅
- [ ] Added `VERCEL_ORG_ID` secret in GitHub ✅
- [ ] Added `VERCEL_PROJECT_ID` secret in GitHub ✅
- [ ] Updated workflow file ✅
- [ ] Committed and pushed changes ✅

**Testing:**
- [ ] Pushed to master branch
- [ ] Checked GitHub Actions tab
- [ ] Verified "Deploy to Vercel" step runs
- [ ] Checked Vercel dashboard for new deployment
- [ ] Tested live URL: https://alasrbackend.vercel.app

═══════════════════════════════════════════════════════════════
# 🎯 WORKFLOW SUMMARY
═══════════════════════════════════════════════════════════════

## Complete Flow:

```
1. Developer pushes to master
   ↓
2. GitHub Actions triggers
   ↓
3. Builds project (verifies dependencies)
   ↓
4. Deploys to Vercel
   ↓
5. Vercel builds and deploys
   ↓
6. Live at: https://alasrbackend.vercel.app ✅
```

## Benefits:

✅ **Automated:** No manual steps
✅ **Validated:** Builds before deploying
✅ **Tracked:** See deployment status in GitHub
✅ **Reliable:** Both GitHub Actions and Vercel deploy

═══════════════════════════════════════════════════════════════

**Add the 3 secrets to GitHub and push - deployment will happen automatically!** 🚀

