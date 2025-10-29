# SalaahManager API

A production-ready REST API for managing Islamic prayer times, masjid operations, and community engagement. Built with Node.js, Express.js, and MySQL.

## 🌟 Features

- **Multi-User Support**: One masjid can have multiple imams and admins
- **Role-Based Access Control**: Distinct permissions for imam and admin roles
- **JWT Authentication**: Secure token-based authentication with refresh tokens
- **Prayer Times Management**: Create and manage daily prayer schedules
- **Questions & Answers**: Community members can submit questions to imams
- **Events Management**: Create and manage masjid events
- **Notifications System**: Send announcements to community members
- **User Settings**: Customizable notification preferences
- **File Upload**: Profile picture management
- **Email Notifications**: Automated emails for important actions
- **Pagination & Search**: Efficient data retrieval
- **Rate Limiting**: Protection against abuse
- **Security**: Helmet.js, CORS, input validation, and sanitization

## 📋 Prerequisites

- Node.js >= 14.x
- MySQL >= 5.7
- npm or yarn

## 🚀 Quick Start

### 1. Clone the repository

```bash
git clone <repository-url>
cd salaahmanager-api
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=salaahmanager
DB_USER=root
DB_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key
JWT_REFRESH_SECRET=your_super_secret_refresh_key

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_email_password
```

### 4. Create database

```bash
mysql -u root -p
CREATE DATABASE salaahmanager;
exit;
```

### 5. Run migrations

```bash
npm run migrate
```

### 6. Seed database (optional)

```bash
npm run seed
```

This creates sample data including:
- 4 users (admin@example.com, imam@example.com, ali@example.com, fatima@example.com)
- 2 masajids
- Prayer times
- Sample questions, events, and notifications
- Default password for all users: `Password123`

### 7. Start the server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The API will be available at `http://localhost:5000/api/v1`

## 📚 API Documentation

### Base URL

```
http://localhost:5000/api/v1
```

### Authentication

Most endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

---

## 🔐 Authentication Endpoints

### Register

```http
POST /api/v1/auth/register
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "Password123",
  "phone": "+1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890"
    },
    "accessToken": "jwt_token",
    "refreshToken": "refresh_token"
  }
}
```

### Login

```http
POST /api/v1/auth/login
```

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "Password123"
}
```

### Refresh Token

```http
POST /api/v1/auth/refresh-token
```

**Request Body:**
```json
{
  "refreshToken": "your_refresh_token"
}
```

### Forgot Password

```http
POST /api/v1/auth/forgot-password
```

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

### Reset Password

```http
POST /api/v1/auth/reset-password
```

**Request Body:**
```json
{
  "token": "reset_token",
  "password": "NewPassword123",
  "confirmPassword": "NewPassword123"
}
```

---

## 👤 User Endpoints

### Get Profile

```http
GET /api/v1/users/profile
```

### Update Profile

```http
PUT /api/v1/users/profile
```

**Request Body:**
```json
{
  "name": "John Updated",
  "phone": "+9876543210"
}
```

### Upload Profile Picture

```http
POST /api/v1/users/profile/picture
Content-Type: multipart/form-data
```

**Form Data:**
- `profile_picture`: Image file (JPG, JPEG, PNG, max 5MB)

### Delete Profile Picture

```http
DELETE /api/v1/users/profile/picture
```

### Change Password

```http
POST /api/v1/users/change-password
```

**Request Body:**
```json
{
  "currentPassword": "Password123",
  "newPassword": "NewPassword123",
  "confirmPassword": "NewPassword123"
}
```

### Get User Settings

```http
GET /api/v1/users/settings
```

### Update User Settings

```http
PUT /api/v1/users/settings
```

**Request Body:**
```json
{
  "prayer_times_notifications": true,
  "events_notifications": true,
  "donations_notifications": false,
  "general_notifications": true,
  "questions_notifications": true
}
```

### Get User Masajids

```http
GET /api/v1/users/masajids
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "masjidId": "uuid",
      "name": "Masjid Al-Noor",
      "location": "Downtown",
      "roles": ["admin", "imam"],
      "isDefault": true
    }
  ]
}
```

---

## 🕌 Masjid Endpoints

### Get All Masajids

```http
GET /api/v1/masajids?page=1&limit=10&search=keyword
```

### Get Masjid By ID

```http
GET /api/v1/masajids/:id
```

### Create Masjid

```http
POST /api/v1/masajids
```

**Request Body:**
```json
{
  "name": "Masjid Al-Noor",
  "location": "Downtown Area",
  "address": "123 Main Street",
  "city": "New York",
  "state": "NY",
  "country": "USA",
  "postal_code": "10001",
  "contact_email": "contact@alnoor.com",
  "contact_phone": "+1234567890"
}
```

**Note:** Creator automatically becomes the first admin.

### Update Masjid

```http
PUT /api/v1/masajids/:id
```

**Permission:** Admin only

### Delete Masjid (Soft Delete)

```http
DELETE /api/v1/masajids/:id
```

**Permission:** Admin only

### Set Default Masjid

```http
PUT /api/v1/masajids/:id/set-default
```

### Get Masjid Statistics

```http
GET /api/v1/masajids/:id/statistics
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalQuestions": 50,
    "newQuestions": 5,
    "totalEvents": 10,
    "totalMembers": 8
  }
}
```

### Get Masjid Members

```http
GET /api/v1/masajids/:id/members
```

**Response:**
```json
{
  "success": true,
  "data": {
    "imams": [
      {
        "id": "uuid",
        "name": "Imam Muhammad",
        "email": "imam@example.com",
        "assignedAt": "2025-01-15T10:00:00Z"
      }
    ],
    "admins": [
      {
        "id": "uuid",
        "name": "Admin Ahmed",
        "email": "admin@example.com",
        "assignedAt": "2025-01-15T10:00:00Z"
      }
    ],
    "totalMembers": 5
  }
}
```

---

## 👥 Masjid User Management Endpoints

### Add User to Masjid

```http
POST /api/v1/masajids/:id/users
```

**Permission:** Admin only

**Request Body:**
```json
{
  "userId": "user_uuid",
  "role": "imam"
}
```

**Role:** `imam` or `admin`

### Remove User from Masjid

```http
DELETE /api/v1/masajids/:id/users/:userId
```

**Permission:** Admin only

**Note:** Cannot remove yourself or the last admin.

### Update User Role

```http
PUT /api/v1/masajids/:id/users/:userId/role
```

**Permission:** Admin only

**Request Body:**
```json
{
  "role": "admin"
}
```

### Get Imams

```http
GET /api/v1/masajids/:id/imams
```

### Get Admins

```http
GET /api/v1/masajids/:id/admins
```

### Transfer Ownership

```http
POST /api/v1/masajids/:id/transfer-ownership
```

**Permission:** Admin only

**Request Body:**
```json
{
  "newAdminId": "user_uuid"
}
```

---

## 🕌 Prayer Times Endpoints

### Get Prayer Times for Masjid

```http
GET /api/v1/prayer-times/masjid/:masjidId?effectiveDate=2025-01-15
```

**Permission:** Member of masjid

### Get Today's Prayer Times

```http
GET /api/v1/prayer-times/masjid/:masjidId/today
```

**Permission:** Public (or authenticated)

### Create/Update Prayer Time

```http
POST /api/v1/prayer-times
```

**Permission:** Imam or Admin

**Request Body:**
```json
{
  "masjidId": "masjid_uuid",
  "prayerName": "Fajr",
  "prayerTime": "05:30",
  "effectiveDate": "2025-01-15"
}
```

**Prayer Names:** `Fajr`, `Dhuhr`, `Asr`, `Maghrib`, `Isha`

### Bulk Update Prayer Times

```http
POST /api/v1/prayer-times/bulk
```

**Permission:** Imam or Admin

**Request Body:**
```json
{
  "masjidId": "masjid_uuid",
  "effectiveDate": "2025-01-15",
  "prayerTimes": [
    { "prayerName": "Fajr", "prayerTime": "05:30" },
    { "prayerName": "Dhuhr", "prayerTime": "12:30" },
    { "prayerName": "Asr", "prayerTime": "15:45" },
    { "prayerName": "Maghrib", "prayerTime": "18:15" },
    { "prayerName": "Isha", "prayerTime": "19:30" }
  ]
}
```

### Update Specific Prayer Time

```http
PUT /api/v1/prayer-times/:id
```

**Permission:** Imam or Admin

### Delete Prayer Time

```http
DELETE /api/v1/prayer-times/:id
```

**Permission:** Admin only

---

## ❓ Questions Endpoints

### Get Questions for Masjid

```http
GET /api/v1/questions/masjid/:masjidId?page=1&limit=10&status=new&search=keyword
```

**Permission:** Member of masjid

### Get Single Question

```http
GET /api/v1/questions/:id
```

### Submit Question (Public)

```http
POST /api/v1/questions
```

**Permission:** Public (no auth required)

**Request Body:**
```json
{
  "masjidId": "masjid_uuid",
  "userName": "Abdullah",
  "userEmail": "abdullah@example.com",
  "title": "Question about Friday Prayer",
  "question": "What time does Jummah prayer start?"
}
```

### Reply to Question

```http
PUT /api/v1/questions/:id/reply
```

**Permission:** Imam or Admin

**Request Body:**
```json
{
  "reply": "Jummah prayer starts at 1:00 PM every Friday."
}
```

**Note:** Email notification sent to user if email provided.

### Update Question Status

```http
PUT /api/v1/questions/:id/status
```

**Permission:** Imam or Admin

**Request Body:**
```json
{
  "status": "replied"
}
```

### Delete Question

```http
DELETE /api/v1/questions/:id
```

**Permission:** Admin only

### Get Question Statistics

```http
GET /api/v1/questions/masjid/:masjidId/statistics
```

---

## 📢 Notifications Endpoints

### Get Notifications for Masjid

```http
GET /api/v1/notifications/masjid/:masjidId?page=1&limit=10&category=General
```

**Permission:** Member of masjid

### Get Recent Notifications

```http
GET /api/v1/notifications/masjid/:masjidId/recent
```

### Get Single Notification

```http
GET /api/v1/notifications/:id
```

### Create Notification

```http
POST /api/v1/notifications
```

**Permission:** Imam or Admin

**Request Body:**
```json
{
  "masjidId": "masjid_uuid",
  "title": "Ramadan Prayer Times",
  "description": "Updated prayer times for Ramadan",
  "category": "Prayer Times"
}
```

**Categories:** `Prayer Times`, `Donations`, `Events`, `General`

### Update Notification

```http
PUT /api/v1/notifications/:id
```

**Permission:** Admin only

### Delete Notification

```http
DELETE /api/v1/notifications/:id
```

**Permission:** Admin only

---

## 📅 Events Endpoints

### Get Events for Masjid

```http
GET /api/v1/events/masjid/:masjidId?page=1&limit=10&search=keyword
```

**Permission:** Member of masjid

### Get Upcoming Events

```http
GET /api/v1/events/masjid/:masjidId/upcoming
```

### Get Past Events

```http
GET /api/v1/events/masjid/:masjidId/past?page=1&limit=10
```

### Get Single Event

```http
GET /api/v1/events/:id
```

### Create Event

```http
POST /api/v1/events
```

**Permission:** Imam or Admin

**Request Body:**
```json
{
  "masjidId": "masjid_uuid",
  "name": "Islamic Study Circle",
  "description": "Weekly study circle on Tafsir and Hadith",
  "eventDate": "2025-02-15",
  "eventTime": "19:00",
  "location": "Main Prayer Hall"
}
```

### Update Event

```http
PUT /api/v1/events/:id
```

**Permission:** Imam or Admin

### Delete Event

```http
DELETE /api/v1/events/:id
```

**Permission:** Admin only

---

## 🔒 Permissions Summary

### Imam Permissions
- ✅ Manage prayer times
- ✅ Reply to questions
- ✅ Create notifications and events
- ✅ View all masjid data
- ❌ Cannot add/remove users
- ❌ Cannot update masjid details
- ❌ Cannot delete notifications/events

### Admin Permissions
- ✅ All imam permissions
- ✅ Add/remove imams and admins
- ✅ Update masjid details
- ✅ Delete notifications and events
- ✅ Soft delete masjid
- ✅ Transfer ownership

---

## 📊 Response Format

### Success Response

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { }
}
```

### Paginated Response

```json
{
  "success": true,
  "message": "Data retrieved successfully",
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalItems": 50,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error information"
}
```

---

## 🛡️ Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: Bcrypt with 10 salt rounds
- **Input Validation**: Express-validator for all inputs
- **SQL Injection Protection**: Sequelize parameterized queries
- **XSS Protection**: Input sanitization
- **Rate Limiting**: 
  - General API: 100 requests per 15 minutes
  - Auth endpoints: 5 requests per 15 minutes
- **CORS**: Configurable cross-origin resource sharing
- **Helmet**: Security headers
- **File Upload Security**: Size and type validation

---

## 🗄️ Database Commands

### Run Migrations

```bash
npm run migrate
```

### Rollback Last Migration

```bash
npm run migrate:undo
```

### Seed Database

```bash
npm run seed
```

### Undo All Seeds

```bash
npm run seed:undo
```

---

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production) | development |
| `PORT` | Server port | 5000 |
| `DB_HOST` | MySQL host | localhost |
| `DB_PORT` | MySQL port | 3306 |
| `DB_NAME` | Database name | salaahmanager |
| `DB_USER` | Database user | root |
| `DB_PASSWORD` | Database password | - |
| `JWT_SECRET` | JWT secret key | - |
| `JWT_REFRESH_SECRET` | JWT refresh secret | - |
| `JWT_EXPIRE` | Access token expiry | 1h |
| `JWT_REFRESH_EXPIRE` | Refresh token expiry | 7d |
| `EMAIL_HOST` | SMTP host | smtp.gmail.com |
| `EMAIL_PORT` | SMTP port | 587 |
| `EMAIL_USER` | SMTP username | - |
| `EMAIL_PASSWORD` | SMTP password | - |
| `MAX_FILE_SIZE` | Max upload size (bytes) | 5242880 |
| `CORS_ORIGIN` | Allowed CORS origins | * |
| `BCRYPT_SALT_ROUNDS` | Bcrypt salt rounds | 10 |

---

## 🧪 Testing

Run tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm test -- --coverage
```

Watch mode:
```bash
npm run test:watch
```

---

## 📦 Project Structure

```
salaahmanager-api/
├── src/
│   ├── config/           # Configuration files
│   ├── controllers/      # Request handlers
│   ├── middleware/       # Custom middleware
│   ├── models/          # Sequelize models
│   ├── routes/          # API routes
│   ├── utils/           # Helper functions
│   ├── validators/      # Input validators
│   └── app.js          # Express app setup
├── migrations/          # Database migrations
├── seeders/            # Database seeders
├── uploads/            # Uploaded files
├── logs/              # Log files
├── tests/             # Test files
├── .env               # Environment variables
├── .gitignore
├── package.json
├── README.md
└── server.js          # Server entry point
```

---

## 🚀 Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong JWT secrets
- [ ] Configure proper CORS origins
- [ ] Set up SSL/TLS
- [ ] Configure email service
- [ ] Set up database backups
- [ ] Configure logging
- [ ] Set up monitoring
- [ ] Use process manager (PM2)
- [ ] Set up reverse proxy (Nginx)

### PM2 Deployment

```bash
npm install -g pm2
pm2 start server.js --name salaahmanager-api
pm2 save
pm2 startup
```

---

## 📧 Sample Users (Seeded Data)

| Email | Password | Role |
|-------|----------|------|
| admin@example.com | Password123 | Admin |
| imam@example.com | Password123 | Imam |
| ali@example.com | Password123 | Admin |
| fatima@example.com | Password123 | Admin |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

---

## 📄 License

ISC

---

## 🐛 Troubleshooting

### Database Connection Error

- Verify MySQL is running
- Check database credentials in `.env`
- Ensure database exists

### Migration Errors

```bash
# Reset database
npm run migrate:undo
npm run migrate
```

### Port Already in Use

```bash
# Change PORT in .env or kill the process
lsof -ti:5000 | xargs kill -9
```

---

## 📞 Support

For issues and questions:
- Create an issue in the repository
- Email: support@salaahmanager.com

---

## ✨ Features Roadmap

- [ ] Push notifications
- [ ] Mobile app integration
- [ ] Donation management
- [ ] Qibla direction
- [ ] Multiple language support
- [ ] Prayer time calculations (auto)
- [ ] Hijri calendar integration
- [ ] Admin dashboard
- [ ] Analytics and reports

---

**Built with ❤️ for the Muslim community**

