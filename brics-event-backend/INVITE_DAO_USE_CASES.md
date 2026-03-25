# inviteDaoToEvent - Complete Use Cases

## Function Overview
**Location:** `src/controllers/auth.controller.js`  
**Purpose:** Invite DAO users to events with role hierarchy protection

---

## 📋 All Possible Use Cases

### 1️⃣ **New User - First Time Invitation**

```javascript
Input:
- User does not exist in database
- firstName: "John", email: "john@example.com"
- Event: "BRICS Summit 2026"

Process:
1. ✅ Create new User with role_id = DAO
2. ✅ Set user fields (name, email, country, citizenship)
3. ✅ Create UserEvent with role = "DAO", status = "invited"
4. ✅ Send invitation email

Result:
{
  User: {
    role_id: DAO (power 2),
    email: "john@example.com",
    first_name: "John",
    account_status: "active"
  },
  UserEvent: {
    role: "DAO",
    status: "invited",
    attended: false
  },
  Response: {
    status: "assigned",
    email_sent: true
  }
}
```

---

### 2️⃣ **Existing DELEGATE → Invited as DAO (System Role Upgrade)**

```javascript
Input:
- User exists: role_id = DELEGATE (power 0)
- Invite as: DAO (power 2)
- Event: "BRICS Summit 2026"

Process:
1. ✅ Check: ROLE_POWER["DAO"] (2) > ROLE_POWER["DELEGATE"] (0) → TRUE
2. ✅ Upgrade User.role_id = DAO
3. ✅ Save user
4. ✅ Check UserEvent scenarios (see below)

Result:
{
  User: {
    role_id: DAO ✅ (Upgraded from DELEGATE)
  }
}
```

**Sub-scenarios after system role upgrade:**

#### 2a. No existing UserEvent
```javascript
Action:
- Create new UserEvent with role = "DAO"
- Send invitation email

Response:
- status: "assigned"
- email_sent: true
```

#### 2b. Already registered as DELEGATE in same event
```javascript
Action:
- Upgrade UserEvent.role from "DELEGATE" to "DAO"
- Update status = "invited"
- Send "Role Updated" email

Response:
- status: "role_promoted"
- email_sent: true
- old_role: "DELEGATE"
- new_role: "DAO"
```

#### 2c. Already registered as DAO in same event
```javascript
Action:
- Skip (no changes needed)
- Send "Already Registered" email

Response:
- Skipped array: ["john@example.com"]
```

---

### 3️⃣ **Existing HEAD OF DELEGATE → Invited as DAO (System Role Upgrade)**

```javascript
Input:
- User exists: role_id = HEAD OF DELEGATE (power 1)
- Invite as: DAO (power 2)
- Event: "BRICS Summit 2026"

Process:
1. ✅ Check: ROLE_POWER["DAO"] (2) > ROLE_POWER["HEAD OF DELEGATE"] (1) → TRUE
2. ✅ Upgrade User.role_id = DAO
3. ✅ Check UserEvent scenarios

Result:
{
  User: {
    role_id: DAO ✅ (Upgraded from HEAD OF DELEGATE)
  },
  UserEvent: [see sub-scenarios in use case 2]
}
```

---

### 4️⃣ **Existing DAO → Invited as DAO (No System Role Change)**

```javascript
Input:
- User exists: role_id = DAO (power 2)
- Invite as: DAO (power 2)
- Event: "BRICS Summit 2026"

Process:
1. ❌ Check: ROLE_POWER["DAO"] (2) > ROLE_POWER["DAO"] (2) → FALSE
2. ⏭️ Skip system role update (already DAO)
3. ✅ Check UserEvent scenarios

Result:
{
  User: {
    role_id: DAO (Unchanged)
  }
}
```

**UserEvent Sub-scenarios:**

#### 4a. Not registered for this event
```javascript
Action:
- Create new UserEvent with role = "DAO"
- Send invitation email

Response:
- status: "assigned"
- email_sent: true
```

#### 4b. Already registered as DAO
```javascript
Action:
- Skip (already registered)
- Send "Already Registered" email

Response:
- Skipped: ["john@example.com"]
```

#### 4c. Registered as DELEGATE (lower role)
```javascript
Action:
- Upgrade UserEvent.role to "DAO"
- Send "Role Updated" email

Response:
- status: "role_promoted"
- old_role: "DELEGATE"
- new_role: "DAO"
```

---

### 5️⃣ **Existing EVENT MANAGER → Invited as DAO (System Role Protected)**

```javascript
Input:
- User exists: role_id = EVENT MANAGER (power 3)
- Invite as: DAO (power 2)
- Event: "BRICS Summit 2026"

Process:
1. ❌ Check: ROLE_POWER["DAO"] (2) > ROLE_POWER["EVENT MANAGER"] (3) → FALSE
2. 🛡️ System role PROTECTED from downgrade
3. ✅ User.role_id remains EVENT MANAGER
4. ✅ Check UserEvent scenarios

Result:
{
  User: {
    role_id: EVENT MANAGER ✅ (Protected from downgrade)
  }
}
```

**UserEvent Sub-scenarios:**

#### 5a. Not registered for this event
```javascript
Action:
- Create new UserEvent with role = "DAO"
- Send invitation email

Response:
- status: "assigned"
- email_sent: true
- Note: System role = EVENT MANAGER, Event role = DAO
```

#### 5b. Already registered as DAO
```javascript
Action:
- Skip
- Send "Already Registered" email

Response:
- Skipped: ["john@example.com"]
```

#### 5c. Registered as DELEGATE
```javascript
Action:
- Upgrade UserEvent.role to "DAO"
- Send "Role Updated" email

Response:
- status: "role_promoted"
```

#### 5d. Registered as EVENT MANAGER (higher role)
```javascript
Action:
- Skip (already has higher event role)
- Send "Role Information" email

Response:
- Skipped: ["john@example.com"]
- Reason: "Already has EVENT MANAGER role"
```

---

### 6️⃣ **Existing SUPER ADMIN → Invited as DAO (System Role Protected)**

```javascript
Input:
- User exists: role_id = SUPER ADMIN (power 4)
- Invite as: DAO (power 2)
- Event: "BRICS Summit 2026"

Process:
1. ❌ Check: ROLE_POWER["DAO"] (2) > ROLE_POWER["SUPER ADMIN"] (4) → FALSE
2. 🛡️ System role PROTECTED (highest role)
3. ✅ User.role_id remains SUPER ADMIN
4. ✅ Check UserEvent scenarios

Result:
{
  User: {
    role_id: SUPER ADMIN ✅ (Protected from downgrade)
  },
  UserEvent: [Same sub-scenarios as use case 5]
}
```

---

### 7️⃣ **Email Send Failure**

```javascript
Input:
- All validations pass
- User and UserEvent created
- Email service fails (network, SMTP error, etc.)

Process:
1. ✅ User created/updated
2. ✅ UserEvent created/updated
3. ❌ sendEmail() throws error
4. ✅ Catch block handles error

Result:
{
  status: "assigned",
  email_sent: false ⚠️
}

Note: Data is saved, only email failed
```

---

### 8️⃣ **Missing Required Fields**

```javascript
Input:
- dao.firstName is missing OR dao.email is missing

Process:
1. ❌ Validation fails
2. ⏭️ Skip this DAO
3. ✅ Add to skipped array

Result:
{
  Skipped: ["unknown"] or [email]
}

Response continues processing other DAOs
```

---

### 9️⃣ **Invalid Email Format** ⚠️ (Current Implementation Issue)

```javascript
Input:
- email: "notanemail" (invalid format)

Current Behavior:
- ❌ No validation
- ✅ Processes with invalid email
- ⚠️ Will fail at email send

Recommended Fix:
- Add email validation before processing
- Skip if invalid format
```

---

### 🔟 **User System Role Misconfigured**

```javascript
Input:
- User exists but role_id points to non-existent role
- User.role_id = "invalid_role_id"

Process:
1. ✅ Find user
2. ❌ Role.findOne({ id: user.role_id }) returns null
3. 🛑 Return error immediately

Result:
{
  status: 500,
  message: "User system role misconfigured"
}

Note: Stops entire batch processing
```

---

### 1️⃣1️⃣ **Event Not Found**

```javascript
Input:
- eventId: "invalid_event_id"

Process:
1. ❌ Event.findById(eventId) returns null
2. 🛑 Return error immediately

Result:
{
  status: 404,
  message: "Event not found"
}
```

---

### 1️⃣2️⃣ **DAO Role Not Configured**

```javascript
Input:
- DAO role doesn't exist in database

Process:
1. ❌ Role.findOne({ name: "DAO" }) returns null
2. 🛑 Return error immediately

Result:
{
  status: 500,
  message: "DAO role not configured"
}
```

---

### 1️⃣3️⃣ **Batch Processing with Mixed Results**

```javascript
Input:
daos = [
  { firstName: "John", email: "john@example.com" },     // Valid
  { firstName: "", email: "invalid@example.com" },      // Missing firstName
  { firstName: "Jane", email: "jane@example.com" },     // Valid
  { firstName: "Bob", email: "existing@example.com" }   // Already registered
]

Process:
1. ✅ John → assigned
2. ⏭️ Second → skipped (missing firstName)
3. ✅ Jane → assigned
4. ⏭️ Bob → skipped (already registered)

Result:
{
  assigned_count: 2,
  assignedDaos: [
    { email: "john@example.com", status: "assigned", email_sent: true },
    { email: "jane@example.com", status: "assigned", email_sent: true }
  ],
  skipped: [
    "invalid@example.com",
    "existing@example.com"
  ]
}
```

---

## 🔄 Complete Flow Diagram

```
START
  ↓
[Validate eventId, daos array]
  ↓
[Get Event] → Not Found? → Return 404
  ↓
[Get DAO Role] → Not Found? → Return 500
  ↓
[Loop through each DAO]
  ↓
[Validate firstName, email] → Invalid? → Skip
  ↓
[Sanitize inputs]
  ↓
[Find User by email]
  ↓
  ├─ Not Found? → [Create User with DAO role]
  │                     ↓
  └─ Found? → [Get current role]
              ↓
              [Compare power levels]
              ↓
              ├─ DAO > Current? → [Upgrade system role]
              └─ DAO ≤ Current? → [Keep current role]
  ↓
[Find UserEvent]
  ↓
  ├─ Not Found? → [Create UserEvent] → [Send Invitation]
  │                     ↓
  └─ Found? → [Compare event roles]
              ↓
              ├─ Same role? → [Skip] → [Send "Already Registered"]
              ├─ DAO > Existing? → [Upgrade] → [Send "Role Updated"]
              └─ DAO < Existing? → [Skip] → [Send "Role Information"]
  ↓
[Next DAO]
  ↓
[Log Activity]
  ↓
[Return Response]
  ↓
END
```

---

## 📊 Use Case Matrix

| Current System Role | Has UserEvent? | Event Role | System Role Action | Event Role Action | Email Sent |
|---------------------|----------------|------------|-------------------|-------------------|------------|
| None (New User) | No | - | Create as DAO | Create as DAO | Invitation |
| DELEGATE | No | - | Upgrade to DAO | Create as DAO | Invitation |
| DELEGATE | Yes | DELEGATE | Upgrade to DAO | Upgrade to DAO | Role Updated |
| DELEGATE | Yes | DAO | Upgrade to DAO | No change | Already Registered |
| HEAD OF DELEGATE | No | - | Upgrade to DAO | Create as DAO | Invitation |
| HEAD OF DELEGATE | Yes | HEAD OF DELEGATE | Upgrade to DAO | Upgrade to DAO | Role Updated |
| DAO | No | - | No change | Create as DAO | Invitation |
| DAO | Yes | DELEGATE | No change | Upgrade to DAO | Role Updated |
| DAO | Yes | DAO | No change | No change | Already Registered |
| EVENT MANAGER | No | - | Protected | Create as DAO | Invitation |
| EVENT MANAGER | Yes | DELEGATE | Protected | Upgrade to DAO | Role Updated |
| EVENT MANAGER | Yes | DAO | Protected | No change | Already Registered |
| EVENT MANAGER | Yes | EVENT MANAGER | Protected | No change | Role Information |
| SUPER ADMIN | No | - | Protected | Create as DAO | Invitation |
| SUPER ADMIN | Yes | Any lower | Protected | Depends on comparison | Various |

---

## 🎯 Key Principles

### ✅ Always True:
1. **System role can only upgrade, never downgrade**
2. **Event role can be promoted if DAO has higher power**
3. **Email failures don't stop data creation**
4. **Invalid entries skip without stopping batch**
5. **Activity logging happens for successful operations**

### ❌ Never Happens:
1. **DAO power never downgrades EVENT MANAGER or SUPER ADMIN**
2. **Existing DAO system role never changes to DAO again**
3. **Email send error never rolls back database changes**

### ⚠️ Edge Cases:
1. **User exists with no role** → Would fail at system role check
2. **UserEvent exists with invalid role** → Power comparison defaults to -1
3. **Email undefined in dao object** → Skipped as "unknown"

---

## 🧪 Testing Scenarios

```javascript
// Test 1: New user invite
Input: { firstName: "John", email: "new@test.com" }
Expected: User created with DAO, UserEvent created, invitation sent

// Test 2: Upgrade from DELEGATE
Input: User exists as DELEGATE, invite as DAO
Expected: System role upgraded, UserEvent created or upgraded

// Test 3: Protect EVENT MANAGER
Input: User exists as EVENT MANAGER, invite as DAO
Expected: System role unchanged, UserEvent created with DAO

// Test 4: Already registered as DAO
Input: User is DAO, UserEvent exists with DAO role
Expected: Skipped, "Already Registered" email sent

// Test 5: Email failure handling
Input: Valid user, email service down
Expected: User/UserEvent created, email_sent: false

// Test 6: Batch with mixed results
Input: 5 DAOs (2 valid, 2 invalid, 1 duplicate)
Expected: 2 assigned, 3 skipped, proper categorization

// Test 7: Missing firstName
Input: { email: "test@test.com" } (no firstName)
Expected: Skipped, added to skipped array

// Test 8: Event not found
Input: Invalid eventId
Expected: 404 error, no processing

// Test 9: Role promotion in UserEvent
Input: User is DAO, UserEvent exists as DELEGATE
Expected: UserEvent upgraded to DAO, "Role Updated" email
```

---

## 💡 Real-World Examples

### Example 1: Progressive Career Path
```javascript
// Day 1: John joins as DELEGATE
System Role: DELEGATE, Event A Role: DELEGATE

// Day 30: John invited as DAO to Event A
System Role: DAO ✅ (upgraded)
Event A Role: DAO ✅ (upgraded)

// Day 60: John invited as DAO to Event B
System Role: DAO (no change)
Event B Role: DAO ✅ (new entry)
```

### Example 2: Admin Participating as DAO
```javascript
// Scenario: Super Admin wants to be DAO for specific event
Current: SUPER ADMIN (power 4)
Invite: DAO (power 2)

Result:
- System Role: SUPER ADMIN ✅ (protected)
- Event Role: DAO ✅ (event-specific)
- Can login with full admin powers
- Appears as DAO for this event only
```

### Example 3: Bulk Import with Errors
```javascript
Import 100 DAOs:
- 85 successful invites
- 10 already registered (skipped)
- 5 missing data (skipped)

Response:
{
  assigned_count: 85,
  skipped: [15 emails],
  status: 201
}
// Processing continues despite errors
```

---

## 🔧 Potential Issues & Fixes

### Issue 1: No Email Validation
**Current:** Accepts any string as email  
**Impact:** Invalid emails processed, fail at send  
**Fix:** Add email regex validation before processing

### Issue 2: N+1 Query Problem
**Current:** Role query inside loop  
**Impact:** Slow for large batches  
**Fix:** Move `daoRole` query outside loop (already done)

### Issue 3: Race Condition
**Current:** Multiple simultaneous invites for same email  
**Impact:** Potential duplicate user creation  
**Fix:** Use findOneAndUpdate with upsert or add mutex

### Issue 4: System Role Error Stops Batch
**Current:** If one user has misconfigured role, entire batch fails  
**Impact:** 99 valid users not processed because of 1 error  
**Fix:** Move error to try-catch, skip problematic user, continue

---

## 📖 Summary

The `inviteDaoToEvent` function handles **13+ distinct use cases** with **role hierarchy protection**, **email notification**, and **batch processing**. It ensures:

1. ✅ System roles can only upgrade (DELEGATE → DAO)
2. ✅ Higher roles protected (EVENT MANAGER, SUPER ADMIN stay unchanged)
3. ✅ Event-specific roles flexible (DAO can be EVENT MANAGER for one event, DELEGATE for another)
4. ✅ Graceful error handling (email failures don't stop processing)
5. ✅ Activity logging for audit trail

**Key Takeaway:** User table stores permanent career progression, UserEvent table stores flexible event participation.
