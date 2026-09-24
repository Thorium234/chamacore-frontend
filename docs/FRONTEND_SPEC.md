# ChamaCore Frontend Specification

**File:** `FRONTEND_SPEC.md`
**Project:** ChamaCore
**Repository:** `Thorium234/Chamacore`
**Purpose:** Strict implementation specification for the ChamaCore web frontend.

---

# 1. Mission

Build a production-quality web frontend for the existing ChamaCore backend API.

The frontend is a **consumer of the backend API**.

It is not a second implementation of ChamaCore's business logic.

The backend remains authoritative for:

* Authentication
* Authorization
* Chama membership
* Roles
* Permissions
* Contributions
* Shares
* Payments
* Ledger
* Financial balances
* Financial transaction state
* Validation
* Idempotency
* Auditability
* Financial calculations

The frontend must display and interact with these capabilities through the existing API.

---

# 2. Absolute Rule

## DO NOT invent backend functionality.

If an endpoint does not exist in the API contract:

**DO NOT create a frontend implementation for it.**

Do not write fake API calls such as:

```ts
api.get("/loans")
```

unless `/loans` actually exists in the backend API contract.

Do not guess endpoint names.

Do not guess request payloads.

Do not guess response structures.

Do not guess permission names.

Do not guess status values.

Do not guess pagination formats.

The authoritative source is the current backend API contract.

---

# 3. Backend Is the Source of Truth

The frontend must treat the backend as authoritative.

The following must never be calculated independently in the browser when the backend provides the value:

* account balance
* available balance
* contribution totals
* ledger totals
* share totals
* payment status
* financial status
* permissions
* Chama membership status
* transaction status

Bad:

```ts
const balance = contributions - withdrawals;
```

Correct:

```ts
const balance = account.balance;
```

if the API provides the authoritative balance.

---

# 4. Scope

The frontend implementation includes only capabilities that are currently supported by the backend.

Initial scope:

```text
Authentication
    ↓
Current User
    ↓
Chama Selection
    ↓
Dashboard
    ↓
Members
    ↓
Contributions
    ↓
Shares
    ↓
Ledger
    ↓
Payments
    ↓
Profile
    ↓
Permissions-aware navigation
```

The following are explicitly outside the current frontend scope:

```text
USSD
React Native
Mobile application
Loan UI if loan API is not implemented
Payout UI if payout API is not implemented
Reconciliation UI if reconciliation API is not implemented
Backend audit administration if API is not exposed
Backend notification administration if API is not exposed
Daraja implementation
M-Pesa callback handling
Payment provider credentials
Database access
Direct PostgreSQL access
```

---

# 5. Frontend Architecture

Use a clear separation between:

```text
UI
 ↓
Feature Components
 ↓
Hooks / Query Layer
 ↓
API Client
 ↓
HTTP
 ↓
ChamaCore API
```

Do not allow components to directly scatter raw `fetch()` calls throughout the application.

Bad:

```tsx
const Dashboard = () => {
    fetch("/api/whatever");
};
```

Preferred:

```text
Component
   ↓
useDashboard()
   ↓
dashboardApi.getSummary()
   ↓
apiClient
```

The exact libraries may vary, but the architectural separation is mandatory.

---

# 6. API Client

Create one centralized API client.

Responsibilities:

* base URL
* authentication headers
* request serialization
* response parsing
* error normalization
* timeout handling
* request correlation where required
* authentication failure handling

Do not duplicate HTTP configuration across features.

Bad:

```text
members/page.tsx
    fetch(...)

payments/page.tsx
    axios(...)

ledger/page.tsx
    fetch(...)

dashboard/page.tsx
    fetch(...)
```

Correct:

```text
api/
    client
    auth
    users
    chamas
    members
    contributions
    shares
    ledger
    payments
```

---

# 7. Environment Configuration

Never hard-code the backend URL.

Use environment configuration.

Example:

```env
NEXT_PUBLIC_API_URL=
```

The actual variable name must follow the selected frontend framework's conventions.

Never commit:

```text
production API secrets
JWT secrets
database passwords
Daraja credentials
payment credentials
```

Frontend environment variables must be treated as public unless the framework explicitly guarantees otherwise.

---

# 8. Authentication

Implement authentication strictly according to the backend API.

The frontend must understand:

```text
Unauthenticated
Authenticated
Session expired
Refresh required
Logout
```

Do not implement a custom authentication protocol.

Do not modify JWT structure.

Do not decode tokens and assume permissions from token contents unless the backend contract explicitly defines that behavior.

The backend decides whether the user is authorized.

---

# 9. Token Handling

If the backend uses access and refresh tokens:

```text
Access token
    ↓
API request
    ↓
401
    ↓
Refresh
    ↓
Retry original request
```

The refresh process must not create infinite loops.

Never do:

```text
401
→ refresh
→ 401
→ refresh
→ 401
→ refresh
```

Maximum one refresh attempt per failed request.

If refresh fails:

```text
clear session
redirect to login
```

Do not silently keep the user in an invalid authenticated state.

---

# 10. Authentication Race Conditions

Multiple requests may fail simultaneously when an access token expires.

Do not issue ten refresh requests simultaneously.

Use a single refresh coordination mechanism.

Conceptually:

```text
Request A ─┐
Request B ─┼──> token expired
Request C ─┘
             ↓
        ONE refresh
             ↓
       new access token
             ↓
   retry pending requests
```

This must be tested.

---

# 11. Logout

Logout must use the backend's supported logout/revocation mechanism.

The frontend must then:

* clear authentication state
* clear cached private data
* clear selected Chama state where appropriate
* prevent access to protected pages
* redirect to login

Sensitive financial data must not remain visible after logout.

---

# 12. Current User

After authentication, load the authenticated user's information using the backend API.

Do not construct a fake user object from local assumptions.

The current user should be the source for:

* name
* email
* identity
* roles
* permissions where exposed
* membership information where exposed

---

# 13. Chama Context

ChamaCore is multi-Chama.

The frontend must therefore maintain an explicit active Chama context.

Example:

```text
Current User
     ↓
Available Chamas
     ↓
Active Chama
     ↓
Feature queries
```

Every Chama-scoped feature must operate against the active Chama.

Do not accidentally retain data from the previously selected Chama.

---

# 14. Chama Switching

When switching Chamas:

1. update active Chama
2. invalidate Chama-scoped cached data
3. reload relevant queries
4. update navigation state
5. prevent stale records from appearing

The UI must never show:

```text
Chama A selected
+
Chama B members
```

even temporarily if the architecture can prevent it.

---

# 15. Never Trust Local Chama State

The frontend may send a Chama identifier where required by the API.

That identifier is not an authorization mechanism.

The backend must validate access.

The frontend must never assume:

```ts
if (activeChamaId === userChamaId) {
    accessGranted();
}
```

Authorization remains server-side.

---

# 16. Dashboard

The dashboard should provide a concise financial overview using existing API data.

Only display metrics actually exposed by the API.

Potential sections:

```text
Chama overview
Member count
Contribution summary
Share summary
Account balances
Recent transactions
Recent payments
```

Do not invent metrics.

Do not create fake values to fill empty dashboard cards.

If an API does not expose a metric:

```text
do not display it
```

or display a clearly defined unavailable state.

---

# 17. Dashboard Rules

The dashboard must not become a second reporting engine.

Do not perform expensive financial aggregation in the browser.

Bad:

```text
download 10,000 transactions
↓
filter in JavaScript
↓
calculate totals
```

Correct:

```text
API
↓
server-side aggregation
↓
frontend displays result
```

---

# 18. Members

The members feature should support only operations exposed by the API.

Possible capabilities include:

```text
List members
Search members
View member
Create member
Update member
Change status
View member financial information
```

Only implement operations that actually exist.

---

# 19. Member Permissions

Member actions must be permission-aware.

For example:

```text
View members
Create member
Edit member
Change member status
```

must not be shown as available merely because the frontend developer believes the user should have access.

Use backend-provided permission information where available.

Even if the frontend hides an action, the backend remains responsible for enforcing authorization.

---

# 20. Contributions

The contribution interface must follow the backend API exactly.

Support only available operations.

Possible states:

```text
Pending
Confirmed
Failed
Reversed
```

Do not hard-code these values unless they exist in the API contract.

Use backend response values.

---

# 21. Contribution Creation

Before submitting:

* validate required fields
* validate numeric input
* prevent accidental double submission
* show submitting state
* display backend validation errors
* handle network failure

After success:

* refresh relevant contribution data
* refresh dashboard data if necessary
* refresh ledger data if affected
* show confirmation

Do not assume that a successful HTTP response means every related query is immediately updated locally.

Invalidate/refetch authoritative data.

---

# 22. Idempotency

If the backend requires an idempotency key for a financial operation, the frontend must generate and preserve it for the lifetime of that logical operation.

Example:

```text
User clicks Submit
    ↓
generate idempotency key
    ↓
send request
    ↓
network timeout
    ↓
retry SAME request
    ↓
SAME idempotency key
```

Do not generate a new key on every retry.

This is critical.

---

# 23. Prevent Double Submission

Financial actions must disable repeated submission while the request is pending.

Example:

```text
Submit contribution
       ↓
button disabled
       ↓
request pending
       ↓
response
       ↓
button enabled
```

However, UI disabling alone is not sufficient.

Backend idempotency remains the real protection.

---

# 24. Shares

If the API exposes shares:

Display:

* current shares
* share-related transactions
* relevant contribution/share information

Do not independently calculate share ownership unless the API explicitly requires client-side calculation.

---

# 25. Ledger

The ledger interface is read-oriented unless the backend explicitly exposes authorized ledger operations.

Display:

```text
Accounts
Entries
Transactions
Dates
Amounts
Descriptions
References
Statuses
```

Use server-side pagination.

Do not download the entire ledger.

---

# 26. Ledger Safety

The frontend must never provide arbitrary ledger editing.

Do not create:

```text
Edit ledger entry
Delete ledger entry
Change posted transaction
```

unless the backend explicitly exposes such a safe operation.

For an immutable financial ledger, the UI should reflect that immutability.

---

# 27. Financial Amounts

Financial amounts must be displayed consistently.

Create one formatting utility.

Example:

```ts
formatMoney(amount)
```

Do not format financial values independently in every component.

Never use floating-point arithmetic for financial calculations in the frontend.

Bad:

```ts
0.1 + 0.2
```

for financial computation.

Prefer backend-provided financial values and formatting utilities.

---

# 28. Payments

The frontend may display payment information exposed by the backend.

It must not implement payment-provider logic.

The frontend must never:

* call Daraja directly
* contain Daraja credentials
* validate M-Pesa callbacks
* confirm C2B transactions
* process provider webhooks
* settle payments into the ledger

The backend owns all provider integration.

---

# 29. Payment States

Display the backend's actual payment state.

Examples may include:

```text
Pending
Completed
Failed
```

Do not invent additional states.

If the backend returns an unknown future state, the UI should degrade safely rather than crash.

---

# 30. Error Handling

Create a centralized API error model.

At minimum distinguish:

```text
400 Validation
401 Authentication
403 Authorization
404 Not found
409 Conflict
422 Validation/business rule
429 Rate limit
500 Server error
503 Service unavailable
Network failure
Timeout
```

Exact statuses must follow the backend API.

Do not display raw backend stack traces to users.

---

# 31. Error Messages

User-facing errors should be understandable.

Bad:

```text
IntegrityError: psycopg2.errors.ForeignKeyViolation...
```

Better:

```text
The member could not be added because the selected Chama is unavailable.
```

However, do not hide useful backend validation information.

Map structured API errors into appropriate UI messages.

---

# 32. Loading States

Every asynchronous page must have a deliberate loading state.

Do not allow:

```text
blank white page
```

during normal data loading.

Use:

```text
skeleton
spinner
progress indicator
```

according to the design system.

Do not create excessive animation.

The application is a financial management system, not an animation showcase.

---

# 33. Empty States

Every list must have a meaningful empty state.

Examples:

```text
No members found.

No contributions recorded yet.

No ledger transactions found.

No payments found.
```

Do not treat an empty response as an error.

---

# 34. Pagination

Respect the backend's pagination model.

Do not assume offset pagination if the backend uses cursor pagination.

If the API returns:

```text
next_cursor
```

use it.

Do not implement custom pagination logic that contradicts the API.

---

# 35. Search

Search must use backend-supported search/filter parameters where available.

Do not fetch all records and filter locally unless the dataset is explicitly tiny and the API contract requires it.

For financial and membership data:

```text
server-side filtering
```

is preferred.

---

# 36. URL State

Where useful, preserve navigational state in the URL.

Examples:

```text
/members?page=2
/members?search=john
/ledger?account=...
/contributions?status=...
```

Only use parameters supported by the frontend's own routing design and backend API.

Do not expose sensitive information in URLs.

---

# 37. Responsive Design

The frontend must work on:

```text
Desktop
Laptop
Tablet
Mobile browser
```

Responsive does not mean creating a separate mobile application.

Do not create React Native.

Do not create a separate mobile codebase.

---

# 38. Navigation

Navigation must reflect the user's actual capabilities.

Possible navigation:

```text
Dashboard
Members
Contributions
Shares
Ledger
Payments
Settings
```

Only show sections supported by the API and available to the current user.

---

# 39. Permission-Based Navigation

Do not assume roles are equivalent to permissions.

If the API provides:

```text
permissions
```

use permissions.

If it provides:

```text
roles
```

use roles only where the backend contract explicitly defines role semantics.

Never create frontend-only authorization rules that contradict the backend.

---

# 40. Route Protection

Protected routes must require authentication.

Unauthenticated users should be redirected to login.

Authenticated users without permission should receive an appropriate forbidden state.

Do not rely solely on hiding navigation links.

The backend remains the final authorization layer.

---

# 41. Data Cache

Use a predictable server-state strategy.

Recommended behavior:

```text
GET
 ↓
cache
 ↓
display
 ↓
mutation
 ↓
invalidate affected queries
 ↓
refetch
```

Do not manually synchronize dozens of local copies of backend data.

Avoid unnecessary global state.

Use local component state for UI state.

Use server-state management for API state.

---

# 42. Do Not Overuse Global State

Global state should be limited to genuinely global concerns such as:

```text
Authentication session
Active Chama
Theme if required
UI preferences if required
```

Do not put all API responses into one giant global store.

That creates synchronization problems.

---

# 43. Forms

Forms must have:

* schema validation
* clear labels
* validation messages
* disabled submission state
* server error handling
* success handling
* cancellation behavior
* accessible controls

Do not duplicate backend validation rules unnecessarily.

Client validation is for usability.

Backend validation is authoritative.

---

# 44. Destructive Actions

For destructive or financially significant actions:

```text
Delete
Deactivate
Reverse
Approve
Complete
```

the UI must clearly communicate the consequence.

Use confirmation where appropriate.

Do not implement irreversible actions as one accidental click.

If the backend does not expose the operation, the frontend must not invent it.

---

# 45. Financial Confirmation

For financially significant actions, show the user the relevant information before submission.

Example:

```text
Amount
Member
Chama
Reference
Action
```

Do not hide important financial details behind unnecessary UI decoration.

---

# 46. Accessibility

The frontend must provide:

* keyboard navigation
* visible focus states
* semantic HTML
* labels
* accessible buttons
* accessible dialogs
* meaningful error messages
* sufficient contrast
* screen-reader-compatible controls

Do not sacrifice accessibility for visual design.

---

# 47. Design System

Create a small consistent design system.

At minimum:

```text
Button
Input
Select
Modal
Dialog
Table
Card
Badge
Alert
Toast
Pagination
Skeleton
EmptyState
ErrorState
LoadingState
```

Do not create five different button styles for the same action.

Consistency is more important than visual novelty.

---

# 48. Visual Direction

The application should communicate:

```text
Financial
Professional
Trustworthy
Clean
Modern
Responsive
```

Avoid:

```text
Excessive gradients
Excessive animations
Gaming-style dashboards
Huge decorative illustrations
Unnecessary glassmorphism
Black-screen aesthetic
Visual noise
```

Financial information must remain the primary visual content.

---

# 49. Tables

Financial tables must prioritize readability.

Important columns should remain visible.

On mobile:

* allow horizontal scrolling where necessary
* or transform rows into structured cards
* never destroy financial information simply to fit the screen

Amounts should be visually distinguishable from descriptions.

Dates should use a consistent format.

---

# 50. Dashboard Cards

Do not create cards simply to make the dashboard look full.

Every card must answer a real question.

Bad:

```text
Random Statistic
Growth Score
AI Health
System Happiness
```

Good:

```text
Total Contributions
Current Balance
Members
Recent Payments
```

only when those values are actually provided by the API.

---

# 51. No Fake Data

This rule is absolute.

Do not use:

```text
mock members
mock transactions
fake balances
fake payment records
hard-coded dashboard statistics
placeholder financial totals
```

for production application flows.

Mock data may only exist inside explicitly isolated tests or development fixtures.

Never allow fake data to appear in production builds.

---

# 52. No Fake API

Do not create a fake backend inside the frontend.

Do not create:

```text
/api/mock
/api/fake
local JSON pretending to be backend responses
```

unless explicitly required for automated tests.

The development environment should connect to the actual ChamaCore backend.

---

# 53. No Backend Duplication

Do not duplicate:

```text
loan calculations
ledger calculations
payment settlement
permission evaluation
financial reconciliation
```

inside the frontend.

The frontend presents backend state.

It does not become a second backend.

---

# 54. API Contract Validation

Before implementing each feature:

1. Read the API contract.
2. Identify endpoint.
3. Identify HTTP method.
4. Identify request schema.
5. Identify response schema.
6. Identify authentication requirement.
7. Identify permission requirement.
8. Identify pagination.
9. Identify error responses.
10. Implement only what is documented.

If something is missing:

```text
STOP
```

Do not invent it.

Record the missing contract requirement.

---

# 55. Backend Defect Protocol

If the frontend discovers that the API cannot support a required legitimate frontend operation:

Do not hack around the backend.

Do not access the database directly.

Do not create fake local state.

Do not bypass authentication.

Instead:

```text
Document API gap
    ↓
Identify exact requirement
    ↓
Identify affected endpoint
    ↓
Propose backend change
    ↓
Implement backend change separately
    ↓
Update API contract
    ↓
Implement frontend
```

---

# 56. Testing

The frontend must contain:

```text
Unit tests
Component tests
API/client tests
Authentication tests
Permission tests
Critical user-flow tests
```

Critical financial flows must be tested.

Minimum flows:

```text
Login
Logout
Session expiry
Chama selection
Member listing
Member creation if supported
Contribution creation if supported
Contribution viewing
Ledger viewing
Payment viewing
Permission-restricted action
API failure
Network failure
```

---

# 57. End-to-End Tests

At least the critical paths should have E2E coverage.

Example:

```text
Login
 ↓
Select Chama
 ↓
Open dashboard
 ↓
Open members
 ↓
Open contributions
 ↓
Open ledger
 ↓
Logout
```

Financial mutation E2E tests must verify that the UI correctly handles:

```text
success
validation failure
authorization failure
duplicate submission
network timeout
server error
```

---

# 58. API Contract Tests

Where practical, generate or validate TypeScript types against the backend's OpenAPI contract.

The frontend should detect API drift.

If the backend changes:

```text
response field
request field
endpoint
status
enum
pagination structure
```

the frontend contract checks should expose the mismatch.

Do not silently accommodate API drift by using:

```ts
any
```

everywhere.

---

# 59. TypeScript Rules

If TypeScript is used:

Do not use `any` to bypass API typing.

Bad:

```ts
const response: any = await api.get(...);
```

Correct:

```ts
const response: ContributionResponse = await ...
```

Types must correspond to the actual backend contract.

---

# 60. Type Safety

Avoid excessive optional properties merely to silence compiler errors.

Bad:

```ts
interface User {
    id?: string;
    name?: string;
    email?: string;
}
```

when the API guarantees these values.

Types should describe reality.

---

# 61. Security

Never store sensitive secrets in frontend code.

Never expose:

```text
DATABASE_URL
SECRET_KEY
JWT signing secret
Daraja secret
payment credentials
private API keys
```

Never log:

```text
access tokens
refresh tokens
passwords
payment credentials
sensitive personal information
```

---

# 62. Browser Storage

Follow the backend authentication model.

Do not blindly put sensitive authentication material into:

```text
localStorage
```

if the backend/session architecture provides a safer mechanism.

If token storage is required, document the threat model and implementation.

---

# 63. Logging

Frontend logs must be useful without leaking sensitive information.

Development:

```text
API request failures
route transitions where useful
debug information
```

Production:

```text
minimal structured errors
no secrets
no tokens
no financial-sensitive payload dumps
```

Do not leave excessive debugging statements in production.

---

# 64. Performance

The frontend must avoid unnecessary network requests.

Do not:

```text
fetch dashboard every render
fetch members every keystroke
refetch unchanged data continuously
```

Use:

* caching
* debouncing
* pagination
* appropriate invalidation
* request cancellation where useful

---

# 65. Search Debouncing

For server-side search:

```text
user types
 ↓
wait briefly
 ↓
send query
```

Do not issue a network request for every keystroke unless the API specifically requires it.

---

# 66. Network Failure

The frontend must distinguish:

```text
No internet
Backend unavailable
Request timeout
Authentication failure
Authorization failure
Validation failure
Server failure
```

Do not show:

```text
Something went wrong
```

for every possible failure.

Give the user the most useful safe explanation.

---

# 67. Offline Behavior

Do not pretend ChamaCore supports offline financial transactions unless the backend explicitly supports them.

Do not queue financial mutations locally.

Do not display locally invented balances as authoritative.

The frontend should clearly indicate when data cannot be refreshed.

---

# 68. Financial Mutations Must Be Online

The following must require successful backend communication:

```text
Contribution
Payment action
Member financial mutation
Ledger-affecting operation
Any future loan operation
Any future payout operation
```

No offline financial writes.

---

# 69. Notifications

If backend notifications are not currently exposed through the API:

**Do not build a fake notification center.**

If notification endpoints later become available, implement them against the API contract.

---

# 70. Loans

If loan endpoints are not currently available:

```text
DO NOT BUILD LOAN SCREENS
DO NOT CREATE LOAN API CLIENTS
DO NOT CREATE MOCK LOAN DATA
```

When the backend exposes the feature, add it as a separate frontend feature using the same architecture.

---

# 71. Payouts

If payout endpoints are not currently available:

```text
DO NOT BUILD PAYOUT SCREENS
DO NOT CREATE PAYOUT API CLIENTS
DO NOT CREATE MOCK PAYOUT DATA
```

Do not invent payout workflows.

---

# 72. Reconciliation

If reconciliation endpoints are not currently available:

```text
DO NOT BUILD RECONCILIATION UI
```

This is a backend financial control.

The frontend only consumes it when the backend exposes the required API.

---

# 73. Audit Events

Do not expose internal audit functionality simply because an audit table exists.

Only build audit screens when:

```text
backend API exists
+
authorization rules exist
+
API contract documents the feature
```

---

# 74. Frontend Folder Structure

Use a structure that separates domain features.

Example:

```text
src/
├── app/
│   ├── login/
│   ├── dashboard/
│   ├── members/
│   ├── contributions/
│   ├── shares/
│   ├── ledger/
│   ├── payments/
│   └── settings/
│
├── components/
│   ├── ui/
│   ├── layout/
│   ├── forms/
│   └── feedback/
│
├── features/
│   ├── auth/
│   ├── chamas/
│   ├── members/
│   ├── contributions/
│   ├── shares/
│   ├── ledger/
│   └── payments/
│
├── lib/
│   ├── api/
│   ├── auth/
│   ├── formatting/
│   ├── validation/
│   └── utilities/
│
├── types/
│
└── tests/
```

Adapt this to the chosen frontend framework.

Do not blindly copy this structure if the framework has a better native convention.

The architectural separation matters more than the exact folders.

---

# 75. Feature Boundary

Each feature should own its:

```text
API calls
Types
Hooks
Components
Validation
Tests
```

Avoid giant files.

Bad:

```text
dashboard.tsx
1500 lines
```

Bad:

```text
api.ts
3000 lines
```

Split by domain.

---

# 76. Component Rule

Components should have one clear responsibility.

Bad:

```text
DashboardPage
    authentication
    API client
    member creation
    payment processing
    ledger calculations
    rendering
```

Correct:

```text
DashboardPage
    ↓
DashboardSummary
RecentTransactions
PaymentSummary
```

with API logic outside presentation components.

---

# 77. Mutation Rule

Every mutation must clearly define:

```text
idle
loading
success
error
```

Do not leave buttons permanently disabled after failed requests.

Do not show success before the backend confirms success.

---

# 78. Cache Invalidation

After a mutation, invalidate only the affected server-state queries.

Example:

```text
Contribution created
    ↓
invalidate contributions
invalidate dashboard summary
invalidate affected account/ledger view
```

Do not reload the entire application unnecessarily.

---

# 79. Stale Data

The frontend must make stale data obvious where financial accuracy matters.

For example:

```text
Last updated: 2 minutes ago
```

may be useful for read-heavy dashboard information.

Do not imply real-time accuracy if the frontend has cached data.

---

# 80. API Versioning

Use the API version defined by the backend.

Do not hard-code assumptions such as:

```text
/v1
```

unless the backend contract actually specifies it.

If the backend changes version:

```text
frontend API client
    ↓
new contract
    ↓
tests
    ↓
feature updates
```

---

# 81. Development Workflow

The coding agent must follow this workflow.

```text
STEP 1
Read repository instructions.

STEP 2
Read FRONTEND_SPEC.md.

STEP 3
Read backend API contract.

STEP 4
Inspect existing frontend code.

STEP 5
Map API endpoints to frontend features.

STEP 6
Create typed API client.

STEP 7
Implement authentication.

STEP 8
Implement application shell.

STEP 9
Implement Chama context.

STEP 10
Implement dashboard.

STEP 11
Implement members.

STEP 12
Implement contributions.

STEP 13
Implement shares.

STEP 14
Implement ledger.

STEP 15
Implement payments.

STEP 16
Implement permissions.

STEP 17
Implement tests.

STEP 18
Perform API contract verification.

STEP 19
Perform responsive verification.

STEP 20
Perform production build.
```

Do not skip directly to dashboard styling.

---

# 82. Implementation Order

The coding agent must not implement everything at once.

Use vertical slices.

Example:

```text
Authentication
    ↓
Test
    ↓
Application shell
    ↓
Test
    ↓
Chama context
    ↓
Test
    ↓
Members
    ↓
Test
    ↓
Contributions
    ↓
Test
```

Each slice must work before moving to the next.

---

# 83. Git Rules

Make small, meaningful commits.

Recommended:

```text
feat(frontend): add API client
feat(frontend): add authentication flow
feat(frontend): add protected application shell
feat(frontend): add Chama context
feat(frontend): add members feature
feat(frontend): add contributions feature
feat(frontend): add ledger feature
test(frontend): add authentication coverage
test(frontend): add financial flow coverage
```

Do not make one enormous commit containing the entire frontend.

---

# 84. Backend Changes

Frontend work should not modify backend code unless an actual API defect blocks implementation.

If backend modification becomes necessary:

1. Identify the exact frontend requirement.
2. Identify the API gap.
3. Document it.
4. Modify backend separately.
5. Update API contract.
6. Add backend tests.
7. Verify backend.
8. Return to frontend implementation.

Never silently modify backend behavior to make frontend code easier.

---

# 85. Forbidden Shortcuts

The coding agent must not:

```text
use any everywhere
disable TypeScript checks
disable ESLint
ignore failing tests
ignore API errors
hard-code financial values
hard-code permissions
hard-code user identity
create fake API responses
create fake authentication
access the database from frontend
call Daraja directly
store backend secrets in frontend
invent endpoints
invent response fields
invent status values
bypass authorization
remove tests because they fail
```

---

# 86. Definition of Done

A frontend feature is complete only when:

* [ ] API endpoint verified
* [ ] Request type verified
* [ ] Response type verified
* [ ] Authentication handled
* [ ] Authorization handled
* [ ] Loading state implemented
* [ ] Empty state implemented
* [ ] Error state implemented
* [ ] Success state implemented
* [ ] Responsive layout implemented
* [ ] Accessibility checked
* [ ] Server-state caching handled
* [ ] Mutation invalidation handled
* [ ] Duplicate submission protected
* [ ] Tests written
* [ ] No fake data
* [ ] No invented API
* [ ] No backend logic duplicated
* [ ] Production build succeeds

---

# 87. Final Acceptance Criteria

The frontend is ready for release when a real backend instance can support the following flow:

```text
Open application
        ↓
Login
        ↓
Authenticated session
        ↓
Load current user
        ↓
Load available Chamas
        ↓
Select Chama
        ↓
Load dashboard
        ↓
View members
        ↓
View contributions
        ↓
View shares
        ↓
View ledger
        ↓
View payments
        ↓
Perform an authorized supported mutation
        ↓
Backend confirms mutation
        ↓
Frontend refreshes authoritative state
        ↓
Logout
```

No fake data may be required for this flow.

---

# 88. Release Gate

Before merging frontend work:

```text
npm/pnpm/yarn lint
npm/pnpm/yarn typecheck
npm/pnpm/yarn test
npm/pnpm/yarn build
```

Use the package manager actually configured by the project.

All must pass.

Additionally:

```text
API contract verified
Authentication verified
Protected routes verified
Permission restrictions verified
Financial mutation flows verified
Responsive layout verified
No secrets committed
No mock production data
No console debugging left behind
```

---

# 89. Final Agent Directive

You are implementing a frontend for an existing financial backend.

You are **not** designing a new financial system.

You are **not** redesigning the API.

You are **not** inventing missing functionality.

You are **not** building USSD.

You are **not** building React Native.

You are **not** implementing Daraja.

You are **not** implementing database logic.

You are **not** calculating authoritative financial balances.

You are **not** creating fake data to make screens look complete.

You are consuming the existing ChamaCore API.

When the backend provides data:

```text
display it
```

When the backend provides an operation:

```text
call it correctly
```

When the backend rejects an operation:

```text
show the appropriate error
```

When the API does not provide a capability:

```text
do not invent it
```

When the API contract is ambiguous:

```text
stop
inspect the backend
inspect the API contract
resolve the ambiguity
then implement
```

When a backend defect blocks legitimate frontend work:

```text
document the defect
do not create a frontend workaround that compromises architecture
```

The objective is:

> **A clean, typed, responsive, accessible frontend that faithfully consumes ChamaCore's real API without duplicating or inventing backend behavior.**

Correctness first.

Then usability.

Then visual polish.

Never reverse that order.
