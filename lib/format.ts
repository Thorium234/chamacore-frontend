/**
 * Formatting utilities. Display only — financial truth always comes from the
 * API. Never compute totals or balances with these.
 */

const moneyFormatter = new Intl.NumberFormat("en-KE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-KE", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-KE", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatMoney(amount: string | number): string {
  const numeric = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(numeric)) return formatMoney("0");
  return `KSh ${moneyFormatter.format(numeric)}`;
}

/**
 * Display balance for a ledger account. Balances are signed by convention
 * (assets/receivables positive, equity/revenue negative). Display formatting
 * only — the value itself always comes from the API.
 */
export function formatAccountBalance(account: {
  balance: string;
  account_type: string;
}): string {
  if (account.account_type === "EQUITY" || account.account_type === "REVENUE") {
    const numeric = Number(account.balance);
    const absolute = Number.isFinite(numeric) ? Math.abs(numeric) : 0;
    return `KSh ${moneyFormatter.format(absolute)}`;
  }
  return formatMoney(account.balance);
}

export function formatAmount(amount: string | number): string {
  const numeric = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(numeric)) return "0.00";
  return moneyFormatter.format(numeric);
}

export function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

export function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateTimeFormatter.format(date);
}

/** Short prefix of a UUID / id for lists. */
export function shortId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

export function formatPeriod(period: string): string {
  // Backend sends YYYY-MM; render as e.g. "Sep 2026".
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  if (!match) return period;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const label = new Date(year, month, 1).toLocaleString("en-KE", {
    month: "long",
    year: "numeric",
  });
  return label;
}

export function currentPeriod(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
}

export function inPeriod(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}