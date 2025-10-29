# 🚀 Quick Start - New Permission System

## Step 1: Apply Database Changes

```bash
# Run the new migration
npm run migrate

# Restart server
# Press Ctrl+C to stop
npm run dev
```

---

## Step 2: Make Yourself Super Admin

```sql
-- Connect to MySQL
mysql -u root -p

-- Use your database
USE salaahmanager;

-- Make admin@example.com a super admin
UPDATE users SET is_super_admin = true WHERE email = 'admin@example.com';

-- Verify
SELECT id, name, email, is_super_admin FROM users;

-- Exit
exit;
```

---

## Step 3: Import New Postman Collection

1. Open **Postman**
2. Click **Import**
3. Select `POSTMAN_COLLECTION_V2_WITH_PERMISSIONS.json`
4. Click **Import**

---

## Step 4: Test the New System

### ✅ Test 1: Login as Super Admin

**Endpoint:** `1.2 Login as Super Admin`

```json
{
  "email": "admin@example.com",
  "password": "Password123"
}
```

Token will auto-save! ✅

---

### ✅ Test 2: Create a Masjid

**Endpoint:** `3.1 Create Masjid`

You'll automatically become admin with ALL permissions!

---

### ✅ Test 3: Add User with Custom Permissions

**Endpoint:** `4.1 Add User with Custom Permissions`

**Before running:** Get a second user ID:
1. Register another user or use `imam@example.com`
2. Copy their user ID
3. Set it in Postman variables as `second_user_id`

**Payload:**
```json
{
  "userId": "user-uuid-here",
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

This user can:
- ✅ View and answer questions
- ✅ Change prayer times
- ❌ Create events
- ❌ Create notifications

---

### ✅ Test 4: Test Permissions

**A. Login as the limited user**  
**B. Try to create an event**  
**Expected:** `403 Forbidden - You do not have permission to create events`

**C. Try to answer a question**  
**Expected:** `200 OK - Success!`

---

## 📋 Permission Matrix

| Permission | What It Allows |
|-----------|----------------|
| `can_view_questions` | View questions submitted to masjid |
| `can_answer_questions` | Reply to questions |
| `can_change_prayer_times` | Update prayer times |
| `can_create_events` | Create/update events |
| `can_create_notifications` | Create/update notifications |
| `can_view_complaints` | View complaints (future) |
| `can_answer_complaints` | Answer complaints (future) |

---

## 🎯 Common Scenarios

### Scenario 1: Add Full Admin
```json
{
  "userId": "uuid",
  "role": "admin"
}
```
All permissions automatically set to `true`

---

### Scenario 2: Add Read-Only User
```json
{
  "userId": "uuid",
  "role": "imam",
  "permissions": {
    "can_view_complaints": false,
    "can_answer_complaints": false,
    "can_view_questions": true,
    "can_answer_questions": false,
    "can_change_prayer_times": false,
    "can_create_events": false,
    "can_create_notifications": false
  }
}
```
Can only VIEW questions, nothing else

---

### Scenario 3: Add Event Manager
```json
{
  "userId": "uuid",
  "role": "imam",
  "permissions": {
    "can_view_complaints": false,
    "can_answer_complaints": false,
    "can_view_questions": false,
    "can_answer_questions": false,
    "can_change_prayer_times": false,
    "can_create_events": true,
    "can_create_notifications": true
  }
}
```
Can only manage events and notifications

---

## 🔒 Super Admin Powers

Super Admin **bypasses ALL permission checks**:
- ✅ Access ANY masjid (even if not a member)
- ✅ ALL permissions automatically granted
- ✅ Can perform any action

**To test:** Login as super admin → Access any masjid → All operations work!

---

## 📝 New Response Formats

### Events & Notifications Now Include Creator:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Event Name",
    "creator": {
      "id": "uuid",
      "name": "Admin Ahmed",
      "email": "admin@example.com"
    }
  }
}
```

### Add User Response Shows Permissions:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "masjid_id": "uuid",
    "role": "imam",
    "can_view_questions": true,
    "can_answer_questions": true,
    "can_change_prayer_times": true,
    "can_create_events": false,
    "can_create_notifications": false
  }
}
```

---

## ⚠️ Important Notes

1. **Backward Compatible:** Old API calls still work
2. **Default Permissions:** If you don't specify permissions, smart defaults are used based on role
3. **Super Admin Only:** Only super admin or database can create super admins
4. **Creator Gets All:** When you create a masjid, you automatically get ALL permissions

---

## 🐛 Troubleshooting

**"Permission denied" error?**
→ Check user's permissions for that masjid

**"Forbidden" on all requests?**
→ Login again, token might be expired

**Can't create events?**
→ Check `can_create_events` permission for that user-masjid

**Super admin not working?**
→ Verify in database: `SELECT is_super_admin FROM users WHERE id = 'your-id';`

---

## 📞 Quick Commands

```bash
# Run migration
npm run migrate

# Restart server
npm run dev

# Make user super admin (SQL)
UPDATE users SET is_super_admin = true WHERE email = 'admin@example.com';

# Check user permissions (SQL)
SELECT * FROM user_masajids WHERE user_id = 'uuid';
```

---

## ✅ Testing Checklist

- [ ] Migration ran successfully
- [ ] Made yourself super admin
- [ ] Imported new Postman collection
- [ ] Logged in as super admin
- [ ] Created a masjid
- [ ] Added user with custom permissions
- [ ] Tested permission restrictions
- [ ] Verified events show creator info
- [ ] Verified notifications show creator info

---

**You're all set!** 🎉

Read `PERMISSION_SYSTEM_GUIDE.md` for complete technical details.

