## Netqwix Frontend – Stabilization & Refactor Plan

This document describes how the current frontend is structured and the concrete steps we should take to make it **more stable**, **easier to reason about**, and **safer to change** – especially around **video calling / clip mode** and **bookings / timers**.

---

## 1. Current Architecture (High Level)

- **Framework / Routing**
  - Next.js app using the legacy **`pages/`** router:
    - Top-level routes in `pages/**` (e.g. dashboard, meeting room, auth, landing).
    - Shared layout pieces under `pages/common/**`.
  - Feature UIs are implemented under `app/components/**` and wired into those pages.

- **State Management**
  - Redux-style slices and hooks:
    - `app/components/**.slice.js` (e.g. `auth.slice.js`, `common.slice.js`, `instantLesson.slice.js`, `notifications-service/notification.slice.js`, `trainee/trainee.slice.js`).
    - Accessed with `useAppSelector` / `useAppDispatch` from `app/store` (via `AuthGuard`, `DashboardLayout`, etc.).

- **Networking / APIs**
  - Local API helpers under:
    - `app/components/common/common.api.js`
    - `app/components/auth/auth.api.js`
    - `app/components/trainee/trainee.api.js`
    - `app/components/master/master.api.js`
  - Shared formatting / timezone helpers in `utils/utils.js`.

- **Video Calling & Clip Mode**
  - Core call UI and logic in:
    - `app/components/video/video.jsx`
    - `app/components/video/hooks/useVideoState.js`
    - `app/components/video/callEngine.js`, `callQualityMonitor.js`, `callDiagnostics.js`
  - Portrait calling and clip analysis in:
    - `app/components/portrait-calling/index.jsx` (main call UI)
    - `app/components/portrait-calling/clip-mode.jsx` (clip analysis mode)
    - `app/components/portrait-calling/one-on-one-call.jsx`
    - `app/components/portrait-calling/user-box.jsx`, `time-remaining.jsx`, `custom-video-controls.jsx`
  - Socket wiring via `app/components/socket/SocketProvider.jsx` and `helpers/events.ts`.

- **Bookings & Scheduling**
  - Booking UI and logic in:
    - `app/components/bookings/index.jsx` + subcomponents (`BookingCard.jsx`, `TrainerRenderBooking.jsx`, `TraineeRenderBooking.jsx`, `UpcomingSession.js`, etc.).
    - `app/components/bookings/hooks/useBookings.js`.
  - Scheduling / inventory UIs in `app/components/trainee/scheduleTraining/**` and `app/components/schedule/**`.
  - Timezone / timer helpers in `utils/utils.js` and `app/components/portrait-calling/time-remaining.jsx`.

---

## 2. Key Pain Points Observed

These are the core reasons the code feels “fucked up” and fragile right now:

- **Tight coupling between UI and side effects**
  - Components like `clip-mode.jsx`, `video.jsx`, `index.jsx` (portrait calling) contain **socket event wiring, timer math, DOM refs, and UI rendering all in one file**.
  - This makes it very easy for a new change (e.g. timer, camera, or clip mode tweak) to accidentally affect multiple behaviors.

- **Duplicated / inconsistent logic**
  - Similar concepts (timers, play/pause, timezones) appear in multiple places:
    - Timers: `video/video.jsx`, `video/Timer.jsx`, `portrait-calling/time-remaining.jsx`, `utils.utils.js` (meetingAvailability).
    - Play/pause: both per-clip (`VideoContainer`) and dual/lock mode (`ClipModeCall`) implement their own socket and DOM handling.
    - Time conversion: a mix of moment, luxon, and custom helpers used in different ways.

- **Large, multi-purpose components**
  - `app/components/portrait-calling/index.jsx` and `clip-mode.jsx` are **very large files** that:
    - Manage Redux state, socket subscriptions, timers, layout modes, drawing, clip selection, AND video DOM at once.
  - This size makes it hard to safely change any one behavior (like clip play/pause) without side effects.

- **Implicit contracts between frontend and backend**
  - Frontend frequently assumes certain shapes for:
    - Timer events (`TIMER_STARTED`, `LESSON_TIMER.STARTED`), `remainingSeconds`, and booking fields.
    - Clip selection / play events (`ON_VIDEO_PLAY_PAUSE`, `ON_VIDEO_TIME`, `ON_VIDEO_SELECT`).
  - These contracts are **not centrally documented in the frontend**, so small backend changes (or even just understanding issues) can cause regressions.

---

## 3. Stabilization Strategy (What To Change)

We should stabilize in **layers**, not by rewriting everything at once.

### 3.1. Extract domain-specific hooks / services

**Goal:** Move complex logic *out* of React components into testable hooks/services.

- **Video calling / clip mode**
  - Extract a `useClipModePlayer` hook from `clip-mode.jsx` and `VideoContainer` that owns:
    - Local play/pause state and `videoRef` lifecycle.
    - Socket event subscription for `ON_VIDEO_PLAY_PAUSE`, `ON_VIDEO_TIME`, `ON_VIDEO_ZOOM_PAN`.
    - A clear API like:
      - `play()`, `pause()`, `seekTo(seconds)`, `setLockMode(on/off)`.
  - Extract a `useLessonTimer` hook from `portrait-calling/index.jsx` + `video.jsx`:
    - Handles `TIMER_STARTED`, `LESSON_TIME_*` events, and `bothUsersJoined`.
    - Exposes `{ remainingSeconds, status }` to UI components only.

- **Bookings**
  - Extract booking-time logic from `useBookings.js` and `utils.utils.js` into:
    - `useBookingTimers` – returns `isUpcoming`, `isStartEnabled`, `isCompleted` using a **single** source of truth for time math.
    - A central `timeUtils` module that wraps luxon/moment so we don’t sprinkle ad-hoc date handling throughout the app.

### 3.2. Normalize socket event handling

**Goal:** Make all socket interactions use **one consistent pattern** so we don’t get “sometimes works” behavior.

- Introduce a small layer on top of `SocketContext`, e.g. `socketClient.ts`:
  - Functions like:
    - `emitClipPlayPause({ clipId, both, isPlaying })`
    - `emitClipSeek({ clipId, both, progress })`
    - `emitLessonTimerJoin({ sessionId })`
  - Internally does the `userInfo: { from_user, to_user }` wiring in one place.

- In UI components:
  - Only call those helper functions; **do not embed raw event names + payload objects** everywhere.
  - For `ON_VIDEO_PLAY_PAUSE` / `ON_VIDEO_TIME`, centralize subscription and fan-out:
    - A hook like `useClipSync(sessionId)` that:
      - Subscribes once to `ON_VIDEO_PLAY_PAUSE`, `ON_VIDEO_TIME`.
      - Routes events to registered callbacks based on `clipId` / `both`.

### 3.3. Clarify routing and layout structure

**Goal:** Make it clear how you reach each feature (bookings, calling, clip mode) and where shared layout lives.

- Standardize page structure:
  - Dashboard & meeting pages:
    - `pages/dashboard/**` should all use `DashboardLayout` from one place.
    - `pages/meeting/index.jsx` should be thin and delegate to `app/features/meeting/index.jsx` (feature-level component).
  - For new features, prefer:
    - `pages/...` → minimal shell:
      - auth guard
      - layout wrapper
      - renders `app/features/<feature>/index.jsx`.

- Add a **routing overview** section in this doc (or a separate `ROUTING.md`) mapping:
  - URL → page file → main feature component.

### 3.4. Standardize time and timezone utilities

**Goal:** Have exactly one way to:

- Convert UTC → viewer local time
- Format HH:mm and date strings
- Determine if a session is upcoming/active/completed

Steps:

- In `utils/utils.js`, clearly separate:
  - **Pure formatters**: `formatToHHMM`, `convertToAmPm`, `getDateInLocalFormat`, `formatTime`.
  - **Business rules**: `meetingAvailability`, `has24HoursPassedSinceBooking`, etc.
- Replace scattered date/time math in:
  - `bookings/**`
  - `NavHomePage/index.jsx` (active sessions)
  - `portrait-calling/index.jsx` / `time-remaining.jsx`
  with calls to those utilities instead of re-implementing logic.

### 3.5. Make large components composable

**Goal:** Shrink “god components” into smaller, clear pieces.

Initial targets:

- `app/components/portrait-calling/index.jsx`
  - Split into:
    - `VideoCallShell` (socket wiring, timers, call state).
    - `VideoCallLayout` (already exists under `video/components` – reuse/align).
    - `ClipModePanel` and `OneOnOnePanel`.

- `app/components/portrait-calling/clip-mode.jsx`
  - Split into:
    - `ClipModeLayout` (top-level layout, sidebar, toolbar).
    - `ClipModeControls` (play/pause, lock, timeline).
    - `ClipModeCanvasOverlay` (drawing tools).
    - `VideoContainer` (already exists: isolate to only video-related concerns).

Each new subcomponent should:

- Receive **data + callbacks** as props.
- Avoid directly touching **socket**, **Redux**, or **DOM refs** when not needed.

---

## 4. Concrete To-Do List (Suggested Order)

1. **Create core docs (this file + ROUTING.md + SOCKET_EVENTS.md)**
   - Document:
     - Key pages and their main components.
     - Socket events used by video/clip mode and bookings.
     - Timer/timezone expectations (what backend sends, what frontend expects).

2. **Extract `useLessonTimer` and centralize timer math**
   - Move all timer logic (backend `remainingSeconds`, `bothUsersJoined`, fallback to `sessionEndTime`) into a hook.
   - Use that hook in:
     - `video/video.jsx` (header/time display).
     - `portrait-calling/index.jsx` (TimeRemaining).

3. **Create socket helper layer (`socketClient`)**
   - Wrap all `emit` calls for:
     - Clip play/pause, seek, zoom/pan, hide/show.
     - Lesson timer join/events.

4. **Refactor clip-mode play/pause into `useClipModePlayer`**
   - API:
     - `playClip(clipId)`, `pauseClip(clipId)`, `toggleLockMode()`, `seek(progress)`.
   - Internals:
     - Handle `videoRef` readiness, queuing socket events if necessary.
     - Subscribe once to `ON_VIDEO_PLAY_PAUSE` / `ON_VIDEO_TIME`.

5. **Break down `portrait-calling/index.jsx`**
   - Extract view-only components (no side-effects).
   - Keep side-effectful logic (socket + timers) in a focused hook or container.

6. **Normalize bookings time handling**
   - Use `Utils.meetingAvailability` and time helpers consistently in:
     - `BookingCard.jsx`
     - `useBookings.js`
     - `NavHomePage/index.jsx`
   - Remove duplicate “upcoming/past” logic outside these utilities.

---

## 5. Coding Guidelines Going Forward

To keep the frontend stable as we change it:

- **Keep side effects out of presentational components**
  - Socket subscriptions, timers, and Redux side effects belong in:
    - Hooks (`useXxx`)
    - Thin container components
  - UI components should accept props and render.

- **One source of truth per concept**
  - Only one module decides:
    - How timers work.
    - How clip play/pause sync works.
    - How we determine “upcoming / active / past”.

- **Prefer small, focused files**
  - Aim for components under ~300–400 lines.
  - If a file mixes multiple concerns (layout + logic + sockets), plan a split.

- **Document contracts with backend**
  - For any socket event or API that drives UI behavior, add it to:
    - `SOCKET_EVENTS.md` (to be created).
  - Include payload shape and which components depend on it.

This plan is meant to be incremental: we can implement it feature by feature (starting with **calling + clip mode** and **bookings/timers**, since that’s where bugs are currently most painful) without freezing other ongoing work.

---

## 6. Step‑By‑Step Functional Fix Roadmap

This section is the **practical checklist** of what we will fix, one by one, and roughly how.

Each item has:
- **Goal** – the behavior we want.
- **Where** – main files/modules to touch.
- **How (steps)** – concrete steps to implement.

### 6.1. Clip Mode Play/Pause (Trainer ↔ Trainee)

- **Goal**
  - When trainer presses **Play/Pause** in clip mode:
    - Trainer’s own clips respond immediately.
    - Trainee’s clips follow exactly (single clip and dual/lock mode).
    - Behavior is consistent regardless of who uploaded the clip.

- **Where**
  - `app/components/portrait-calling/clip-mode.jsx`
  - `VideoContainer` (inside `clip-mode.jsx`)
  - `helpers/events.ts`
  - `src/modules/socket/socket.service.ts` (backend forwarding – already simple)

- **How (steps)**
  1. **Introduce `useClipModePlayer` hook** (frontend):
     - API: `play(clipId)`, `pause(clipId)`, `toggleLock()`, `seek(clipId, progress)`.
     - Internal:
       - Holds `videoRefs` and `isPlaying` state for each clip.
       - Subscribes once to `ON_VIDEO_PLAY_PAUSE` / `ON_VIDEO_TIME`.
       - On trainer actions:
         - Update local state.
         - Emit a **normalized event** via a helper like `socketClient.emitClipPlayPause`.
  2. **Refactor `VideoContainer` to be “dumb”**:
     - It receives `isPlaying`, `onTogglePlay`, `onSeek` via props.
     - It no longer calls `socket.emit` directly.
  3. **Refactor `ClipModeCall` dual/lock mode**:
     - Use `useClipModePlayer` for both videos.
     - For lock mode, use a shared `playBoth()` / `pauseBoth()` that:
       - Plays/pauses locally.
       - Emits one `both: true` event.
  4. **Keep backend as a thin forwarder** (current behavior is fine):
     - Only verify `listenPlayPauseVideoEvent` forwards events unchanged.

### 6.2. Timer Behavior (Start Only When Both Users Are in Room)

- **Goal**
  - Lesson/instant meeting timer:
    - Starts **only** when both trainer and trainee are in the call.
    - Shows the **full booked duration** at that moment (e.g. whole 15 minutes).
    - Stays in sync if someone disconnects/rejoins.

- **Where**
  - Frontend:
    - `app/components/portrait-calling/index.jsx`
    - `app/components/portrait-calling/time-remaining.jsx`
    - `app/components/video/video.jsx`
  - Backend:
    - `src/modules/socket/socket.service.ts` (`lessonSessions`, `LESSON_TIMER.STARTED`)

- **How (steps)**
  1. **Finalize `useLessonTimer` hook**:
     - Input:
       - `sessionId`, `bothUsersJoined`, backend `TIMER_STARTED` / `LESSON_TIMER.STARTED` events.
     - Output:
       - `remainingSeconds`, `status` (`waiting`, `running`, `ended`).
  2. **Use `useLessonTimer` in both**:
     - `portrait-calling/index.jsx` → `TimeRemaining` gets `remainingSeconds`.
     - `video/video.jsx` → header text uses the same `remainingSeconds`.
  3. **Backend: ensure `duration` and `remainingSeconds` are always set correctly** for:
     - Scheduled bookings.
     - Instant meetings (duration from `bookInstantMeeting` pay-load).

### 6.3. Booking Timezones & Start/End Times

- **Goal**
  - Trainer and trainee both see **correct local times** for:
    - Scheduled sessions.
    - Instant meetings (even when `time_zone` is `null`).
  - Tabs (Upcoming / Past / Canceled) are computed consistently.

- **Where**
  - `app/components/bookings/hooks/useBookings.js`
  - `app/components/bookings/components/BookingCard.jsx`
  - `app/components/NavHomePage/index.jsx` (Active sessions)
  - `utils/utils.js` (time utils)

- **How (steps)**
  1. **Centralize booking time normalization**:
     - Add a helper like `normalizeBookingTimes(booking)` that:
       - Derives `startDateTimeUtc` and `endDateTimeUtc` from `start_time` / `end_time` / `session_*`.
  2. **Update `useBookings` and `BookingCard` to use normalized values**:
     - For filtering (Upcoming/Past).
     - For display (`Utils.formatTime(...)`, `getDateInLocalFormat(...)`).
  3. **Update `NavHomePage` active-sessions**:
     - Use the same normalized function to avoid divergence.

### 6.4. Camera / `UserBox` Stability

- **Goal**
  - Local and remote video boxes (`UserBox`, `UserBoxMini`) always:
    - Attach the correct `MediaStream`.
    - Respect selection/minimize state (no black boxes or wrong stream).

- **Where**
  - `app/components/portrait-calling/user-box.jsx`
  - `app/components/portrait-calling/one-on-one-call.jsx`
  - `app/components/portrait-calling/clip-mode.jsx`

- **How (steps)**
  1. **Lock in the ID ↔ stream mapping**:
     - Ensure everywhere we pass:
       - `id={user._id}`, `user={user}`, `videoRef={local|remote}`, `stream={localStream|remoteStream}`.
  2. **Simplify `UserBox` ref logic**:
     - Wrap the `effectiveStream` behavior into a small helper:
       - `attachStream(videoElement, stream)` used consistently in `useEffect`.
  3. **Add a tiny runtime guard**:
     - If `stream` is missing but `videoRef.current.srcObject` exists, we re-use it.

### 6.5. Instant Lesson Flow (Request → Accept → Join)

- **Goal**
  - The instant-lesson experience is predictable:
    - Trainee sends request.
    - Trainer accepts/declines.
    - Both are guided into the same meeting with correct duration and clips loaded.

- **Where**
  - Frontend:
    - `app/components/instant-lesson/InstantLessonModal.jsx`
    - `app/components/instant-lesson/InstantLessonTraineeModal.jsx`
    - `app/components/instant-lesson/useInstantLessonSocket.js`
    - `app/components/instant-lesson/instantLesson.slice.js`
  - Backend:
    - `src/modules/socket/socket.service.ts` (INSTANT_LESSON.* events)
    - `src/modules/trainee/traineeService.ts` (`bookInstantMeeting`)

- **How (steps)**
  1. **Document the full instant-lesson state machine** in this MD or a new one:
     - States: `idle → requested → accepted/declined → joining → in_call`.
     - Map each state to the responsible slice fields and UI.
  2. **Refactor `useInstantLessonSocket` to a clear FSM**:
     - Single hook owning the transitions between those states.
  3. **Ensure meeting join uses the same lesson timer + bookings normalization** as regular sessions.

---

## 7. TypeScript Migration (JSX → TSX)

We’ll migrate incrementally, starting with **core logic** and shared utilities, then moving to components.

### 7.1. Principles

- Do **not** try to convert the whole app in one go.
- Start with:
  - Shared utilities (`utils/utils.js` → `utils/utils.ts`).
  - Socket helpers (`socketClient.ts`).
  - New hooks (`useLessonTimer.ts`, `useClipModePlayer.ts`).
- Only then move feature components (`video.jsx`, `clip-mode.jsx`, etc.) to `.tsx`.

### 7.2. Order of Migration

1. **Create TS config & base types**
   - Add / update `tsconfig.json` with:
     - `strict: true` (or at least `strictNullChecks`).
     - Path aliases for `app/**`, `utils/**`, etc.
   - Add `types/` folder:
     - `types/booking.ts`
     - `types/user.ts`
     - `types/video.ts`
     - `types/socket.ts` (event payloads).

2. **Convert core utils**
   - `utils/utils.js` → `utils/utils.ts`:
     - Add types for date/time helpers, `meetingAvailability` return type, etc.
   - Fix import paths in components (JS can import TS seamlessly under Next.js).

3. **Convert new hooks & socket layer**
   - Implement `socketClient.ts` (typed event emitters / listeners).
   - Implement `useLessonTimer.ts`, `useClipModePlayer.ts` **in TypeScript from day one**.

4. **Convert focused feature modules to TSX**
   - Start with **smaller but central** components:
     - `app/components/video/Timer.jsx` → `Timer.tsx`.
     - `app/components/portrait-calling/time-remaining.jsx` → `time-remaining.tsx`.
   - Then move larger ones:
     - `video/video.jsx` → `video.tsx` once hooks are typed.
     - `portrait-calling/clip-mode.jsx` → `clip-mode.tsx` after `useClipModePlayer`.

5. **Optional: stricter linting**
   - Enable ESLint rules for:
     - No implicit `any`.
     - No unused vars / imports.
     - Prefer readonly where possible.

---

## 8. How to Use This File Day‑to‑Day

- Treat sections **6.x** as your **working checklist**.
- When you start a task:
  - Add a short bullet under that subsection: “In progress – branch X”.
  - Note any extra decisions or gotchas you discover.
- When you finish:
  - Mark it as **done** in this MD (e.g. “(DONE in commit `abc123`)”).

Over time, this file becomes both your **plan** and a light **changelog** of the structural fixes that made the frontend stable.﻿

---

## 9. High‑Level Checklist With Time & Testing

This is the **practical project checklist** you asked for: what we’ll do, which files it touches, a rough time estimate, and how we’ll test. We’ll update items here as we complete them.

### 9.1. Routing & Dashboard Layout Consistency

- **Goal**
  - Clean, predictable routing where dashboard pages share a single layout and don’t each re‑implement data fetching or socket setup.
- **Key files**
  - `pages/dashboard/*.jsx`
  - `app/components/dashboard/DashboardLayout.jsx`
  - `app/features/dashboard/DashboardPage.jsx`
  - `app/components/auth/AuthGuard.jsx`
- **Work plan**
  - [ ] Ensure all `pages/dashboard/*` wrap content with `AuthGuard` + `DashboardLayout`.
  - [ ] Move common dashboard data fetch (bookings, notifications, active sessions) into a shared hook (e.g. `useDashboardData`) used by `DashboardLayout` or `DashboardPage`.
  - [ ] Replace duplicated fetch‑on‑mount logic in individual dashboard pages with selectors from the shared Redux state.
- **Estimate**
  - ~2–3 day including manual testing.
- **Testing**
  - Navigate across all dashboard routes and verify:
    - Layout frame (sidebar/header) is stable and doesn’t remount.
    - API calls in devtools network tab are not duplicated on each tab change.

### 9.2. API Calls on Each Refresh / Navigation

- **Goal**
  - Stop refetching the same data every time a component renders or the user switches tabs; rely on Redux state and controlled polling instead.
- **Key files**
  - `app/components/common/common.api.js`
  - `app/components/bookings/index.jsx`
  - `app/components/bookings/hooks/useBookings.js`
  - `app/components/NavHomePage/index.jsx`
  - Any component with `useEffect(() => { dispatch(getXxx()) }, [])`.
- **Work plan**
  - [ ] For each major dataset (bookings, upcoming sessions, notifications, clips), pick a **single owner** (top‑level container or layout) to perform the initial fetch.
  - [ ] Update children to read from Redux via `useAppSelector` only, removing extra fetches.
  - [ ] Where auto‑refresh is needed, add a `usePolling` hook that can be reused and easily disabled.
- **Estimate**
  - ~1–1.5 days depending on how many components currently refetch.
- **Testing**
  - Use devtools network tab:
    - Load the dashboard and switch tabs multiple times.
    - Confirm each key endpoint is only called when truly needed (initial load, explicit refresh).

### 9.3. Image Loading & Skeletons

- **Goal**
  - Make image loading (profile pictures, thumbnails, banners) robust and avoid layout shifts or broken images.
- **Key files**
  - `app/components/common/LazyImage.jsx`
  - `app/components/common/ImageSkeleton.jsx`
  - `app/components/portrait-calling/user-box.jsx`
  - `app/components/share-clips/index.jsx`
  - `app/components/locker/my-clips/index.jsx`
  - `app/components/NavHomePage/banner/index.jsx`
- **Work plan**
  - [ ] Standardize around one abstraction (`LazyImage` or `NetqwixImage`) that:
    - Handles loading and error states.
    - Provides correct `object-fit`, border radius, and fallback images.
  - [ ] Replace raw `<img>` tags in critical components with this abstraction.
  - [ ] Where possible, use Next `<Image>` for static/landing pages for better optimization.
- **Estimate**
  - ~0.5–1 day.
- **Testing**
  - Simulate slow network in devtools and verify:
    - Skeletons show while loading.
    - No “broken image” icons.
    - No big layout jumps when images appear.

### 9.4. Clip Mode Play/Pause & Sync (Trainer ↔ Trainee)

- **Goal**
  - Fully reliable clip playback for both trainer and trainee in single‑clip and dual/lock modes.
- **Key files**
  - `app/components/portrait-calling/clip-mode.jsx`
  - `helpers/events.ts`
  - `app/components/socket/SocketProvider.jsx`
  - Backend: `src/modules/socket/socket.service.ts` (ON_VIDEO_* handlers)
- **Work plan**
  - [ ] Implement `useClipModePlayer` with a clear API and internal socket wiring (as detailed in 6.1).
  - [ ] Make `VideoContainer` and `ClipModeCall` use this hook instead of talking to sockets directly.
  - [ ] Ensure late‑join scenarios (trainer/trainee joining after playback started) receive current play/pause + time state.
- **Estimate**
  - ~1.5–2.5 days including multi‑client testing.
- **Testing**
  - Use two browsers/devices:
    - Verify trainer play/pause and seek in:
      - Single‑clip mode.
      - Dual‑clip lock mode.
    - Test changing clips, removing clips, and joining late.

### 9.5. Lesson Timer & “Both Users Joined” Logic

- **Goal**
  - Timer starts only when both are in the call, counts full duration, and stays in sync between trainer/trainee and dashboard/meeting views.
- **Key files**
  - Frontend:
    - `app/components/portrait-calling/index.jsx`
    - `app/components/portrait-calling/time-remaining.jsx`
    - `app/components/video/video.jsx`
  - Backend:
    - `src/modules/socket/socket.service.ts` (lessonSessions + LESSON_TIMER.*)
- **Work plan**
  - [ ] Implement `useLessonTimer` and use it across calling/meeting UIs (see 6.2).
  - [ ] Confirm backend always emits `duration` and `remainingSeconds` correctly for both scheduled and instant meetings.
- **Estimate**
  - ~1–2 days.
- **Testing**
  - Book both scheduled and instant sessions:
    - Join as trainer first, then trainee, and vice‑versa.
  - Verify timer:
    - Only starts once both are present.
    - Shows full duration.
    - Doesn’t reset incorrectly on reconnect.

### 9.6. Booking Timezones & Tabs (Upcoming/Past/Canceled)

- **Goal**
  - Consistent, timezone‑correct booking times for trainer and trainee, with correct tab classification.
- **Key files**
  - `app/components/bookings/hooks/useBookings.js`
  - `app/components/bookings/components/BookingCard.jsx`
  - `app/components/NavHomePage/index.jsx`
  - `utils/utils.js`
- **Work plan**
  - [ ] Create a single `normalizeBookingTimes(booking)` that outputs canonical start/end DateTimes.
  - [ ] Use that function everywhere we:
    - Filter bookings into Upcoming/Past/Canceled.
    - Display dates and times in UI.
- **Estimate**
  - ~1 day.
- **Testing**
  - Create cross‑timezone bookings and confirm:
    - Each side sees correct local time.
    - Sessions appear in the expected tab.

### 9.7. Progressive TS Migration for Core Logic

- **Goal**
  - Make future work safer by adding types around the most fragile areas (time, sockets, timers).
- **Key files (initial)**
  - `utils/utils.js` → `utils/utils.ts`
  - New hooks: `useLessonTimer.ts`, `useClipModePlayer.ts`
  - Socket helper: `socketClient.ts`
- **Work plan**
  - [ ] Define core types in `types/` (booking, user, video, socket events).
  - [ ] Convert utilities and new hooks to TypeScript first.
  - [ ] Convert selected components to `.tsx` once helpers are typed.
- **Estimate**
  - Interleaved with other tasks; ~0.5–1 day per chunk converted.
- **Testing**
  - TS compiler + ESLint clean.
  - Quick manual sanity checks on screens using the converted modules.