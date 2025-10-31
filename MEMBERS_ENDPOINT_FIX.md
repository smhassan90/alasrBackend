# 🔧 Get Masjid Members Endpoint - FIXED

## ✅ Issues Fixed

### 1️⃣ Response Format Updated
**Problem:** Response didn't include permissions data

**Fixed:** Now returns complete member information with all permissions

### 2️⃣ Database Connection Pool Exhaustion  
**Problem:** `ECONNRESET` errors due to small connection pool (max: 5)

**Fixed:** Increased pool size and improved connection handling

---

## 📋 ENDPOINT DETAILS

### **Endpoint:**
```
GET /api/v1/masajids/{masjidId}/members
```

### **Access:**
- ✅ Super Admin: Can view any masjid's members
- ✅ Masjid Members: Can view their own masjid's members
- ❌ Non-members: 403 Forbidden

### **Headers:**
```http
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

---

## ✅ SUCCESS RESPONSE

```json
{
  "success": true,
  "data": {
    "members": [
      {
        "id": "user-masjid-association-uuid",
        "user_id": "user-uuid",
        "user_name": "John Doe",
        "user_email": "john@example.com",
        "user_phone": "+1234567890",
        "user_profile_picture": "path/to/image.jpg",
        "user_is_active": true,
        "role": "admin",
        "permissions": {
          "can_view_complaints": true,
          "can_answer_complaints": true,
          "can_view_questions": true,
          "can_answer_questions": true,
          "can_change_prayer_times": true,
          "can_create_events": true,
          "can_create_notifications": true
        },
        "assigned_at": "2025-10-29T10:00:00.000Z",
        "is_default": false
      },
      {
        "id": "another-association-uuid",
        "user_id": "another-user-uuid",
        "user_name": "Jane Smith",
        "user_email": "jane@example.com",
        "user_phone": "+9876543210",
        "user_profile_picture": null,
        "user_is_active": true,
        "role": "imam",
        "permissions": {
          "can_view_complaints": false,
          "can_answer_complaints": false,
          "can_view_questions": true,
          "can_answer_questions": true,
          "can_change_prayer_times": true,
          "can_create_events": false,
          "can_create_notifications": false
        },
        "assigned_at": "2025-10-29T11:00:00.000Z",
        "is_default": true
      }
    ],
    "admins": [
      {
        "id": "user-masjid-association-uuid",
        "user_id": "user-uuid",
        "user_name": "John Doe",
        "user_email": "john@example.com",
        "user_phone": "+1234567890",
        "user_profile_picture": "path/to/image.jpg",
        "user_is_active": true,
        "role": "admin",
        "permissions": { ... },
        "assigned_at": "2025-10-29T10:00:00.000Z",
        "is_default": false
      }
    ],
    "imams": [
      {
        "id": "another-association-uuid",
        "user_id": "another-user-uuid",
        "user_name": "Jane Smith",
        "user_email": "jane@example.com",
        "user_phone": "+9876543210",
        "user_profile_picture": null,
        "user_is_active": true,
        "role": "imam",
        "permissions": { ... },
        "assigned_at": "2025-10-29T11:00:00.000Z",
        "is_default": true
      }
    ],
    "totalMembers": 2
  },
  "message": "Members retrieved successfully"
}
```

---

## ❌ ERROR RESPONSES

### **404 - Masjid Not Found:**
```json
{
  "success": false,
  "message": "Masjid not found"
}
```

### **403 - Permission Denied:**
```json
{
  "success": false,
  "message": "You do not have permission to access this masjid"
}
```

### **401 - Unauthorized:**
```json
{
  "success": false,
  "message": "Authentication required"
}
```

---

## 🔧 DATABASE CONNECTION FIXES

### **Previous Configuration:**
```javascript
pool: {
  max: 5,        // Too small!
  min: 0,
  acquire: 30000,
  idle: 10000
}
```

### **New Configuration:**
```javascript
pool: {
  max: 20,             // Increased to handle more requests
  min: 2,              // Keep connections ready
  acquire: 60000,      // Longer timeout (60 seconds)
  idle: 10000,         // Close idle after 10 seconds
  evict: 1000,         // Check for idle every second
  handleDisconnects: true  // Auto-reconnect
}
dialectOptions: {
  connectTimeout: 60000,  // 60 second connection timeout
  supportBigNumbers: true,
  bigNumberStrings: true
}
```

### **Why This Fixes ECONNRESET:**
1. **More Connections:** 20 max connections (was 5)
2. **Longer Timeouts:** 60 seconds (was 30)
3. **Auto Reconnect:** Handles disconnects automatically
4. **Minimum Pool:** Keeps 2 connections ready
5. **Proper Eviction:** Cleans up idle connections

---

## 🧪 TESTING

### **Test 1: Get Members for Masjid**
```http
GET http://localhost:5000/api/v1/masajids/6ca29fac-f6b8-4dab-bbeb-2bcf5254bd7d/members
Authorization: Bearer {{access_token}}
```

**Expected:**
- ✅ Returns all members with permissions
- ✅ Grouped by role (admins, imams)
- ✅ Includes user details (name, email, phone)
- ✅ No ECONNRESET errors

### **Test 2: Super Admin Access**
```http
# Login as super admin
POST http://localhost:5000/api/v1/auth/login
{
  "email": "admin@example.com",
  "password": "Password123"
}

# Access ANY masjid's members (even if not a member)
GET http://localhost:5000/api/v1/masajids/{any_masjid_id}/members
Authorization: Bearer {super_admin_token}
```

**Expected:**
- ✅ Super admin can view ANY masjid's members
- ✅ Regular user can only view their masjid's members

---

## 📊 RESPONSE STRUCTURE

### **Frontend Can Access:**

```typescript
// TypeScript interface
interface MemberResponse {
  success: boolean;
  data: {
    members: Member[];     // All members (flat array)
    admins: Member[];      // Filtered admins
    imams: Member[];       // Filtered imams
    totalMembers: number;  // Total count
  };
  message: string;
}

interface Member {
  id: string;                    // UserMasjid association ID
  user_id: string;               // User's ID
  user_name: string;             // User's name
  user_email: string;            // User's email
  user_phone: string | null;     // User's phone
  user_profile_picture: string | null;
  user_is_active: boolean;       // User account active?
  role: 'admin' | 'imam';        // Role in this masjid
  permissions: {
    can_view_complaints: boolean;
    can_answer_complaints: boolean;
    can_view_questions: boolean;
    can_answer_questions: boolean;
    can_change_prayer_times: boolean;
    can_create_events: boolean;
    can_create_notifications: boolean;
  };
  assigned_at: string;           // ISO date string
  is_default: boolean;           // Is this user's default masjid?
}
```

### **Usage in Frontend:**

```typescript
// Fetch members
const response = await axios.get(`/api/v1/masajids/${masjidId}/members`);

// Access all members
const allMembers = response.data.data.members;

// Access only admins
const admins = response.data.data.admins;

// Access only imams
const imams = response.data.data.imams;

// Get total count
const total = response.data.data.totalMembers;

// Check specific permission
const canCreateEvents = allMembers[0].permissions.can_create_events;
```

---

## 🚀 DEPLOYMENT STEPS

### **1. Restart Server (REQUIRED):**
```bash
# Stop server
Ctrl+C

# Restart
npm run dev
```

**Why restart?** New database pool configuration only loads on startup.

### **2. Verify Connection Pool:**

Check server logs on startup:
```
✅ Database connection established successfully
```

### **3. Test Endpoint:**
```bash
GET http://localhost:5000/api/v1/masajids/{masjid_id}/members
```

### **4. Monitor for ECONNRESET:**

Watch server logs:
- ❌ Before: `error: Get all masajids error: read ECONNRESET`
- ✅ After: No ECONNRESET errors

---

## 🔍 TROUBLESHOOTING

### **Still Getting ECONNRESET?**

1. **Check MySQL max_connections:**
```sql
mysql> SHOW VARIABLES LIKE 'max_connections';
-- Should be at least 100
```

2. **Increase MySQL max_connections if needed:**
```sql
mysql> SET GLOBAL max_connections = 200;
```

3. **Restart MySQL server** (if you changed max_connections)

### **Empty Members Array?**

1. **Verify masjid has members:**
```sql
SELECT * FROM user_masajids WHERE masjid_id = 'your-masjid-id';
```

2. **Check masjid exists:**
```sql
SELECT * FROM masajids WHERE id = 'your-masjid-id';
```

### **403 Forbidden?**

1. **Verify user is super admin or member:**
```sql
-- Check if super admin
SELECT is_super_admin FROM users WHERE id = 'your-user-id';

-- Check if member
SELECT * FROM user_masajids WHERE user_id = 'your-user-id' AND masjid_id = 'masjid-id';
```

---

## 📝 SUMMARY OF CHANGES

| File | Change | Status |
|------|--------|--------|
| `src/controllers/masjidController.js` | Updated `getMasjidMembers` to include permissions | ✅ Fixed |
| `src/config/database.js` | Increased connection pool from 5 to 20 | ✅ Fixed |
| `src/config/database.js` | Added connection timeout handling | ✅ Fixed |
| `src/config/database.js` | Added auto-reconnect on disconnect | ✅ Fixed |

---

## ✅ VERIFICATION CHECKLIST

- [ ] Server restarted
- [ ] No ECONNRESET errors in logs
- [ ] GET /masajids/{id}/members returns 200
- [ ] Response includes `permissions` object
- [ ] Response includes `members`, `admins`, `imams` arrays
- [ ] Super admin can access any masjid's members
- [ ] Regular user can only access their masjid's members

---

**All fixes applied! Restart your server and test the endpoint.** 🚀

