"use client";

import { useChama } from "@/features/chamas/ChamaContext";
import { Table, Td } from "@/components/ui/Table";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/States";
import { useQuery } from "@/lib/query/hooks";
import { listAuditEvents } from "@/lib/api/audit";
import { formatDateTime, shortId } from "@/lib/format";
import type { AuditEventOut } from "@/types/api";

function resourceLabel(resourceType: string) {
  return resourceType
    .split("_")
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

function truncatedPayload(payload: Record<string, unknown> | null) {
  if (!payload) return null;
  const json = JSON.stringify(payload);
  return json.length > 140 ? `${json.slice(0, 140)}…` : json;
}

export function AuditLogTable() {
  const { activeChamaId } = useChama();
  const chamaId = activeChamaId;

  const events = useQuery<AuditEventOut[]>(
    chamaId ? `${chamaId}:audit-events` : null,
    async () => (chamaId ? listAuditEvents(chamaId) : [])
  );

  if (events.isLoading) return <TableSkeleton rows={5} cols={6} />;
  if (events.error) {
    return <ErrorState message={events.error.message} onRetry={events.refetch} />;
  }
  if ((events.data?.length ?? 0) === 0) {
    return (
      <EmptyState
        title="No audit events yet"
        description="Actions taken in this Chama will show up here."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" variant="secondary" onClick={events.refetch}>
          Refresh
        </Button>
      </div>
      <Table
        head={["When", "Actor", "Action", "Resource", "Result", "Details"]}
      >
        {events.data?.map((event) => (
          <tr key={event.id}>
            <Td>
              <span className="whitespace-nowrap text-sm text-zinc-600">
                {formatDateTime(event.created_at)}
              </span>
            </Td>
            <Td>
              {event.actor_user_id ? (
                <span className="font-mono text-xs text-zinc-600">
                  {shortId(event.actor_user_id)}
                </span>
              ) : (
                <Badge tone="gray">system</Badge>
              )}
            </Td>
            <Td>
              <span className="font-mono text-xs text-zinc-800">{event.action}</span>
            </Td>
            <Td>
              <div className="space-y-0.5">
                <span className="text-sm text-zinc-700">
                  {resourceLabel(event.resource_type)}
                </span>
                {event.resource_id ? (
                  <span className="block font-mono text-xs text-zinc-400">
                    {shortId(event.resource_id)}
                  </span>
                ) : null}
              </div>
            </Td>
            <Td>
              <StatusBadge status={event.success ? "SUCCEEDED" : "FAILED"} />
            </Td>
            <Td>
              {event.request_id ? (
                <p className="mb-1 font-mono text-xs text-zinc-400">
                  req ~{shortId(event.request_id)}
                </p>
              ) : null}
              {truncatedPayload(event.payload) ? (
                <p className="max-w-md font-mono text-xs text-zinc-500">
                  {truncatedPayload(event.payload)}
                </p>
              ) : (
                <span className="text-xs text-zinc-400">—</span>
              )}
            </Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}