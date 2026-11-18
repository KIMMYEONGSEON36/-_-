# Design Flow --- User Flow

## 1. Requester Flow

Landing → Request type selection → Requester information → Request
details (conditional form) → Deadline / quantity / reference information
→ Review summary → Submit → Confirmation screen with request number

### Branches

-   New design → production type, purpose, content, usage, size,
    quantity
-   Revision → existing design, change details, deadline
-   Reorder → item, quantity, same design confirmation, delivery
-   Consultation → purpose, context, designer recommendation request

## 2. Designer Flow

Login → Dashboard → New request notification / Requests list → Request
detail → AI analysis → Review missing information → Edit task steps /
estimates / priority → Approve analysis → Create tasks → Task list or
calendar → Start / update / wait / complete → Log actual time → Close
task

## 3. AI Analysis Flow

Request submitted → Validate required fields → Save original request →
AI analysis → Validate structured output → Save AI analysis → Display to
designer → Designer review → Approve or edit → Create task and task
steps

### Error branch

AI failure → Request remains saved → Show analysis failed status → Allow
manual task creation or retry → Never lose submitted request

## 4. Task Management Flow

Task detail → Review task steps → Edit / add / remove steps → Set
deadline → Set priority → Start work → Record time → Update status →
Complete

## 5. Request Status Visibility

MVP requester does not necessarily need real-time tracking. Initial
confirmation should communicate: - Request received - Request number -
The design team will review - Missing information may be requested -
Requested deadline is not automatically guaranteed

## 6. Navigation

Requester: - Request landing - Form - Review - Confirmation

Designer: - Dashboard - Requests - Tasks - Calendar - Analytics
(later) - Settings (later)

## 7. UX Decisions

-   Do not require requester account in MVP unless security or
    operational needs demand it.
-   Do not expose designer workspace to public users.
-   Keep form questions conditional.
-   Use mobile-friendly touch targets.
-   Save draft functionality is optional for MVP.
-   Task creation requires designer approval of AI analysis.
