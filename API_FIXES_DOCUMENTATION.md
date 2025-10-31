# 🔧 Backend API Fixes for Super Admin Portal

## ✅ ALL ISSUES FIXED

---

## 1️⃣ Super Admin Permissions - FIXED ✅

**Issue:** Super admins only saw masajids they were members of

**Fix Applied:** Modified `getAllMasajids` controller to check super admin status

**Code Changes:**
```javascript
// src/controllers/masjidController.js
// Now checks if user is super admin
const user = await User.findByPk(req.userId);
const isSuperAdmin = user && user.is_super_admin;

if (!isSuperAdmin) {
  // Regular users see only their masajids
  whereClause.id = { [Op.in]: masjidIds };
} else {
  // Super admins see ALL masajids
  // No filter applied
}
```

**Endpoint:** `GET /api/v1/masajids`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Al-Noor Mosque",
      "location": "123 Main St",
      "city": "New York",
      "state": "NY",
      "country": "USA",
      "creator": {
        "id": "uuid",
        "name": "Admin Ahmed",
        "email": "admin@example.com"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalItems": 25,
    "totalPages": 3
  }
}
```

**Test:**
```bash
# Login as super admin
POST /api/v1/auth/login
{
  "email": "admin@example.com",
  "password": "Password123"
}

# Get all masajids (should see ALL, not just your own)
GET /api/v1/masajids
Authorization: Bearer {token}
```

---

## 2️⃣ Rate Limiting - FIXED ✅

**Issue:** Super admins hit rate limit (100 requests/15min) too quickly

**Fix Applied:** Super admins now bypass rate limiting completely

**Code Changes:**
- Created `src/middleware/rateLimitBypass.js`
- Updated `src/app.js` to check super admin status before rate limiting

**How It Works:**
1. Request comes in
2. Bypass middleware checks if user is super admin (via JWT)
3. If super admin: Set `req.skipRateLimit = true`
4. Rate limiter checks `skip` function, bypasses if flag is set
5. Regular users still get rate limited

**Benefits:**
- Super admins: Unlimited requests ✅
- Regular users: 100 requests per 15 minutes (protected)
- No more 429 errors for super admins

**Configuration:**
```env
# In .env file (optional)
RATE_LIMIT_WINDOW_MS=900000        # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100        # Max requests per window
```

---

## 3️⃣ Add Member to Masjid - FIXED (Documentation) ✅

**Endpoint:** `POST /api/v1/masajids/:masjidId/users`

### ✅ CORRECT Request Format:

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "role": "imam",
  "permissions": {
    "can_view_complaints": false,
    "can_answer_complaints": false,
    "can_view_questions": true,
    "can_answer_questions": true,
    "can_change_prayer_times": true,
    "can_create_events": false,
    "can_create_notifications": false
  }
}
```

### ❌ WRONG Request Formats (Will Cause 400 Error):

```json
// ❌ Wrong field name
{
  "user_id": "uuid",  // Should be "userId" (camelCase)
  "role": "Admin"
}

// ❌ Wrong role capitalization
{
  "userId": "uuid",
  "role": "Admin"  // Should be lowercase: "admin" or "imam"
}

// ❌ Wrong permissions format
{
  "userId": "uuid",
  "role": "imam",
  "permissions": ["can_view_questions", "can_answer_questions"]  // Should be object with booleans
}
```

### 📋 Field Specifications:

| Field | Type | Required | Valid Values | Notes |
|-------|------|----------|--------------|-------|
| `userId` | UUID String | ✅ Yes | Valid UUID | User must exist |
| `role` | String | ✅ Yes | `'imam'` or `'admin'` | **Lowercase only** |
| `permissions` | Object | ❌ Optional | See below | Defaults based on role if not provided |

### 🔑 Permissions Object (All Optional Booleans):

```typescript
{
  can_view_complaints: boolean,      // Default: false for imam, true for admin
  can_answer_complaints: boolean,    // Default: false for imam, true for admin
  can_view_questions: boolean,       // Default: true for both
  can_answer_questions: boolean,     // Default: true for both
  can_change_prayer_times: boolean,  // Default: true for both
  can_create_events: boolean,        // Default: true for both
  can_create_notifications: boolean  // Default: true for both
}
```

### ✅ Success Response:

```json
{
  "success": true,
  "data": {
    "id": "association-uuid",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "masjid_id": "masjid-uuid",
    "role": "imam",
    "can_view_complaints": false,
    "can_answer_complaints": false,
    "can_view_questions": true,
    "can_answer_questions": true,
    "can_change_prayer_times": true,
    "can_create_events": false,
    "can_create_notifications": false,
    "assigned_at": "2025-10-29T13:00:00.000Z"
  },
  "message": "User added to masjid successfully"
}
```

### ❌ Error Responses:

**400 - Validation Error:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "role",
      "message": "Role must be either imam or admin"
    }
  ]
}
```

**404 - User Not Found:**
```json
{
  "success": false,
  "message": "User not found"
}
```

**409 - User Already Member:**
```json
{
  "success": false,
  "message": "User is already a member of this masjid"
}
```

### 🧪 Example: Add Limited User

```json
POST /api/v1/masajids/{{masjid_id}}/users
Authorization: Bearer {{token}}

{
  "userId": "{{user_id}}",
  "role": "imam",
  "permissions": {
    "can_view_questions": true,
    "can_answer_questions": false,
    "can_change_prayer_times": false,
    "can_create_events": false,
    "can_create_notifications": false
  }
}
```

This creates a **read-only** user who can only VIEW questions.

---

## 4️⃣ Get All Questions Endpoint - ADDED ✅

**New Endpoint:** `GET /api/v1/questions`

**Access:** Super Admin only

**Description:** Get ALL questions across ALL masajids

### Request:

```http
GET /api/v1/questions?page=1&limit=20&status=new&search=prayer
Authorization: Bearer {super_admin_token}
```

### Query Parameters:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | Number | ❌ | Page number (default: 1) |
| `limit` | Number | ❌ | Items per page (default: 20) |
| `status` | String | ❌ | Filter by status: `'new'` or `'replied'` |
| `search` | String | ❌ | Search in title, question, or user name |
| `masjidId` | UUID | ❌ | Filter by specific masjid |

### Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "question-uuid",
      "title": "Question about Prayer Times",
      "question": "What time does Fajr start?",
      "user_name": "John Doe",
      "user_email": "john@example.com",
      "status": "new",
      "created_at": "2025-10-29T12:00:00.000Z",
      "masjid": {
        "id": "masjid-uuid",
        "name": "Al-Noor Mosque",
        "city": "New York",
        "state": "NY"
      },
      "replier": null
    },
    {
      "id": "question-uuid-2",
      "title": "Jummah Prayer",
      "question": "Is there Jummah this Friday?",
      "user_name": "Jane Smith",
      "user_email": "jane@example.com",
      "status": "replied",
      "reply": "Yes, Jummah is at 1:00 PM",
      "replied_at": "2025-10-29T13:00:00.000Z",
      "created_at": "2025-10-29T11:00:00.000Z",
      "masjid": {
        "id": "masjid-uuid",
        "name": "Al-Noor Mosque",
        "city": "New York",
        "state": "NY"
      },
      "replier": {
        "id": "user-uuid",
        "name": "Imam Ahmed",
        "email": "imam@example.com"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 45,
    "totalPages": 3
  },
  "message": "All questions retrieved successfully"
}
```

### Error Responses:

**403 - Not Super Admin:**
```json
{
  "success": false,
  "message": "Only super admins can access all questions"
}
```

### 🧪 Usage Examples:

```bash
# Get all questions
GET /api/v1/questions

# Get only NEW questions
GET /api/v1/questions?status=new

# Search questions
GET /api/v1/questions?search=prayer

# Filter by masjid
GET /api/v1/questions?masjidId={{masjid_id}}

# Combine filters
GET /api/v1/questions?status=new&masjidId={{masjid_id}}&page=1&limit=10
```

---

## 🚀 TESTING ALL FIXES

### Step 1: Restart Server
```bash
# Stop current server (Ctrl+C)
npm run dev
```

### Step 2: Login as Super Admin
```bash
POST http://localhost:5000/api/v1/auth/login

{
  "email": "admin@example.com",
  "password": "Password123"
}
```

### Step 3: Test Each Fix

#### ✅ Test Super Admin Masajids
```bash
GET http://localhost:5000/api/v1/masajids
Authorization: Bearer {token}

# Should return ALL masajids, not just your own
```

#### ✅ Test Rate Limiting Bypass
```bash
# Make 150+ requests quickly (more than the 100 limit)
# Super admin should NOT get 429 errors
# Regular users WILL get 429 after 100 requests

# Example: Loop in Postman or script
for i in {1..150}; do
  curl -H "Authorization: Bearer {super_admin_token}" \
       http://localhost:5000/api/v1/masajids
done
```

#### ✅ Test Add Member
```bash
POST http://localhost:5000/api/v1/masajids/{masjid_id}/users
Authorization: Bearer {token}

{
  "userId": "{user_uuid}",
  "role": "imam",
  "permissions": {
    "can_view_questions": true,
    "can_answer_questions": false
  }
}

# Should return 201 with member details
```

#### ✅ Test Get All Questions
```bash
GET http://localhost:5000/api/v1/questions?page=1&limit=10
Authorization: Bearer {super_admin_token}

# Should return questions from ALL masajids
```

---

## 📊 SUMMARY OF CHANGES

| File | Change | Status |
|------|--------|--------|
| `src/controllers/masjidController.js` | Added super admin check to `getAllMasajids` | ✅ Fixed |
| `src/middleware/rateLimitBypass.js` | New file - bypasses rate limit for super admins | ✅ Added |
| `src/app.js` | Updated rate limiter to use bypass middleware | ✅ Fixed |
| `src/controllers/questionController.js` | Added `getAllQuestions` for super admins | ✅ Added |
| `src/routes/questionRoutes.js` | Added `GET /questions` route | ✅ Added |
| `src/validators/masjidUserValidator.js` | Already correct - documented properly | ✅ Documented |

---

## 🎯 EXPECTED BEHAVIOR AFTER FIXES

### Super Admin:
- ✅ Sees ALL masajids (not just their own)
- ✅ Unlimited API requests (no rate limiting)
- ✅ Can view ALL questions across all masajids
- ✅ Can add members with granular permissions
- ✅ Full access to all super-admin endpoints

### Regular User:
- ✅ Sees only masajids they're member of
- ✅ Limited to 100 requests per 15 minutes
- ✅ Can only view questions from their masajids
- ✅ Permission-based access to features

---

## 🔒 SECURITY NOTES

1. **Rate Limiting Bypass** - Only authenticated super admins bypass rate limits
2. **Question Access** - Regular users cannot access `GET /questions` (403 error)
3. **Masjid Filtering** - Regular users automatically filtered by membership
4. **JWT Validation** - All endpoints validate tokens before checking super admin status

---

## 📝 NEED MORE HELP?

If you encounter any issues:

1. Check server logs for detailed error messages
2. Verify user has `is_super_admin = true` in database
3. Ensure JWT token is valid and not expired
4. Restart server after applying fixes
5. Test with Postman to see exact error responses

---

**All fixes applied and ready to test!** 🚀

