# API Quick Reference Guide

## Authentication Endpoints

### 1. POST /api/users/register
**Purpose:** Email/password user registration (phone now required)

**Request:**
```bash
curl -X POST http://localhost:5000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "john@example.com",
    "phoneNumber": "1234567890",
    "password": "securepass123"
  }'
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "email": "john@example.com",
    "phoneNumber": "1234567890",
    "createdAt": "2026-03-04T10:00:00Z"
  }
}
```

**Error Responses:**
- `400`: Missing fields, invalid phone format
- `409`: Duplicate username, email, or phone

---

### 2. POST /api/users/login
**Purpose:** Standard email/password login (unchanged)

**Request:**
```bash
curl -X POST http://localhost:5000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "password": "securepass123"
  }'
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "username": "johndoe",
      "email": "john@example.com",
      "phoneNumber": "1234567890",
      "role": "user"
    }
  }
}
```

---

### 3. POST /api/users/google
**Purpose:** Google OAuth (NEW: two-stage flow)

**Request:**
```bash
curl -X POST http://localhost:5000/api/users/google \
  -H "Content-Type: application/json" \
  -d '{
    "idToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

**Response Case 1: User has phone (200)**
```json
{
  "success": true,
  "status": "completed",
  "message": "Google authentication successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "507f1f77bcf86cd799439012",
      "username": "john_doe123",
      "email": "john@gmail.com",
      "phoneNumber": "1234567890",
      "role": "user"
    }
  }
}
```

**Response Case 2: User needs phone (200)**
```json
{
  "success": true,
  "status": "requiresPhone",
  "message": "Phone completion required",
  "data": {
    "pendingToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "507f1f77bcf86cd799439012",
      "email": "john@gmail.com",
      "googleId": "105694172123456789"
    },
    "phoneRequired": true
  }
}
```

**Error Responses:**
- `400`: Missing idToken
- `401`: Invalid or expired idToken

---

### 4. POST /api/auth/complete-phone ⭐ NEW
**Purpose:** Complete Google OAuth flow by adding phone number

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/complete-phone \
  -H "Authorization: Bearer {pendingToken}" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "1234567890"
  }'
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Phone number verified",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "507f1f77bcf86cd799439012",
      "username": "john_doe123",
      "email": "john@gmail.com",
      "phoneNumber": "1234567890",
      "role": "user"
    }
  }
}
```

**Error Responses:**
- `400`: Missing phoneNumber, invalid format (not 9-15 digits)
  ```json
  {
    "success": false,
    "message": "Phone number must be 9-15 digits",
    "code": "INVALID_PHONE",
    "data": null
  }
  ```

- `401`: Invalid/expired pending token
  ```json
  {
    "success": false,
    "message": "Invalid or expired token",
    "data": null
  }
  ```

- `409`: Phone already registered
  ```json
  {
    "success": false,
    "message": "Phone number already registered",
    "code": "PHONE_DUPLICATE",
    "data": null
  }
  ```

---

### 5. POST /api/users/refresh-token
**Purpose:** Refresh access token (unchanged)

**Request:**
```bash
curl -X POST http://localhost:5000/api/users/refresh-token \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Token refreshed",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 6. POST /api/users/logout
**Purpose:** Logout and invalidate refresh token (unchanged)

**Request:**
```bash
curl -X POST http://localhost:5000/api/users/logout \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Logged out",
  "data": null
}
```

---

### 7. GET /api/users/me
**Purpose:** Get current user profile (requires valid access token)

**Request:**
```bash
curl -X GET http://localhost:5000/api/users/me \
  -H "Authorization: Bearer {accessToken}"
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Authenticated user",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "email": "john@example.com",
    "phoneNumber": "1234567890",
    "role": "user",
    "createdAt": "2026-03-04T10:00:00Z",
    "updatedAt": "2026-03-04T10:00:00Z"
  }
}
```

---

## Protected Routes with requirePhoneComplete

Apply this middleware to routes that require a fully verified user with phone:

```javascript
router.post('/api/bookings', requirePhoneComplete, handleBooking);
router.post('/api/inquiries', requirePhoneComplete, handleInquiry);
```

**Error when user lacks phone (403):**
```json
{
  "success": false,
  "message": "Phone verification required",
  "code": "PHONE_REQUIRED",
  "data": null
}
```

---

## Token Structure

### Access Token Payload
```json
{
  "id": "507f1f77bcf86cd799439011",
  "role": "user",
  "phoneNumber": "1234567890",
  "iat": 1709552400,
  "exp": 1709553300
}
```

### Refresh Token Payload
```json
{
  "id": "507f1f77bcf86cd799439011",
  "type": "refresh",
  "iat": 1709552400,
  "exp": 1709984400
}
```

### Pending Token Payload
```json
{
  "sub": "507f1f77bcf86cd799439011",
  "type": "pending",
  "email": "john@gmail.com",
  "googleId": "105694172123456789",
  "iat": 1709552400,
  "exp": 1709554200
}
```

---

## Common Error Codes

| Code | Status | Meaning |
|------|--------|---------|
| `INVALID_PHONE` | 400 | Phone number not 9-15 digits |
| `INVALID_TOKEN` | 401 | Token signature invalid |
| `PENDING_TOKEN_EXPIRED` | 401 | Pending token timeout (30m) |
| `DUPLICATE_EMAIL` | 409 | Email already registered |
| `DUPLICATE_PHONE` | 409 | Phone already registered |
| `DUPLICATE_USERNAME` | 409 | Username taken |
| `PHONE_REQUIRED` | 403 | Route requires completed phone |
| `Invalid credentials` | 401 | Wrong username/password |

---

## Example Frontend Flow

### New Google User:
```javascript
// 1. Get ID token from Google
const idToken = await googleLogin();

// 2. Send to backend
const response = await fetch('/api/users/google', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ idToken })
});

const data = await response.json();

// 3. Check status
if (data.status === "completed") {
  // User has phone - store tokens and navigate home
  localStorage.setItem('accessToken', data.data.accessToken);
  localStorage.setItem('refreshToken', data.data.refreshToken);
  navigate('/home');
} else if (data.status === "requiresPhone") {
  // User needs phone - navigate to completion screen
  sessionStorage.setItem('pendingToken', data.data.pendingToken);
  navigate('/complete-phone');
}

// 4. User enters phone and submits
const phoneResponse = await fetch('/api/auth/complete-phone', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${sessionStorage.getItem('pendingToken')}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ phoneNumber: userPhone })
});

const phoneData = await phoneResponse.json();

if (phoneData.success) {
  // Store tokens and navigate home
  localStorage.setItem('accessToken', phoneData.data.accessToken);
  localStorage.setItem('refreshToken', phoneData.data.refreshToken);
  navigate('/home');
} else if (phoneData.code === 'PHONE_DUPLICATE') {
  // Show error: phone already registered
  setError('This phone number is already registered');
}
```

---

## Testing with cURL

### Test registration with phone:
```bash
curl -X POST http://localhost:5000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "phoneNumber": "1234567890",
    "password": "testpass123"
  }'
```

### Test Google login (new user scenario):
```bash
curl -X POST http://localhost:5000/api/users/google \
  -H "Content-Type: application/json" \
  -d '{
    "idToken": "YOUR_GOOGLE_ID_TOKEN_HERE"
  }'
# Returns: status: "requiresPhone" with pendingToken
```

### Test phone completion:
```bash
curl -X POST http://localhost:5000/api/auth/complete-phone \
  -H "Authorization: Bearer YOUR_PENDING_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "9876543210"
  }'
# Returns: full session with accessToken and refreshToken
```

---

## Client Implementation Checklist

- [ ] **Register flow**: Requires phone in form
- [ ] **Login flow**: Standard email/password (unchanged)
- [ ] **Google Sign In**: 
  - [ ] Check response `status` field
  - [ ] If "completed" → use tokens immediately
  - [ ] If "requiresPhone" → save pending token, show phone screen
- [ ] **Phone completion flow**:
  - [ ] Takes pending token from session
  - [ ] Sends phone number
  - [ ] Handles 409 error (duplicate phone)
  - [ ] Handles 401 error (expired token)
  - [ ] Stores tokens on success
- [ ] **Protected route guards**:
  - [ ] Check for 403 with "PHONE_REQUIRED"
  - [ ] Redirect to phone completion if needed
- [ ] **Token management**:
  - [ ] Store access token for API calls
  - [ ] Store refresh token securely
  - [ ] Refresh when access token expires
  - [ ] Clear on logout
