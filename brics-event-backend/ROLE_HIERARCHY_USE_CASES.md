# Role Hierarchy - All Use Cases

## Role Power Levels
```javascript
ROLE_POWER = {
  "SUPER ADMIN": 4,      // Highest power
  "EVENT MANAGER": 3,
  "DAO": 2,
  "HEAD OF DELEGATE": 1,
  "DELEGATE": 0          // Lowest power
}
```

---

## 📋 Use Cases by Function

### 1️⃣ **inviteDaoToEvent** - Inviting DAOs to Event

#### Use Case 1.1: New User (First Time)
```javascript
Current User: Does not exist
Invite As: DAO

Action:
✅ Create new user with role_id = DAO
✅ Create UserEvent with role = "DAO"
✅ Send invitation email

Result:
User.role_id = DAO (power 2)
UserEvent.role = "DAO"
```

#### Use Case 1.2: Existing DELEGATE → Invited as DAO
```javascript
Current User: DELEGATE (power 0)
Invite As: DAO (power 2)

Action:
✅ Upgrade User.role_id = DAO (2 > 0)
✅ Create UserEvent with role = "DAO"
✅ Send invitation email

Result:
User.role_id = DAO ✅ (Upgraded)
UserEvent.role = "DAO"
```

#### Use Case 1.3: Existing HEAD OF DELEGATE → Invited as DAO
```javascript
Current User: HEAD OF DELEGATE (power 1)
Invite As: DAO (power 2)

Action:
✅ Upgrade User.role_id = DAO (2 > 1)
✅ Create UserEvent with role = "DAO"
✅ Send invitation email

Result:
User.role_id = DAO ✅ (Upgraded)
UserEvent.role = "DAO"
```

#### Use Case 1.4: Existing DAO → Invited as DAO (Same Role)
```javascript
Current User: DAO (power 2)
UserEvent: Already exists with role = "DAO"
Invite As: DAO (power 2)

Action:
❌ No upgrade needed (2 = 2)
✅ Send "Already Registered" email
⚠️ User added to skipped list

Result:
User.role_id = DAO (Unchanged)
UserEvent.role = "DAO" (Unchanged)
Status: "skipped"
```

#### Use Case 1.4b: Existing DELEGATE → Invited as DAO (Event Role Promotion)
```javascript
Current User: DELEGATE (power 0)
UserEvent: Already exists with role = "DELEGATE"
Invite As: DAO (power 2)

Action:
✅ Upgrade User.role_id = DAO (2 > 0)
✅ Upgrade UserEvent.role = "DAO" (2 > 0)
✅ Send "Role Updated" email

Result:
User.role_id = DAO ✅ (Upgraded)
UserEvent.role = "DAO" ✅ (Promoted)
Status: "role_promoted"
```

#### Use Case 1.5: Existing EVENT MANAGER → Invited as DAO
```javascript
Current User: EVENT MANAGER (power 3)
Invite As: DAO (power 2)

Action:
❌ NO DOWNGRADE (2 < 3) - User.role_id stays EVENT MANAGER
✅ Create UserEvent with role = "DAO"
✅ Send invitation email

Result:
User.role_id = EVENT MANAGER ✅ (Protected from downgrade)
UserEvent.role = "DAO" ✅ (Event-specific role)
```

#### Use Case 1.6: Existing SUPER ADMIN → Invited as DAO
```javascript
Current User: SUPER ADMIN (power 4)
UserEvent: Exists with higher role OR new
Invite As: DAO (power 2)

Action:
❌ NO DOWNGRADE (2 < 4) - User.role_id stays SUPER ADMIN
✅ If no UserEvent exists, create with role = "DAO"
❌ If UserEvent exists with higher role, skip and send "Role Information" email

Result:
User.role_id = SUPER ADMIN ✅ (Protected from downgrade)
UserEvent.role = "DAO" ✅ (Event-specific role) OR skipped if higher role exists
```

---

## 🔧 **Issue Fixed**: Event Role Promotion in `inviteDaoToEvent`

**Previous Bug:**
- If user was already registered for event as DELEGATE, inviting them as DAO would skip them
- No role promotion logic existed

**Fixed Now:**
- ✅ Checks existing UserEvent role
- ✅ Promotes if DAO has higher power (DELEGATE → DAO)
- ✅ Sends "Already Registered" if same role
- ✅ Sends "Role Information" if already has higher role
- ✅ Consistent with `inviteDelegateToEvent` behavior

---

### 2️⃣ **inviteDelegateToEvent** - Inviting Delegates to Event

#### Use Case 2.1: New User → Invited as DELEGATE
```javascript
Current User: Does not exist
Invite As: DELEGATE (power 0)

Action:
✅ Create new user with role_id = DELEGATE
✅ Create UserEvent with role = "DELEGATE"
✅ Send invitation email

Result:
User.role_id = DELEGATE
UserEvent.role = "DELEGATE"
Status: "invited"
```

#### Use Case 2.2: New User → Invited as HEAD OF DELEGATE
```javascript
Current User: Does not exist
Invite As: HEAD OF DELEGATE (power 1)

Action:
✅ Create new user with role_id = HEAD OF DELEGATE
✅ Create UserEvent with role = "HEAD OF DELEGATE"
✅ Send invitation email

Result:
User.role_id = HEAD OF DELEGATE
UserEvent.role = "HEAD OF DELEGATE"
Status: "invited"
```

#### Use Case 2.3: Existing DELEGATE → Invited as HEAD OF DELEGATE
```javascript
Current User: DELEGATE (power 0)
Invite As: HEAD OF DELEGATE (power 1)

Action:
✅ Upgrade User.role_id = HEAD OF DELEGATE (1 > 0)
✅ Create UserEvent with role = "HEAD OF DELEGATE"
✅ Send invitation email

Result:
User.role_id = HEAD OF DELEGATE ✅ (Upgraded)
UserEvent.role = "HEAD OF DELEGATE"
Status: "invited"
```

#### Use Case 2.4: Existing HEAD OF DELEGATE → Invited as DELEGATE
```javascript
Current User: HEAD OF DELEGATE (power 1)
Invite As: DELEGATE (power 0)

Action:
❌ NO DOWNGRADE (0 < 1) - User.role_id stays HEAD OF DELEGATE
✅ Create UserEvent with role = "DELEGATE"
✅ Send invitation email

Result:
User.role_id = HEAD OF DELEGATE ✅ (Protected from downgrade)
UserEvent.role = "DELEGATE" ✅ (Can attend as lower role)
Status: "invited"
```

#### Use Case 2.5: Existing DAO → Invited as DELEGATE
```javascript
Current User: DAO (power 2)
Invite As: DELEGATE (power 0)

Action:
❌ NO DOWNGRADE (0 < 2) - User.role_id stays DAO
✅ Create UserEvent with role = "DELEGATE"
✅ Send invitation email

Result:
User.role_id = DAO ✅ (Protected from downgrade)
UserEvent.role = "DELEGATE" ✅ (Can attend as lower role)
Status: "invited"
```

#### Use Case 2.6: Existing DAO → Invited as HEAD OF DELEGATE
```javascript
Current User: DAO (power 2)
Invite As: HEAD OF DELEGATE (power 1)

Action:
❌ NO DOWNGRADE (1 < 2) - User.role_id stays DAO
✅ Create UserEvent with role = "HEAD OF DELEGATE"
✅ Send invitation email

Result:
User.role_id = DAO ✅ (Protected from downgrade)
UserEvent.role = "HEAD OF DELEGATE" ✅ (Can attend as lower role)
Status: "invited"
```

#### Use Case 2.7: Existing DELEGATE → Invited as DAO
```javascript
Current User: DELEGATE (power 0)
Invite As: DAO (power 2)

Action:
✅ Upgrade User.role_id = DAO (2 > 0)
✅ Create UserEvent with role = "DAO"
✅ Send invitation email

Result:
User.role_id = DAO ✅ (Upgraded)
UserEvent.role = "DAO"
Status: "invited"
```

#### Use Case 2.8: Existing EVENT MANAGER → Invited as DELEGATE
```javascript
Current User: EVENT MANAGER (power 3)
Invite As: DELEGATE (power 0)

Action:
❌ NO DOWNGRADE (0 < 3) - User.role_id stays EVENT MANAGER
✅ Create UserEvent with role = "DELEGATE"
✅ Send invitation email

Result:
User.role_id = EVENT MANAGER ✅ (Protected from downgrade)
UserEvent.role = "DELEGATE" ✅ (Can attend as lower role)
Status: "invited"
```

#### Use Case 2.9: Already Registered with Same Role
```javascript
Current User: DELEGATE (power 0)
Invite As: DELEGATE (power 0)
UserEvent: Already exists with role = "DELEGATE"

Action:
❌ No changes needed
✅ Send "Already Registered" email

Result:
User.role_id = DELEGATE (Unchanged)
UserEvent.role = "DELEGATE" (Unchanged)
Status: "already_registered"
```

#### Use Case 2.10: Role Promotion in Same Event
```javascript
Current User: DELEGATE (power 0)
UserEvent: Exists with role = "DELEGATE"
Invite As: HEAD OF DELEGATE (power 1)

Action:
✅ Upgrade User.role_id = HEAD OF DELEGATE
✅ Update UserEvent.role = "HEAD OF DELEGATE"
✅ Set status = "confirmed", attended = true
✅ Send "Role Updated" email

Result:
User.role_id = HEAD OF DELEGATE ✅ (Upgraded)
UserEvent.role = "HEAD OF DELEGATE" ✅ (Promoted)
Status: "role_promoted"
```

#### Use Case 2.11: Attempted Demotion in Same Event
```javascript
Current User: DAO (power 2)
UserEvent: Exists with role = "DAO"
Invite As: DELEGATE (power 0)

Action:
❌ User.role_id stays DAO (protected)
❌ UserEvent.role stays "DAO" (no demotion)
✅ Send "Role Information" email

Result:
User.role_id = DAO (Protected)
UserEvent.role = "DAO" (Protected)
Status: "role_not_promoted"
```

---

### 3️⃣ **assignEventManager** (event.controller.js)

#### Use Case 3.1: New User → Assigned as EVENT MANAGER
```javascript
Current User: Does not exist
Assign As: EVENT MANAGER (power 3)

Action:
✅ Create new user with role_id = EVENT MANAGER
✅ Create UserEvent with role = "EVENT MANAGER"

Result:
User.role_id = EVENT MANAGER
UserEvent.role = "EVENT MANAGER"
```

#### Use Case 3.2: Existing DELEGATE → Assigned as EVENT MANAGER
```javascript
Current User: DELEGATE (power 0)
Assign As: EVENT MANAGER (power 3)

Action:
✅ Upgrade User.role_id = EVENT MANAGER (3 > 0)
✅ Create UserEvent with role = "EVENT MANAGER"

Result:
User.role_id = EVENT MANAGER ✅ (Upgraded)
UserEvent.role = "EVENT MANAGER"
```

#### Use Case 3.3: Existing DAO → Assigned as EVENT MANAGER
```javascript
Current User: DAO (power 2)
Assign As: EVENT MANAGER (power 3)

Action:
✅ Upgrade User.role_id = EVENT MANAGER (3 > 2)
✅ Create UserEvent with role = "EVENT MANAGER"

Result:
User.role_id = EVENT MANAGER ✅ (Upgraded)
UserEvent.role = "EVENT MANAGER"
```

#### Use Case 3.4: Existing EVENT MANAGER → Assigned as EVENT MANAGER
```javascript
Current User: EVENT MANAGER (power 3)
Assign As: EVENT MANAGER (power 3)

Action:
❌ No upgrade needed (3 = 3)
✅ Create UserEvent with role = "EVENT MANAGER"

Result:
User.role_id = EVENT MANAGER (Unchanged)
UserEvent.role = "EVENT MANAGER"
```

#### Use Case 3.5: Existing SUPER ADMIN → Assigned as EVENT MANAGER
```javascript
Current User: SUPER ADMIN (power 4)
Assign As: EVENT MANAGER (power 3)

Action:
❌ NO DOWNGRADE (3 < 4) - User.role_id stays SUPER ADMIN
✅ Create UserEvent with role = "EVENT MANAGER"

Result:
User.role_id = SUPER ADMIN ✅ (Protected from downgrade)
UserEvent.role = "EVENT MANAGER" ✅ (Event-specific role)
```

---

## 🔑 Key Principles

### ✅ What ALWAYS Happens:
1. **System Role Protection**: `User.role_id` can only be upgraded, never downgraded
2. **Event Role Flexibility**: `UserEvent.role` can be any role regardless of system role
3. **Hierarchy Respected**: All comparisons use `ROLE_POWER` constant
4. **Data Integrity**: Prevents accidental or malicious role downgrades

### ❌ What NEVER Happens:
1. **System Role Downgrade**: User with DAO cannot become DELEGATE in User table
2. **Permission Loss**: Higher roles never lose their system-level permissions
3. **Forced Demotion**: Users cannot be demoted against hierarchy rules

### 🎯 Special Cases:
1. **Same Event, Different Role**: User can participate in different events with different roles
2. **Lower Event Role**: DAO (system) can attend as DELEGATE (event-specific)
3. **Role Promotion**: Both system and event roles get upgraded together when applicable

---

## 📊 Complete Upgrade/Downgrade Matrix

| Current Role | Invite As | User Table | UserEvent Table | Result |
|--------------|-----------|------------|-----------------|--------|
| None | DELEGATE | DELEGATE | DELEGATE | ✅ Create |
| None | HEAD OF DELEGATE | HEAD OF DELEGATE | HEAD OF DELEGATE | ✅ Create |
| None | DAO | DAO | DAO | ✅ Create |
| None | EVENT MANAGER | EVENT MANAGER | EVENT MANAGER | ✅ Create |
| DELEGATE | HEAD OF DELEGATE | HEAD OF DELEGATE | HEAD OF DELEGATE | ✅ Upgrade Both |
| DELEGATE | DAO | DAO | DAO | ✅ Upgrade Both |
| DELEGATE | EVENT MANAGER | EVENT MANAGER | EVENT MANAGER | ✅ Upgrade Both |
| HEAD OF DELEGATE | DELEGATE | HEAD OF DELEGATE | DELEGATE | ⚠️ System Protected, Event Allowed |
| HEAD OF DELEGATE | DAO | DAO | DAO | ✅ Upgrade Both |
| HEAD OF DELEGATE | EVENT MANAGER | EVENT MANAGER | EVENT MANAGER | ✅ Upgrade Both |
| DAO | DELEGATE | DAO | DELEGATE | ⚠️ System Protected, Event Allowed |
| DAO | HEAD OF DELEGATE | DAO | HEAD OF DELEGATE | ⚠️ System Protected, Event Allowed |
| DAO | EVENT MANAGER | EVENT MANAGER | EVENT MANAGER | ✅ Upgrade Both |
| EVENT MANAGER | DELEGATE | EVENT MANAGER | DELEGATE | ⚠️ System Protected, Event Allowed |
| EVENT MANAGER | HEAD OF DELEGATE | EVENT MANAGER | HEAD OF DELEGATE | ⚠️ System Protected, Event Allowed |
| EVENT MANAGER | DAO | EVENT MANAGER | DAO | ⚠️ System Protected, Event Allowed |
| EVENT MANAGER | SUPER ADMIN | SUPER ADMIN | SUPER ADMIN | ✅ Upgrade Both |
| SUPER ADMIN | DELEGATE | SUPER ADMIN | DELEGATE | ⚠️ System Protected, Event Allowed |
| SUPER ADMIN | HEAD OF DELEGATE | SUPER ADMIN | HEAD OF DELEGATE | ⚠️ System Protected, Event Allowed |
| SUPER ADMIN | DAO | SUPER ADMIN | DAO | ⚠️ System Protected, Event Allowed |
| SUPER ADMIN | EVENT MANAGER | SUPER ADMIN | EVENT MANAGER | ⚠️ System Protected, Event Allowed |

**Legend:**
- ✅ Upgrade Both = Both User table and UserEvent table upgraded
- ⚠️ System Protected, Event Allowed = User table protected, UserEvent can have lower role
- ❌ Blocked = Operation not allowed

---

## 🧪 Testing Scenarios

### Test 1: DAO Self-Assignment Protection
```javascript
// Current: User is DAO
// Action: Someone tries to invite them as DELEGATE
// Expected: User.role_id stays DAO, UserEvent.role can be DELEGATE
```

### Test 2: Progressive Promotion
```javascript
// Step 1: DELEGATE → HEAD OF DELEGATE
// Step 2: HEAD OF DELEGATE → DAO
// Step 3: DAO → EVENT MANAGER
// Step 4: EVENT MANAGER → SUPER ADMIN
// Expected: All upgrades succeed
```

### Test 3: Multi-Event Participation
```javascript
// User: DAO in system
// Event A: Participate as DAO
// Event B: Participate as DELEGATE
// Event C: Participate as HEAD OF DELEGATE
// Expected: System role stays DAO, each event has different role
```

### Test 4: Existing Mapping Skip
```javascript
// User already has UserEvent for this event
// Action: Try to invite again
// Expected: User skipped, no duplicate created
```

### Test 5: Email Notification Types
```javascript
// Case A: New invitation → "Invitation to Attend"
// Case B: Already registered → "Already Registered"
// Case C: Role promoted → "Role Updated"
// Case D: Role not changed → "Role Information"
```

---

## 💡 Real-World Examples

### Example 1: DAO Cannot Be Demoted
**Scenario**: Rajesh is a DAO. Someone accidentally tries to invite him as DELEGATE.
```javascript
Before: User.role_id = DAO, No event registration
Action: inviteDelegateToEvent(rajesh@example.com, "DELEGATE")
After:  User.role_id = DAO ✅ (Protected)
        UserEvent.role = "DELEGATE" ✅ (Event-specific)
```
**Result**: Rajesh's system role is safe, but he can attend this specific event as DELEGATE if needed.

### Example 2: Progressive Career Growth
**Scenario**: Priya joins as DELEGATE, then becomes HEAD OF DELEGATE, then DAO.
```javascript
Step 1: New user as DELEGATE
        User.role_id = DELEGATE (power 0)

Step 2: Invite as HEAD OF DELEGATE
        User.role_id = HEAD OF DELEGATE ✅ (power 1 > 0)

Step 3: Invite as DAO
        User.role_id = DAO ✅ (power 2 > 1)
```
**Result**: Each promotion is permanent and protected.

### Example 3: EVENT MANAGER Participates as Lower Role
**Scenario**: Suresh is EVENT MANAGER but wants to attend Event X as regular DELEGATE.
```javascript
Before: User.role_id = EVENT MANAGER (power 3)
Action: inviteDelegateToEvent(suresh@example.com, "DELEGATE")
After:  User.role_id = EVENT MANAGER ✅ (Protected)
        UserEvent.role = "DELEGATE" ✅ (Event-specific)
```
**Result**: System role protected, event participation flexible.

### Example 4: SUPER ADMIN Omnipresence
**Scenario**: Admin needs to be DAO for Event A, EVENT MANAGER for Event B.
```javascript
System: User.role_id = SUPER ADMIN (power 4) - Always protected

Event A: UserEvent.role = "DAO"
Event B: UserEvent.role = "EVENT MANAGER"
Event C: UserEvent.role = "DELEGATE"
```
**Result**: System role always SUPER ADMIN, event roles vary as needed.

---

## 🎓 Summary

The role hierarchy system ensures:
1. **Data Integrity**: No accidental downgrades
2. **Career Progression**: Users can only move up
3. **Event Flexibility**: Participate in events with any role
4. **System Security**: Core permissions protected
5. **Audit Trail**: Clear separation between permanent and temporary roles

**Golden Rule**: 
> User table role = Permanent, protected career level
> UserEvent table role = Temporary, flexible event participation
