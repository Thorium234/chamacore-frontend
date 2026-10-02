/**
 * Statement downloads (F7).
 *
 * `GET /api/v1/chamas/{chama_id}/statements` streams `application/pdf` — there is
 * no JSON variant on the backend (`app/api/v1/statements.py:21`), so this is the
 * only way to get a statement. We deliberately never render a PDF in the browser.
 *
 * Authorization is decided server-side (`app/services/statement.py:186`):
 * - no `membership_id` → a plain member gets their own statement
 * - `membership_id` → only CHAIRPERSON/TREASURER may fetch another member's
 * - no membership at all → PLATFORM_ADMIN may still fetch, chama-wide or scoped
 *
 * So the UI must not assume a member can pick an arbitrary member: offering the
 * picker only to chair/treasurer keeps us from provoking 403s.
 */

import { api } from "@/lib/api/client";

export interface StatementParams {
  /** ISO `YYYY-MM-DD`. Backend defaults to 1970-01-01. */
  from?: string;
  /** ISO `YYYY-MM-DD`, inclusive. Backend defaults to today. */
  to?: string;
  /** Omit for "mine" (members) or "whole Chama" (chair/treasurer). */
  membership_id?: string | null;
}

export interface StatementFile {
  blob: Blob;
  /** Parsed from `Content-Disposition`, falling back to a generic name. */
  filename: string;
}

/** `statement-{chama_id}-{from}-{to}.pdf` per `statements.py:44`. */
function filenameFromDisposition(header: string | undefined, fallback: string): string {
  if (!header) return fallback;
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(header);
  if (!match?.[1]) return fallback;
  return decodeURIComponent(match[1]);
}

export async function downloadStatement(
  chamaId: string,
  params: StatementParams = {}
): Promise<StatementFile> {
  const query: Record<string, string> = {};
  if (params.from) query.from = params.from;
  if (params.to) query.to = params.to;
  if (params.membership_id) query.membership_id = params.membership_id;

  const { data, headers } = await api.get<Blob>(`/chamas/${chamaId}/statements`, {
    params: query,
    responseType: "blob",
  });

  return {
    blob: data,
    filename: filenameFromDisposition(
      typeof headers?.["content-disposition"] === "string"
        ? (headers["content-disposition"] as string)
        : undefined,
      `chamacore-statement-${chamaId}.pdf`
    ),
  };
}

/**
 * Triggers a browser download for a fetched statement.
 *
 * The object URL is revoked on the next tick — revoking synchronously can cancel
 * the download in some browsers before it starts.
 */
export function saveStatementFile(file: StatementFile): void {
  const url = URL.createObjectURL(file.blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}