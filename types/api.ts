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
}

export interface RegisterPayload {
  email: string;
  password: string;
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
  created_at: string;
}

// ---- Members / Chamas ----

export type ChamaStatus = "ACTIVE" | "INACTIVE";

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
}

export interface ChamaCreatePayload {
  name: string;
  description?: string | null;
  registration_fee_amount: string;
  member: MemberDetails | null;
}

export interface ChamaUpdatePayload {
  name?: string;
  description?: string | null;
  registration_fee_amount?: string;
  status?: ChamaStatus;
}

// ---- Memberships ----

export type RoleName = "CHAIRPERSON" | "TREASURER" | "SECRETARY" | "MEMBER";
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
  member: MemberDetails;
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
  note: string | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContributionCreatePayload {
  membership_id: string;
  amount: string;
  period: string;
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