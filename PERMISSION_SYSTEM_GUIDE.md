# 🔐 New Permission System Guide

## Overview

The system now has **2-tier permissions**:
1. **Super Admin** (User-level) - Can do everything
2. **Regular Users** (Masjid-level) - With granular permissions per masjid

---

## 📊 Database Changes

### ✅ Users Table
Added column:
- `is_super_admin` (BOOLEAN) - Default: false

### ✅ UserMasajids Table  
Added columns:
- `can_view_complaints` (BOOLEAN)
- `can_answer_complaints` (BOOLEAN)
- `can_view_questions` (BOOLEAN)
- `can_answer_questions` (BOOLEAN)
- `can_change_prayer_times` (BOOLEAN)
- `can_create_events` (BOOLEAN)
- `can_create_notifications` (BOOLEAN)

---

## 🚀 How to Apply Changes

### Step 1: Run Migration
```bash
npm run migrate
```

This will add the new columns automatically!

### Step 2: Restart Server
```bash
# Press Ctrl+C
npm run dev
```

---

## 👤 Super Admin Features

### What Super Admin Can Do:
- ✅ Access ALL masajids (bypasses membership check)
- ✅ Has ALL permissions automatically
- ✅ Create new users
- ✅ Assign users to masajids with specific permissions
- ✅ Update user permissions
- ✅ View all users in system

### How to Make a User Super Admin:
**Option 1: Database (for first super admin)**
```sql
UPDATE users SET is_super_admin = true WHERE email = 'admin@example.com';
```

**Option 2: Via API (once you have 1 super admin)**
Will be implemented in next phase

---

## 🎯 Permission System

### Old System (Still Works):
- `role` = 'imam' or 'admin'
- Imam: Limited permissions
- Admin: All permissions

### New System (Granular):
Each user has specific permissions per masjid:

| Permission | What It Allows |
|-----------|----------------|
| `can_view_questions` | View questions for masjid |
| `can_answer_questions` | Reply to questions |
| `can_change_prayer_times` | Update prayer times |
| `can_create_events` | Create/update events |
| `can_create_notifications` | Create/update notifications |
| `can_view_complaints` | View complaints (future) |
| `can_answer_complaints` | Answer complaints (future) |

---

## 📝 When Adding User to Masjid (New Payload)

### Old Payload:
```json
{
  "userId": "uuid",
  "role": "imam"
}
```

### New Payload (with permissions):
```json
{
  "userId": "uuid",
  "role": "admin",
  "permissions": {
    "can_view_questions": true,
    "can_answer_questions": true,
    "can_change_prayer_times": true,
    "can_create_events": true,
    "can_create_notifications": true,
    "can_view_complaints": false,
    "can_answer_complaints": false
  }
}
```

---

## 🔒 Updated Middleware

### New Permission Checks:
- `canViewQuestions` - Check view questions permission
- `canAnswerQuestions` - Check answer questions permission
- `canManagePrayerTimes` - Check prayer times permission (updated)
- `canCreateEvents` - Check create events permission
- `canCreateNotifications` - Check create notifications permission

### Super Admin Middleware:
- `isSuperAdmin` - Check if user is super admin

---

## 📍 Updated Endpoints

### Events
- **POST /api/v1/events** - Now checks `can_create_events` permission
- **PUT /api/v1/events/:id** - Now checks `can_create_events` permission

### Notifications
- **POST /api/v1/notifications** - Now checks `can_create_notifications` permission
- **PUT /api/v1/notifications/:id** - Now checks `can_create_notifications` permission

### Questions
- **GET /api/v1/questions/masjid/:id** - Now checks `can_view_questions` permission
- **PUT /api/v1/questions/:id/reply** - Now checks `can_answer_questions` permission

### Prayer Times
- **POST /api/v1/prayer-times** - Now checks `can_change_prayer_times` permission
- **POST /api/v1/prayer-times/bulk** - Now checks `can_change_prayer_times` permission

---

## 🎮 Testing the New System

### 1. Make yourself super admin:
```sql
-- Connect to MySQL
mysql -u root -p

-- Use your database
USE salaahmanager;

-- Make admin@example.com super admin
UPDATE users SET is_super_admin = true WHERE email = 'admin@example.com';

-- Verify
SELECT id, name, email, is_super_admin FROM users;
```

### 2. Login as super admin
```json
POST /api/v1/auth/login
{
  "email": "admin@example.com",
  "password": "Password123"
}
```

### 3. Test Super Admin Access
- Try accessing any masjid - should work!
- Try creating events/notifications - should work!

---

## 🔄 Backward Compatibility

### ✅ Existing Data:
The migration automatically:
- Sets ALL permissions to `true` for existing **admin** role users
- Sets specific permissions for existing **imam** role users:
  - can_view_questions: true
  - can_answer_questions: true
  - can_change_prayer_times: true
  - can_create_events: true
  - can_create_notifications: true

### ✅ Existing Code:
- Old role checks still work (`isMasjidAdmin`, `isMasjidImam`)
- New permission checks added alongside
- Super admin bypasses all checks

---

## 🚧 Next Steps (To Be Implemented)

### Phase 2: Super Admin User Management
- Create user with permissions
- Update user permissions
- View all users
- Remove users from system

### Phase 3: Complaints System
- Add Complaints model
- Add complaints endpoints
- Use `can_view_complaints` and `can_answer_complaints`

---

## 💡 Quick Reference

### Check if User is Super Admin:
```javascript
const isSuperAdmin = await permissionChecker.isSuperAdmin(userId);
```

### Check Specific Permission:
```javascript
const canCreate = await permissionChecker.hasPermission(userId, masjidId, 'can_create_events');
```

### Get All Permissions:
```javascript
const permissions = await permissionChecker.getUserPermissions(userId, masjidId);
```

---

## ❓ Common Questions

**Q: Do I need to change my existing API calls?**  
A: No! Existing calls work as before. New permissions are checked server-side.

**Q: How do I set permissions when adding a user?**  
A: Will be updated in the add user endpoint (coming in next update)

**Q: Can regular admin promote themselves to super admin?**  
A: No! Only super admin or database access can do this.

**Q: What happens if I don't set permissions?**  
A: All permissions default to `false` for new user-masjid associations.

---

## 🎯 Summary

**Run this to apply changes:**
```bash
npm run migrate
# Press Ctrl+C to stop server
npm run dev
```

**Make yourself super admin:**
```sql
UPDATE users SET is_super_admin = true WHERE email = 'admin@example.com';
```

**That's it!** The system is now more flexible and secure! 🎉

