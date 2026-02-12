# Backend Socket Event Requirements for Video Call

## Overview
The frontend relies on specific socket events to properly detect when both participants have joined the call. If these events are not emitted correctly, the "waiting for..." message may persist even when both users are connected.

## Required Socket Events

### 1. `ON_CALL_JOIN` (Client → Server)
**When to emit:** When a user joins/initiates a call
**Payload:**
```javascript
{
  userInfo: {
    from_user: "userId1",      // Current user's ID
    to_user: "userId2",       // Other participant's ID
    sessionId: "sessionId",   // REQUIRED: Session/booking ID
    peerId: "peerId"          // PeerJS peer ID
  }
}
```

**Critical:** The `sessionId` field MUST be included. Without it, the frontend cannot properly route the event.

### 2. `ON_BOTH_JOIN` (Server → Client)
**When to emit:** When BOTH participants have joined the session
**Payload:**
```javascript
{
  socketReq: {
    newEndTime: "HH:MM"  // Optional: Extended session end time
  }
}
```

**Critical:** This event MUST be emitted to both participants when:
- Trainer has joined AND Trainee has joined
- Both have emitted `ON_CALL_JOIN` with valid `sessionId`

**Frontend Handler:** Sets `bothUsersJoined = true` and clears waiting messages

## Current Frontend Behavior

The frontend sets `bothUsersJoined = true` in THREE ways:
1. **WebRTC Stream Event** (`call.on("stream")`) - Most reliable, fires when peer connection establishes
2. **Backend Event** (`ON_BOTH_JOIN`) - Backend confirmation that both users are in session
3. **Fallback Detection** - If remote stream exists but flag isn't set, frontend sets it automatically

## Potential Backend Issues

If the waiting message persists even when both users are connected, check:

1. **Is `ON_BOTH_JOIN` being emitted?**
   - Check backend logs for when this event is sent
   - Verify it's sent to BOTH participants (trainer AND trainee)
   - Ensure it's sent AFTER both have emitted `ON_CALL_JOIN`

2. **Is `sessionId` included in `ON_CALL_JOIN`?**
   - Frontend requires `sessionId` to properly route events
   - Without it, backend may not know which session the user is joining

3. **Timing Issues:**
   - If `ON_BOTH_JOIN` is emitted too early (before WebRTC connection), frontend may not have `remoteStream` yet
   - Frontend fallback handles this, but backend should emit after both users are confirmed connected

## Testing Checklist

- [ ] Trainer joins → Backend receives `ON_CALL_JOIN` with `sessionId`
- [ ] Trainee joins → Backend receives `ON_CALL_JOIN` with `sessionId`
- [ ] Backend emits `ON_BOTH_JOIN` to BOTH trainer and trainee
- [ ] Frontend receives `ON_BOTH_JOIN` and sets `bothUsersJoined = true`
- [ ] Waiting message disappears after `ON_BOTH_JOIN` is received

## Frontend Logs to Check

Look for these console logs to debug:
- `[VideoCallUI] Received ON_BOTH_JOIN event from backend` - Confirms backend event received
- `[VideoCallUI] Setting bothUsersJoined to true` - Confirms flag is being set
- `[VideoCallUI] Showing waiting message` - Shows why message is still visible
- `[VideoCall] Received ON_CALL_JOIN event` - Confirms join events are being received
