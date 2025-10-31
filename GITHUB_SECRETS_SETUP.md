# 🔐 GITHUB SECRETS SETUP - FIX "vercel-token not supplied" ERROR

═══════════════════════════════════════════════════════════════
# ❌ ERROR MESSAGE
═══════════════════════════════════════════════════════════════

```
Error: Input required and not supplied: vercel-token
```

**Problem:** GitHub secret `VERCEL_TOKEN` not found or not set

═══════════════════════════════════════════════════════════════
# ✅ SOLUTION: ADD GITHUB SECRETS
═══════════════════════════════════════════════════════════════

## STEP 1: Get Vercel Token

1. **Go to:** https://vercel.com/account/tokens
2. **Click:** "Create Token"
3. **Name:** `GitHub Actions`
4. **Scope:** `Full Account` (or Project if you have Pro)
5. **Expiration:** `Never` (or set a future date)
6. **Click:** "Create"
7. **COPY THE TOKEN** (you'll only see it once!)
   - Example: `xXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXx`

## STEP 2: Get Vercel Project & Org IDs

**Method A: From Vercel Dashboard**

1. **Go to:** Vercel Dashboard → Your Project (`alasrbackend`)
2. **Click:** Settings → General
3. **Scroll down** to see:
   - **Project ID:** `prj_xxxxxxxxxxxxxxxxxx`
   - **Organization ID:** `team_xxxxxxxxxxxxxxxxxx` or `user_xxxxxxxxxxxxxxxxxx`

**Method B: From Project Settings URL**

1. In Vercel Dashboard, URL looks like:
   ```
   https://vercel.com/[org-name]/alasrbackend/settings
   ```
2. Go to Settings → General
3. Look for:
   - **Project ID** (starts with `prj_`)
   - **Team ID** or **User ID** (starts with `team_` or `user_`)

═══════════════════════════════════════════════════════════════
# 🔐 STEP 3: ADD SECRETS TO GITHUB
═══════════════════════════════════════════════════════════════

## Detailed Steps:

1. **Go to GitHub Repository**
   - https://github.com/your-username/alasrbackend

2. **Click:** Settings (top menu bar of repository)

3. **Click:** Secrets and variables → Actions
   - Left sidebar: "Secrets and variables" → "Actions"

4. **Click:** "New repository secret" (top right)

5. **Add Secret 1: VERCEL_TOKEN**
   - **Name:** `VERCEL_TOKEN` (exact name, all caps)
   - **Secret:** [Paste your Vercel token]
   - **Click:** "Add secret"

6. **Click:** "New repository secret" again

7. **Add Secret 2: VERCEL_ORG_ID**
   - **Name:** `VERCEL_ORG_ID` (exact name, all caps)
   - **Secret:** [Paste your Org/Team/User ID]
     - Format: `team_xxxxxxxxxxxxx` or `user_xxxxxxxxxxxxx`
   - **Click:** "Add secret"

8. **Click:** "New repository secret" again

9. **Add Secret 3: VERCEL_PROJECT_ID**
   - **Name:** `VERCEL_PROJECT_ID` (exact name, all caps)
   - **Secret:** [Paste your Project ID]
     - Format: `prj_xxxxxxxxxxxxx`
   - **Click:** "Add secret"

═══════════════════════════════════════════════════════════════
# ✅ VERIFY SECRETS ARE ADDED
═══════════════════════════════════════════════════════════════

**Go to:** GitHub → Repository → Settings → Secrets and variables → Actions

**You should see:**
- ✅ `VERCEL_TOKEN` (shows as `••••••••`)
- ✅ `VERCEL_ORG_ID` (shows as `••••••••`)
- ✅ `VERCEL_PROJECT_ID` (shows as `••••••••`)

**If you see all 3:** ✅ Secrets are set correctly!

**If missing any:** Click "New repository secret" and add it

═══════════════════════════════════════════════════════════════
# 🚀 STEP 4: TEST DEPLOYMENT
═══════════════════════════════════════════════════════════════

## After Adding Secrets:

```bash
# Make a small change to trigger workflow
echo "# Test secrets" >> README.md
git add README.md
git commit -m "Test Vercel deployment after adding secrets"
git push origin master
```

## Check Results:

### GitHub Actions:
1. **Repository → Actions tab**
2. **Click:** Latest workflow run
3. **Should see:**
   - ✅ "Deploy to Vercel" step runs (not fails!)
   - ✅ Shows deployment URL

### If Still Fails:
- Check secret names are EXACTLY:
  - `VERCEL_TOKEN` (not `VERCEL_TOKEN_` or `vercel_token`)
  - `VERCEL_ORG_ID` (not `VERCEL_ORG_ID_`)
  - `VERCEL_PROJECT_ID` (not `VERCEL_PROJECT_ID_`)

═══════════════════════════════════════════════════════════════
# 🔍 TROUBLESHOOTING
═══════════════════════════════════════════════════════════════

## Error: "Input required and not supplied: vercel-token"

**Causes:**
1. ❌ Secret `VERCEL_TOKEN` not added
2. ❌ Secret name is wrong (case-sensitive!)
3. ❌ Secret added to wrong repository
4. ❌ Secrets added to Organization/Environment instead of Repository

**Fix:**
1. ✅ Go to Repository → Settings → Secrets → Actions
2. ✅ Verify `VERCEL_TOKEN` exists (exact name)
3. ✅ If missing, add it
4. ✅ If exists but still fails, delete and recreate

## Error: "Invalid token"

**Cause:** Token expired or incorrect
**Fix:**
1. Create new token: https://vercel.com/account/tokens
2. Update `VERCEL_TOKEN` secret in GitHub

## Error: "Project not found"

**Cause:** Wrong Project ID or Org ID
**Fix:**
1. Check Project ID in Vercel dashboard
2. Check Org ID in Vercel dashboard
3. Update secrets with correct values

═══════════════════════════════════════════════════════════════
# 📋 SECRET NAMES CHECKLIST
═══════════════════════════════════════════════════════════════

**MUST BE EXACTLY (case-sensitive!):**

✅ `VERCEL_TOKEN` ← Correct
❌ `vercel_token` ← Wrong (lowercase)
❌ `VERCEL_TOKEN_` ← Wrong (trailing underscore)
❌ `vercel-token` ← Wrong (dash instead of underscore)

✅ `VERCEL_ORG_ID` ← Correct
❌ `VERCEL_ORGID` ← Wrong (missing underscore)
❌ `VERCEL_ORG_ID_` ← Wrong (trailing underscore)

✅ `VERCEL_PROJECT_ID` ← Correct
❌ `VERCEL_PROJECTID` ← Wrong (missing underscore)
❌ `PROJECT_ID` ← Wrong (missing VERCEL_ prefix)

═══════════════════════════════════════════════════════════════
# 🎯 QUICK SETUP SUMMARY
═══════════════════════════════════════════════════════════════

1. **Get Vercel Token:** https://vercel.com/account/tokens
2. **Get IDs:** Vercel Dashboard → Settings → General
3. **Add Secrets:** GitHub → Settings → Secrets → Actions
4. **Add 3 secrets:**
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`
5. **Push to master:** Triggers deployment
6. **Check:** GitHub Actions tab for deployment status

═══════════════════════════════════════════════════════════════

**Add the 3 secrets to GitHub with EXACT names, then push again!** 🚀

