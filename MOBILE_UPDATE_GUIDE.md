# Mobile App Update Guide - Prayer Time Notifications

## Overview
This guide outlines the changes needed on the mobile side to support the new prayer time notification feature.

---

## 1. Device Registration Endpoint (NEW)

### Endpoint
```
POST /api/v1/subscriptions/register-device
```

### Purpose
Register/update device FCM token for push notifications. This should be called:
- When the app first launches
- When the FCM token is refreshed
- After user login (to associate device with user)

### Request Body
```json
{
  "deviceId": "644b6e84-bcbb-4038-859b-6e4059330fce",
  "fcmToken": "eCDdzNIPSKuxW6oWi7YMYs:APA91bGa5dritoR6NJ1B4IMUQTJ6BkF0MveUK2m_Nt7ic0kS0NWlw-trUd5o33d2amrtWRJNIpR9sFVSZEjDny9TBZ23XKlDUfqO25ofwZfKSWHR0l-Ncrc"
}
```

### Response
```json
{
  "success": true,
  "message": "Device registered successfully",
  "data": {
    "deviceId": "644b6e84-bcbb-4038-859b-6e4059330fce",
    "subscriptionsUpdated": 0
  }
}
```

### Implementation Notes
- Call this endpoint whenever the FCM token changes
- No authentication required (works for anonymous users)
- Updates FCM tokens for all existing subscriptions for this device

---

## 2. Prayer Time API Updates

### New Field: `notifyUsers`

All prayer time create/update endpoints now accept an optional `notifyUsers` boolean field:

#### Create/Update Single Prayer Time
```
POST /api/v1/prayer-times
PUT /api/v1/prayer-times/:id
```

**Request Body (updated):**
```json
{
  "masjidId": "uuid",
  "prayerName": "Fajr",
  "prayerTime": "05:30",
  "effectiveDate": "2025-02-03",
  "notifyUsers": true  // NEW: Optional boolean
}
```

#### Bulk Update Prayer Times
```
POST /api/v1/prayer-times/bulk
```

**Request Body (updated):**
```json
{
  "masjidId": "uuid",
  "prayerTimes": [
    { "prayerName": "Fajr", "prayerTime": "05:30" },
    { "prayerName": "Dhuhr", "prayerTime": "12:30" }
  ],
  "effectiveDate": "2025-02-03",
  "notifyUsers": true  // NEW: Optional boolean
}
```

### Response
The response now includes the `notify_users` field:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "masjid_id": "uuid",
    "prayer_name": "Fajr",
    "prayer_time": "05:30",
    "effective_date": "2025-02-03",
    "notify_users": true,  // NEW field
    "updated_by": "uuid",
    "created_at": "2025-02-03T00:00:00.000Z",
    "updated_at": "2025-02-03T00:00:00.000Z"
  }
}
```

---

## 3. Push Notification Handling

### New Notification Types

The app will now receive two new notification types:

#### A. Prayer Time Update (`prayer_time_update`)
Sent when a single prayer time is updated and `notifyUsers` is `true`.

**Notification Data:**
```json
{
  "type": "prayer_time_update",
  "masjidId": "uuid",
  "masjidName": "Masjid Al-Haram",
  "prayerName": "Fajr",
  "prayerTime": "05:30",
  "effectiveDate": "2025-02-03",
  "category": "Prayer Times"
}
```

**Notification Display:**
- **Title:** `Prayer Time Updated - {masjidName}`
- **Body:** `{prayerName} prayer time has been updated to {prayerTime}`

#### B. Prayer Time Bulk Update (`prayer_time_bulk_update`)
Sent when multiple prayer times are updated in bulk and `notifyUsers` is `true`.

**Notification Data:**
```json
{
  "type": "prayer_time_bulk_update",
  "masjidId": "uuid",
  "masjidName": "Masjid Al-Haram",
  "category": "Prayer Times",
  "prayerTimesCount": "6"
}
```

**Notification Display:**
- **Title:** `Prayer Times Updated - {masjidName}`
- **Body:** `Prayer times have been updated for {masjidName}`

### Existing Notification Type
The existing `masjid_notification` type remains unchanged.

---

## 4. Mobile App Implementation Checklist

### ✅ Required Changes

1. **Device Registration**
   - [ ] Call `/api/v1/subscriptions/register-device` on app launch
   - [ ] Call when FCM token is refreshed
   - [ ] Store `deviceId` persistently (UUID format)
   - [ ] Handle registration errors gracefully

2. **Prayer Time UI Updates**
   - [ ] Add "Notify Users" checkbox/toggle to prayer time update forms
   - [ ] Include `notifyUsers` field in API requests when checkbox is checked
   - [ ] Display `notify_users` field in prayer time response models

3. **Push Notification Handling**
   - [ ] Handle `prayer_time_update` notification type
   - [ ] Handle `prayer_time_bulk_update` notification type
   - [ ] Navigate to prayer times screen when notification is tapped
   - [ ] Refresh prayer times data when notification is received
   - [ ] Show appropriate UI feedback (e.g., "Prayer times updated")

4. **Notification Deep Linking** (Recommended)
   - [ ] Deep link to masjid prayer times screen when notification is tapped
   - [ ] Pass `masjidId` from notification data to navigation
   - [ ] Highlight the updated prayer time if possible

### 📱 Example Implementation

#### Swift (iOS)
```swift
// Handle prayer time update notification
func handlePrayerTimeUpdate(data: [String: Any]) {
    guard let masjidId = data["masjidId"] as? String,
          let prayerName = data["prayerName"] as? String,
          let prayerTime = data["prayerTime"] as? String else {
        return
    }
    
    // Navigate to prayer times screen
    navigateToPrayerTimes(masjidId: masjidId)
    
    // Refresh prayer times
    refreshPrayerTimes(for: masjidId)
    
    // Show toast/alert
    showToast("\(prayerName) prayer time updated to \(prayerTime)")
}
```

#### Kotlin (Android)
```kotlin
// Handle prayer time update notification
fun handlePrayerTimeUpdate(data: Map<String, String>) {
    val masjidId = data["masjidId"] ?: return
    val prayerName = data["prayerName"] ?: return
    val prayerTime = data["prayerTime"] ?: return
    
    // Navigate to prayer times screen
    navigateToPrayerTimes(masjidId)
    
    // Refresh prayer times
    refreshPrayerTimes(masjidId)
    
    // Show toast
    showToast("$prayerName prayer time updated to $prayerTime")
}
```

---

## 5. Testing Checklist

### Device Registration
- [ ] Test device registration on app launch
- [ ] Test device registration when FCM token changes
- [ ] Test device registration for anonymous users
- [ ] Test device registration for authenticated users
- [ ] Verify error handling for network failures

### Prayer Time Updates
- [ ] Test creating prayer time with `notifyUsers: true`
- [ ] Test creating prayer time with `notifyUsers: false`
- [ ] Test updating prayer time with `notifyUsers: true`
- [ ] Test bulk update with `notifyUsers: true`
- [ ] Verify notifications are received when `notifyUsers: true`
- [ ] Verify notifications are NOT received when `notifyUsers: false`

### Push Notifications
- [ ] Test receiving `prayer_time_update` notification
- [ ] Test receiving `prayer_time_bulk_update` notification
- [ ] Test notification tap navigation
- [ ] Test notification when app is in foreground
- [ ] Test notification when app is in background
- [ ] Test notification when app is closed
- [ ] Verify notification data parsing

### User Settings
- [ ] Test that users with `prayer_times_notifications: false` don't receive notifications
- [ ] Test that users with `prayer_times_notifications: true` receive notifications
- [ ] Test anonymous users (device_id only) receive notifications

---

## 6. Backward Compatibility

### ✅ Backward Compatible
- All new fields are **optional**
- Existing API calls without `notifyUsers` will work (defaults to `false`)
- Existing notification handling remains unchanged
- No breaking changes to existing endpoints

### ⚠️ Breaking Changes
- None

---

## 7. API Endpoints Summary

### New Endpoint
- `POST /api/v1/subscriptions/register-device` - Register device with FCM token

### Updated Endpoints
- `POST /api/v1/prayer-times` - Now accepts `notifyUsers` field
- `PUT /api/v1/prayer-times/:id` - Now accepts `notifyUsers` field
- `POST /api/v1/prayer-times/bulk` - Now accepts `notifyUsers` field

### Unchanged Endpoints
- All other endpoints remain unchanged

---

## 8. Support

If you encounter any issues or have questions:
1. Check the API response for error messages
2. Verify FCM token is valid and registered
3. Ensure device is subscribed to masjid with category "Prayer Times"
4. Verify user has `prayer_times_notifications` enabled in settings (for authenticated users)

---

## Notes

- All notification data values are sent as strings (FCM requirement)
- Notifications are sent asynchronously (don't block the API response)
- Invalid FCM tokens are automatically deactivated
- Anonymous users (device_id only) will receive notifications if subscribed

