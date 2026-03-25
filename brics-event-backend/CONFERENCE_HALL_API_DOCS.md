# Conference Hall Management API Documentation

## Overview
The Conference Hall Management System allows Super Admins and Event Managers to create, manage, and assign conference halls to events and sessions.

## Database Schema

### ConferenceHall Model
```javascript
{
  id: String (UUID, unique),
  hall_name: String (required),
  venue_name: String (required),
  floor_name: String (required),
  state: String (required),
  city: String (required),
  capacity: Number (required, min: 1),
  video_conference_enabled: Boolean (default: false),
  status: Enum ["available", "booked", "maintenance"] (default: "available"),
  
  assignments: [
    {
      event_id: String (required),
      session_id: String (nullable),
      session_name: String,
      assigned_date: Date (default: now),
      assigned_by: String (user_id),
      start_date: Date,
      end_date: Date
    }
  ],
  
  created_by: String (required),
  is_active: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}
```

## API Endpoints

### 1. Create Conference Hall
**POST** `/api/conference-halls`

**Authorization:** Bearer Token (Super Admin / Event Manager)

**Request Body:**
```json
{
  "hall_name": "Ambedkar Centre",
  "venue_name": "Building A",
  "floor_name": "Ground Floor",
  "state": "New Delhi",
  "city": "Delhi",
  "capacity": 200,
  "video_conference_enabled": true,
  "event_id": "6789...", // Optional: assign during creation
  "session_id": "session_1", // Optional
  "session_name": "Sub event 1", // Optional
  "start_date": "2025-11-12T10:00:00Z", // Optional
  "end_date": "2025-11-14T17:00:00Z" // Optional
}
```

**Response (201):**
```json
{
  "message": "Conference hall created successfully",
  "hall": {
    "id": "uuid-here",
    "hall_name": "Ambedkar Centre",
    "venue_name": "Building A",
    "floor_name": "Ground Floor",
    "state": "New Delhi",
    "city": "Delhi",
    "capacity": 200,
    "video_conference_enabled": true,
    "status": "booked",
    "assignments": [
      {
        "event_id": "6789...",
        "session_id": "session_1",
        "session_name": "Sub event 1",
        "assigned_by": "user-uuid",
        "assigned_date": "2025-11-01T10:00:00Z",
        "start_date": "2025-11-12T10:00:00Z",
        "end_date": "2025-11-14T17:00:00Z"
      }
    ],
    "created_by": "user-uuid",
    "is_active": true,
    "createdAt": "2025-11-01T10:00:00Z",
    "updatedAt": "2025-11-01T10:00:00Z"
  }
}
```

---

### 2. Get All Conference Halls
**GET** `/api/conference-halls`

**Authorization:** Bearer Token

**Query Parameters:**
- `start_date` (optional): Filter by availability from date (ISO 8601)
- `end_date` (optional): Filter by availability until date (ISO 8601)
- `status` (optional): Filter by status (available, booked, maintenance)
- `state` (optional): Filter by state
- `city` (optional): Filter by city
- `search` (optional): Search in hall_name, venue_name, or city

**Example:**
```
GET /api/conference-halls?start_date=2025-02-01&end_date=2025-02-07&status=available&search=Ambedkar
```

**Response (200):**
```json
{
  "success": true,
  "total": 5,
  "halls": [
    {
      "id": "uuid-1",
      "hall_name": "Ambedkar Centre",
      "venue_name": "Building A",
      "floor_name": "Ground Floor",
      "state": "New Delhi",
      "city": "Delhi",
      "capacity": 200,
      "video_conference_enabled": true,
      "status": "available",
      "assignments": [],
      "created_by": "user-uuid",
      "is_active": true
    }
  ]
}
```

---

### 3. Get Available Halls for Date Range
**GET** `/api/conference-halls/available`

**Authorization:** Bearer Token

**Query Parameters (Required):**
- `start_date`: Start date (ISO 8601)
- `end_date`: End date (ISO 8601)
- `capacity_min` (optional): Minimum capacity required

**Example:**
```
GET /api/conference-halls/available?start_date=2025-11-10T00:00:00Z&end_date=2025-11-14T23:59:59Z&capacity_min=100
```

**Response (200):**
```json
{
  "success": true,
  "total": 3,
  "halls": [
    {
      "id": "uuid-1",
      "hall_name": "Conference Hall 1",
      "venue_name": "Building A",
      "floor_name": "Ground Floor",
      "capacity": 150,
      "video_conference_enabled": true,
      "status": "available"
    }
  ]
}
```

---

### 4. Get Single Conference Hall
**GET** `/api/conference-halls/:hallId`

**Authorization:** Bearer Token

**Response (200):**
```json
{
  "success": true,
  "hall": {
    "id": "uuid-1",
    "hall_name": "Ambedkar Centre",
    "venue_name": "Building A",
    "floor_name": "Ground Floor",
    "state": "New Delhi",
    "city": "Delhi",
    "capacity": 200,
    "video_conference_enabled": true,
    "status": "booked",
    "assignments": [
      {
        "event_id": "event-uuid",
        "session_id": "session_1",
        "session_name": "Sub event 1",
        "assigned_by": "user-uuid",
        "assigned_date": "2025-11-01T10:00:00Z",
        "start_date": "2025-11-12T10:00:00Z",
        "end_date": "2025-11-14T17:00:00Z",
        "event_name": "BRICS Summit 2026",
        "event_start": "2025-11-10T10:00:00Z",
        "event_end": "2025-11-14T17:00:00Z"
      }
    ]
  }
}
```

---

### 5. Update Conference Hall
**PUT** `/api/conference-halls/:hallId`

**Authorization:** Bearer Token (Super Admin / Event Manager)

**Request Body:** (all fields optional)
```json
{
  "hall_name": "Updated Hall Name",
  "venue_name": "Updated Building",
  "floor_name": "First Floor",
  "state": "Maharashtra",
  "city": "Mumbai",
  "capacity": 300,
  "video_conference_enabled": false,
  "status": "maintenance"
}
```

**Response (200):**
```json
{
  "message": "Conference hall updated successfully",
  "hall": { /* updated hall object */ }
}
```

---

### 6. Delete Conference Hall
**DELETE** `/api/conference-halls/:hallId`

**Authorization:** Bearer Token (Super Admin / Event Manager)

**Note:** Cannot delete halls with active assignments

**Response (200):**
```json
{
  "message": "Conference hall deleted successfully"
}
```

**Error Response (400):**
```json
{
  "message": "Cannot delete hall with active assignments. Please unassign first."
}
```

---

### 7. Assign Hall to Event/Session
**POST** `/api/conference-halls/:hallId/assign`

**Authorization:** Bearer Token (Super Admin / Event Manager)

**Request Body:**
```json
{
  "event_id": "event-uuid",
  "session_id": "session_1", // Optional: null for main event
  "session_name": "Sub event 1", // Optional
  "start_date": "2025-11-12T10:00:00Z", // Optional: defaults to event dates
  "end_date": "2025-11-14T17:00:00Z" // Optional
}
```

**Response (200):**
```json
{
  "message": "Hall assigned successfully",
  "hall": { /* hall with updated assignments */ }
}
```

**Error Response (409):**
```json
{
  "message": "Hall is already booked for this date range"
}
```

---

### 8. Unassign Hall
**POST** `/api/conference-halls/:hallId/unassign`

**Authorization:** Bearer Token (Super Admin / Event Manager)

**Request Body:**
```json
{
  "event_id": "event-uuid",
  "session_id": "session_1" // Optional: null for main event
}
```

**Response (200):**
```json
{
  "message": "Hall unassigned successfully",
  "hall": { /* hall with updated assignments */ }
}
```

---

### 9. Get Halls for Specific Event
**GET** `/api/conference-halls/event/:eventId`

**Authorization:** Bearer Token

**Response (200):**
```json
{
  "success": true,
  "total": 2,
  "halls": [
    {
      "id": "uuid-1",
      "hall_name": "Main Auditorium",
      "venue_name": "Building A",
      "capacity": 500,
      "event_assignments": [
        {
          "event_id": "event-uuid",
          "session_id": null,
          "session_name": "BRICS Summit 2026",
          "start_date": "2025-11-10T10:00:00Z",
          "end_date": "2025-11-14T17:00:00Z"
        }
      ]
    }
  ]
}
```

---

## Use Cases

### Use Case 1: Create Hall and Assign to Event
```javascript
// Step 1: Create hall with assignment
POST /api/conference-halls
{
  "hall_name": "Ambedkar Centre",
  "venue_name": "Building A",
  "floor_name": "Ground Floor",
  "state": "New Delhi",
  "city": "Delhi",
  "capacity": 200,
  "video_conference_enabled": true,
  "event_id": "67890...",
  "session_id": "session_1"
}
```

### Use Case 2: Find Available Halls and Assign
```javascript
// Step 1: Get available halls for date range
GET /api/conference-halls/available?start_date=2025-11-10&end_date=2025-11-14&capacity_min=100

// Step 2: Assign selected hall
POST /api/conference-halls/{hallId}/assign
{
  "event_id": "event-uuid",
  "session_id": "session_1"
}
```

### Use Case 3: Change Hall Assignment
```javascript
// Step 1: Unassign current hall
POST /api/conference-halls/{oldHallId}/unassign
{
  "event_id": "event-uuid",
  "session_id": "session_1"
}

// Step 2: Assign new hall
POST /api/conference-halls/{newHallId}/assign
{
  "event_id": "event-uuid",
  "session_id": "session_1"
}
```

### Use Case 4: View Event's Conference Halls
```javascript
// Get all halls assigned to an event
GET /api/conference-halls/event/{eventId}
```

---

## Activity Logging

All operations are logged with the following activity types:
- `HALL_CREATE` - Hall creation
- `HALL_UPDATE` - Hall updates
- `HALL_DELETE` - Hall deletion
- `HALL_ASSIGN` - Hall assignment to event/session
- `HALL_UNASSIGN` - Hall unassignment

---

## Error Codes

- `400` - Bad Request (missing/invalid fields)
- `401` - Unauthorized (no token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (hall/event not found)
- `409` - Conflict (hall already booked for date range)
- `500` - Internal Server Error

---

## Role Permissions

| Action | Super Admin | Event Manager | DAO | Delegate |
|--------|------------|---------------|-----|----------|
| Create Hall | ✅ | ✅ | ❌ | ❌ |
| View Halls | ✅ | ✅ | ✅ | ✅ |
| Update Hall | ✅ | ✅ | ❌ | ❌ |
| Delete Hall | ✅ | ✅ | ❌ | ❌ |
| Assign Hall | ✅ | ✅ | ❌ | ❌ |
| Unassign Hall | ✅ | ✅ | ❌ | ❌ |

---

## Frontend Integration Notes

### Conference Hall List Screen
- Use `GET /api/conference-halls` with date range filters
- Show status badges (Available/Booked)
- Add "Assign Hall" action for available halls

### Assign Hall Modal
- Show hall details (building, floor, capacity, video conf)
- Select event dropdown
- Select session/sub-event dropdown
- Show event preview with dates
- On submit: `POST /api/conference-halls/:hallId/assign`

### Event Details - Conference Hall Tab
- Use `GET /api/conference-halls/event/:eventId`
- Show assigned halls per event/session
- "Change Hall" button triggers unassign + assign flow

### Add Conference Hall Modal
- Create hall form with all required fields
- Optional: Assign to event during creation
- "Add More Halls" for bulk creation
