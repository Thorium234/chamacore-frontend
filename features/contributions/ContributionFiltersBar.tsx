"use client";

import { Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { currentPeriod } from "@/lib/format";
import type { ContributionFilters } from "@/lib/api/contributions";
import type { ContributionStatus, MembershipOut } from "@/types/api";

const STATUS_OPTIONS: { value: ContributionStatus; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "REVERSED", label: "Reversed" },
];

/**
 * Server-side filters for the contributions list (member, period, status).
 *
 * Filtering happens in the API, not in the browser — these controls only choose
 * which query is sent. `onChange` receives the next filter set; the owner keeps
 * the state (and mirrors it into the URL for deep links).
 */
export function ContributionFiltersBar({
  filters,
  memberships,
  onChange,
  showMemberFilter = true,
}: {
  filters: ContributionFilters;
  memberships: MembershipOut[];
  onChange: (next: ContributionFilters) => void;
  showMemberFilter?: boolean;
}) {
  const hasFilters =
    Boolean(filters.membership_id) || Boolean(filters.period) || Boolean(filters.status);

  function update(patch: Partial<ContributionFilters>) {
    onChange({ ...filters, ...patch });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {showMemberFilter ? (
        <Select
          label="Member"
          value={filters.membership_id ?? ""}
          onChange={(event) => update({ membership_id: event.target.value || undefined })}
        >
          <option value="">All members</option>
          {memberships.map((membership) => (
            <option key={membership.id} value={membership.id}>
              {membership.member
                ? `${membership.member.last_name} ${membership.member.first_name} (#${membership.membership_number})`
                : `Member #${membership.membership_number}`}
            </option>
          ))}
        </Select>
      ) : null}

      <Input
        label="Period"
        type="month"
        value={filters.period ?? ""}
        onChange={(event) => update({ period: event.target.value || undefined })}
        placeholder={currentPeriod()}
        hint="Format YYYY-MM, e.g. 2026-09."
      />

      <Select
        label="Status"
        value={filters.status ?? ""}
        onChange={(event) =>
          update({ status: (event.target.value || undefined) as ContributionStatus | undefined })
        }
      >
        <option value="">Any status</option>
        {STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>

      <div className="flex items-end">
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            onChange({
              membership_id: showMemberFilter ? undefined : filters.membership_id,
              period: undefined,
              status: undefined,
              limit: filters.limit,
            })
          }
          disabled={!hasFilters}
        >
          Clear filters
        </Button>
      </div>
    </div>
  );
}
