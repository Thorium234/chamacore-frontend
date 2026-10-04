/**
 * API types for ChamaCore.
 *
 * These types are derived from the backend contract
 * (backend `docs/06_API_CONTRACT.md` and `app/schemas/*`). Do not add fields
 * the backend does not return. Monetary values are decimal strings
 * (two decimal places) — never numbers.
 */

// ---- Auth ----

export interface TokenOut {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  /**
   * Server flag telling us the user must set a new password before continuing.
   * The backend enforces it on authenticated routes, and the frontend gates
   * the app shell on it as well.
   */
  must_change_password: boolean;
}

export interface RegisterPayload {
  email: string;
  password: string;
  member: {
    first_name: string;
    last_name: string;
    phone_number: string;
    government_id: string;
  };
}

export interface ChangePasswordPayload {
  current_password: string;
  /** 8–128 characters (`app/schemas/user.py:24`). */
  new_password: string;
}

export interface MemberLinkPayload {
  phone_number: string;
  government_id: string;
}

export interface UserOut {
  id: string;
  email: string;
  is_active: boolean;
  member_id: string | null;
  must_change_password: boolean;
  created_at: string;
}

// ---- Members / Chamas ----

/**
 * `app/models/enums.py:6`. `INACTIVE` is legacy and is canonicalized to
 * `SUSPENDED` server-side, but it can still appear on older records.
 */
export type ChamaStatus =
  | "PENDING"
  | "ACTIVE"
  | "SUSPENDED"
  | "DISSOLVED"
  | "INACTIVE";

export interface ChamaOut {
  id: string;
  name: string;
  description: string | null;
  registration_fee_amount: string;
  status: ChamaStatus;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface MemberDetails {
  first_name: string;
  last_name: string;
  phone_number: string;
  government_id: string;
  email?: string | null;
}

export interface NewMemberAccountDetails extends MemberDetails {
  email: string;
}

export interface ChamaCreatePayload {
  name: string;
  description?: string | null;
  registration_fee_amount: string;
  member?: MemberDetails | null;
}

export interface ChamaUpdatePayload {
  name?: string;
  description?: string | null;
  registration_fee_amount?: string;
  status?: ChamaStatus;
}

// ---- Memberships ----

/**
 * Chama membership roles only (`app/models/enums.py:69`). `PLATFORM_ADMIN` is a
 * global role held in `user_platform_roles` and is never a membership role — the
 * backend filters it out of membership role lists (`app/services/role.py:28`).
 * Use `PlatformRoleName` for that one instead of widening this union.
 */
export type RoleName = "CHAIRPERSON" | "TREASURER" | "SECRETARY" | "MEMBER";

/** Global platform role, held in `user_platform_roles`. */
export type PlatformRoleName = "PLATFORM_ADMIN";

export type MembershipStatus = "ACTIVE" | "INACTIVE";

export interface MemberPublic {
  id: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  created_at: string;
}

export interface RegistrationFeeOut {
  id: string;
  membership_id: string;
  amount: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export type RegistrationFeePaymentStatus = "CONFIRMED" | "REVERSED";

export interface RegistrationFeePaymentOut {
  id: string;
  fee_id: string;
  amount: string;
  status: RegistrationFeePaymentStatus;
  recorded_by_user_id: string;
  paid_at: string;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface MembershipOut {
  id: string;
  chama_id: string;
  member_id: string;
  membership_number: number;
  status: MembershipStatus;
  joined_at: string;
  member: MemberPublic | null;
  roles: RoleName[];
  registration_fee: RegistrationFeeOut | null;
}

export interface MembershipCreatePayload {
  member: NewMemberAccountDetails;
}

export interface MembershipStatusUpdatePayload {
  status: MembershipStatus;
}

export interface RoleOut {
  id: string;
  name: RoleName;
}

// Backend only allows TREASURER / SECRETARY assignment via this endpoint.
export interface RoleAssignPayload {
  role: "TREASURER" | "SECRETARY";
}

// ---- Contributions ----

export type ContributionStatus = "PENDING" | "CONFIRMED" | "REVERSED";

export interface ContributionOut {
  id: string;
  membership_id: string;
  amount: string;
  period: string;
  status: ContributionStatus;
  recorded_by_user_id: string;
  /** Optional back-dating for manual entries (`app/schemas/membership.py:88`). */
  payment_date: string | null;
  note: string | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContributionCreatePayload {
  membership_id: string;
  amount: string;
  period: string;
  /** ISO `YYYY-MM-DD`. Optional; the backend defaults to the recording date. */
  payment_date?: string | null;
  note?: string | null;
}

export interface ContributionReversePayload {
  note?: string | null;
}

// ---- Shares ----

export type ShareStatus = "ACTIVE" | "REVERSED";

export interface ShareOut {
  id: string;
  membership_id: string;
  contribution_id: string;
  units: string;
  status: ShareStatus;
  created_at: string;
  updated_at: string;
}

// ---- Ledger ----

export type LedgerAccountType =
  | "ASSET"
  | "LIABILITY"
  | "EQUITY"
  | "REVENUE"
  | "EXPENSE";

export interface LedgerAccountOut {
  id: string;
  code: string;
  name: string;
  account_type: LedgerAccountType;
  description: string | null;
  /** Balance = sum(debit) - sum(credit), signed (assets positive, equity/revenue negative). */
  balance: string;
}

export interface LedgerAccountsOut {
  items: LedgerAccountOut[];
}

export interface LedgerEntryOut {
  account_id: string;
  account_code: string;
  account_name: string;
  debit: string;
  credit: string;
}

export interface LedgerTransactionOut {
  id: string;
  chama_id: string;
  source_type: string;
  source_id: string;
  description: string | null;
  posted_by_user_id: string;
  reverses_transaction_id: string | null;
  created_at: string;
  entries: LedgerEntryOut[];
}

export interface LedgerHistoryOut {
  items: LedgerTransactionOut[];
  next_cursor: string | null;
  has_more: boolean;
}

export interface LedgerEntryRowOut {
  id: string;
  transaction_id: string;
  source_type: string;
  source_id: string;
  description: string | null;
  debit: string;
  credit: string;
  created_at: string;
}

export interface LedgerAccountEntriesOut {
  account: LedgerAccountOut;
  items: LedgerEntryRowOut[];
  next_cursor: string | null;
  has_more: boolean;
}

// ---- Payments ----

export type PaymentProviderCode = "DARAJA" | "JENGA";
export type PaymentEnvironment = "SANDBOX" | "PRODUCTION";
export type PaymentConnectionStatus =
  | "PENDING_VALIDATION"
  | "ACTIVE"
  | "DISABLED"
  | "INVALID";

export interface PaymentConnectionOut {
  id: string;
  chama_id: string;
  provider_code: PaymentProviderCode;
  environment: PaymentEnvironment;
  status: PaymentConnectionStatus;
  masked_account_identifier: string;
  encryption_key_version: number;
  credential_version: number;
  last_validated_at: string | null;
  last_validation_error_code: string | null;
  created_by_user_id: string;
  updated_by_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface DarajaCredentials {
  consumer_key: string;
  consumer_secret: string;
  short_code: string;
  passkey: string;
}

export interface JengaCredentials {
  api_key: string;
  merchant_code: string;
  consumer_secret: string;
  signing_private_key?: string | null;
}

export interface PaymentConnectionCreatePayload {
  provider_code: PaymentProviderCode;
  environment: PaymentEnvironment;
  credentials: DarajaCredentials | JengaCredentials;
}

export interface PaymentConnectionReplacePayload {
  credentials: DarajaCredentials | JengaCredentials;
}

export type PaymentIntentStatus =
  | "PENDING"
  | "PROCESSING"
  | "SUCCEEDED"
  | "FAILED";

export interface PaymentIntentOut {
  id: string;
  chama_id: string;
  membership_id: string;
  contribution_id: string | null;
  /**
   * Alternate payer MSISDN supplied at creation, normalized to `254…`.
   * Null means the provider used the member's registered phone number.
   */
  requested_phone: string | null;
  amount: string;
  currency: string;
  purpose: string;
  status: PaymentIntentStatus;
  idempotency_key: string;
  created_by_user_id: string;
  last_transition_source: string;
  last_transition_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentIntentCreatePayload {
  membership_id: string;
  amount: string;
  currency: string;
  purpose: string;
  idempotency_key: string;
  contribution_id?: string | null;
  /**
   * Optional alternate payer phone (`app/schemas/payment.py:65`). Omit to charge
   * the member's registered number.
   */
  phone_number?: string | null;
}

export interface PaymentIntentInitiatePayload {
  connection_id: string;
}

export type PaymentAttemptStatus =
  | "INITIATED"
  | "SUCCEEDED"
  | "FAILED"
  | "TIMEOUT"
  | "UNKNOWN";

export interface PaymentAttemptOut {
  id: string;
  payment_intent_id: string;
  connection_id: string;
  attempt_number: number;
  provider_request_id: string | null;
  provider_transaction_id: string | null;
  client_reference: string;
  status: PaymentAttemptStatus;
  retryable: boolean;
  failure_code: string | null;
  failure_message_safe: string | null;
  requested_at: string;
  completed_at: string | null;
  last_transition_source: string;
}

export interface C2BRegisterUrlOut {
  accepted: boolean;
  response_code: string;
  response_description: string;
  validation_url: string;
  confirmation_url: string;
}

// ---- Loans ----

export type LoanStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "DISBURSED"
  | "PARTIALLY_REPAID"
  | "REPAID"
  | "REJECTED"
  | "CANCELLED";

export interface LoanApplyPayload {
  principal: string;
  term_months: number;
  note?: string | null;
}

export interface LoanOut {
  id: string;
  chama_id: string;
  membership_id: string;
  principal: string;
  interest_rate: string;
  term_months: number;
  total_interest: string;
  total_expected_repayment: string;
  outstanding_principal: string;
  outstanding_interest: string;
  status: LoanStatus;
  is_overdue: boolean;
  application_date: string;
  approval_date: string | null;
  disbursement_date: string | null;
  maturity_date: string | null;
  approved_by_user_id: string | null;
  disbursed_by_user_id: string | null;
  recorded_by_user_id: string;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export type LoanRepaymentStatus = "CONFIRMED" | "REVERSED";

export interface LoanRepaymentCreatePayload {
  amount: string;
  note?: string | null;
}

export interface LoanRepaymentOut {
  id: string;
  loan_id: string;
  amount: string;
  principal_portion: string;
  interest_portion: string;
  status: LoanRepaymentStatus;
  recorded_by_user_id: string;
  recorded_at: string;
  note: string | null;
  created_at: string;
  updated_at: string;
}

// ---- Payouts ----

export type PayoutStatus =
  | "REQUESTED"
  | "APPROVED"
  | "PROCESSING"
  | "COMPLETED"
  | "REJECTED"
  | "FAILED"
  | "REVERSED";

export interface PayoutRequestPayload {
  amount: string;
  note?: string | null;
}

export interface PayoutFailPayload {
  failure_reason: string;
}

export interface PayoutOut {
  id: string;
  chama_id: string;
  membership_id: string;
  amount: string;
  status: PayoutStatus;
  requested_by_user_id: string;
  approved_by_user_id: string | null;
  processed_by_user_id: string | null;
  completed_by_user_id: string | null;
  failure_reason: string | null;
  requested_at: string;
  approved_at: string | null;
  processed_at: string | null;
  completed_at: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

// ---- Audit ----

export interface AuditEventOut {
  id: string;
  chama_id: string | null;
  actor_user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  request_id: string | null;
  payload: Record<string, unknown> | null;
  success: boolean;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// ---- Notifications ----

/** Only `IN_APP` exists today (`app/models/enums.py` NotificationChannel). */
export type NotificationChannel = "IN_APP";

/**
 * `app/schemas/notification.py:11`.
 *
 * There is deliberately no badge/severity/link field: navigation hints are
 * `action` (free string), `resource_type` + `resource_id`, and the free-form
 * `payload`. Do not invent a badge field — the backend does not send one.
 */
export interface NotificationOut {
  id: string;
  /** Free-form verb such as `contribution_confirmed`. Not an enum. */
  action: string;
  title: string;
  body: string | null;
  channel: NotificationChannel;
  chama_id: string | null;
  resource_type: string | null;
  resource_id: string | null;
  actor_user_id: string | null;
  payload: Record<string, unknown> | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface UnreadCountOut {
  unread_count: number;
}

export interface MarkAllReadOut {
  /** Rows actually flipped to read, not the total matching the filter. */
  updated: number;
}

export interface NotificationListParams {
  unread_only?: boolean;
  chama_id?: string | null;
  /** 1–500 server-side. Omit to receive everything. */
  limit?: number;
  offset?: number;
}

// ---- Platform admin ----

/** `app/schemas/platform.py:29`. */
export interface PlatformChamaStatusUpdate {
  status: ChamaStatus;
  /** Optional, ≤500 chars. Recorded with the transition. */
  reason?: string | null;
}

export interface PlatformChamaOut {
  id: string;
  name: string;
  description: string | null;
  status: ChamaStatus;
  created_by_user_id: string;
  owner_name: string | null;
  owner_email: string;
  created_at: string;
  updated_at: string;
}

export interface PlatformUserOut {
  id: string;
  email: string;
  is_active: boolean;
  /** Always `[]` for non-admins; may contain `PLATFORM_ADMIN`. */
  platform_roles: PlatformRoleName[];
  created_at: string;
}

export interface PlatformStatsOut {
  total_chamas: number;
  active_chamas: number;
  pending_chamas: number;
  suspended_chamas: number;
  dissolved_chamas: number;
  platform_admins: number;
}

export interface CollectionAnalyticsMonthOut {
  month: string;
  contributions: string | number;
  registration_fees: string | number;
  total_collected: string | number;
}

export interface CollectionAnalyticsOut {
  currency: string;
  scope: "group" | "member";
  months: CollectionAnalyticsMonthOut[];
}

export interface PlatformChamaListParams {
  status?: ChamaStatus | null;
  /** ≤255 chars. */
  search?: string | null;
  /** 1–500 server-side. */
  limit?: number;
  offset?: number;
}

/**
 * Legal Chama status transitions (`app/services/platform.py:26`). `DISSOLVED`
 * is terminal and `INACTIVE` is canonicalized to `SUSPENDED` server-side, so
 * neither is offered as a target here.
 */
export const PLATFORM_STATUS_TRANSITIONS: Record<ChamaStatus, ChamaStatus[]> = {
  PENDING: ["ACTIVE", "SUSPENDED", "DISSOLVED"],
  ACTIVE: ["SUSPENDED", "DISSOLVED"],
  SUSPENDED: ["ACTIVE", "DISSOLVED"],
  DISSOLVED: [],
  INACTIVE: ["ACTIVE", "SUSPENDED", "DISSOLVED"],
};
