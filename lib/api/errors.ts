/** Centralized API error model. */

export type ApiErrorKind =
  | "network"
  | "timeout"
  | "unauthorized"
  | "permission_denied"
  | "not_found"
  | "conflict"
  | "validation"
  | "rate_limited"
  | "server"
  | "service_unavailable"
  | "unknown";

export interface FieldIssue {
  loc: string[];
  msg: string;
  type?: string;
}

export interface ApiError {
  kind: ApiErrorKind;
  status: number | null;
  code: string | null;
  message: string;
  issues?: FieldIssue[];
}

const STATUS_TO_KIND: Record<number, ApiErrorKind> = {
  400: "validation",
  401: "unauthorized",
  403: "permission_denied",
  404: "not_found",
  409: "conflict",
  422: "validation",
  429: "rate_limited",
  500: "server",
  503: "service_unavailable",
};

const GENERIC_MESSAGE = "The request could not be completed.";

/** Fallback wording when the backend's own 403 detail was not human-readable. */
const PERMISSION_MESSAGE =
  "Your role in this Chama does not allow that action. Ask the chairperson if you believe it should.";

function messageFromUnknown(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object") {
    const value = detail as { message?: unknown; code?: unknown };
    if (typeof value.message === "string") return value.message;
    if (typeof value.code === "string") return value.code;
  }
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: unknown; loc?: unknown };
    if (typeof first?.msg === "string") return first.msg;
  }
  return GENERIC_MESSAGE;
}

function codeFromPayload(detail: unknown): string | null {
  if (detail && typeof detail === "object" && "code" in detail) {
    const code = (detail as { code?: unknown }).code;
    if (typeof code === "string" && code.length > 0) return code;
  }
  return null;
}

function issuesFromDetail(detail: unknown): FieldIssue[] | undefined {
  if (!Array.isArray(detail)) return undefined;
  return detail.map((issue) => {
    const value = issue as { loc?: unknown; msg?: unknown; type?: unknown };
    return {
      loc: Array.isArray(value.loc) ? value.loc.map(String) : [],
      msg: typeof value.msg === "string" ? value.msg : "Invalid value",
      type: typeof value.type === "string" ? value.type : undefined,
    };
  });
}

export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === "object" &&
    error !== null &&
    "kind" in error &&
    typeof (error as { kind: unknown }).kind === "string"
  );
}

export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}

/** True when the API refused on authorization grounds (HTTP 403). */
export function isPermissionDenied(error: unknown): boolean {
  return isApiError(error) && error.kind === "permission_denied";
}

export function toApiError(error: unknown): ApiError {
  if (isApiError(error)) return error;

  if (typeof error === "object" && error !== null && "isAxiosError" in error) {
    const axiosError = error as {
      response?: { status?: number; data?: unknown };
      code?: string;
      message?: string;
    };
    const status = axiosError.response?.status ?? null;
    const rawDetail =
      axiosError.response?.data &&
      typeof axiosError.response.data === "object" &&
      "detail" in (axiosError.response.data as object)
        ? (axiosError.response.data as { detail: unknown }).detail
        : axiosError.response?.data;

    if (axiosError.code === "ECONNABORTED" || axiosError.code === "ETIMEDOUT") {
      return {
        kind: "timeout",
        status,
        code: null,
        message: "The request timed out. Please try again.",
      };
    }
    if (!status) {
      return {
        kind: "network",
        status: null,
        code: null,
        message:
          "Could not reach the ChamaCore server. Check your connection and try again.",
      };
    }
    const kind = STATUS_TO_KIND[status] ?? "unknown";
    const message = messageFromUnknown(rawDetail);
    return {
      kind,
      status,
      code: codeFromPayload(rawDetail),
      message:
        kind === "permission_denied" && message === GENERIC_MESSAGE
          ? PERMISSION_MESSAGE
          : message,
      issues: issuesFromDetail(rawDetail),
    };
  }

  return {
    kind: "unknown",
    status: null,
    code: null,
    message: "An unexpected error occurred.",
  };
}