import type { ReactNode } from "react";

export function Table({
  head,
  children,
}: {
  head: ReactNode[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-max border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            {head.map((cell, index) => (
              <th
                key={index}
                scope="col"
                className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({
  align = "left",
  children,
}: {
  align?: "left" | "right" | "center";
  children: ReactNode;
}) {
  const textAlign =
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return <td className={`px-3 py-2.5 ${textAlign}`}>{children}</td>;
}

export function MoneyCell({ value, positive }: { value: string; positive?: boolean }) {
  const amount = Number(value);
  const numeric = Number.isFinite(amount) ? amount : 0;
  const prefix = numeric > 0 ? (positive === true ? "+" : "") : numeric < 0 ? "-" : "";
  return (
    <span className={numeric > 0 ? "font-medium text-emerald-700 dark:text-emerald-400" : numeric < 0 ? "font-medium text-red-700 dark:text-red-400" : "text-zinc-500 dark:text-zinc-400"}>
      {prefix}KSh {new Intl.NumberFormat("en-KE", { minimumFractionDigits: 2 }).format(Math.abs(numeric))}
    </span>
  );
}