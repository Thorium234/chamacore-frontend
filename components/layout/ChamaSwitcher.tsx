"use client";

import { useChama } from "@/features/chamas/ChamaContext";
import { shortId } from "@/lib/format";

export function ChamaSwitcher() {
  const { activeChamaId, activeChama, myChamas, setActiveChama } = useChama();

  const options = activeChamaId
    ? [...new Set([activeChamaId, ...myChamas.map((c) => c.id)])]
    : [];

  if (!activeChamaId) return null;

  const names = new Map(myChamas.map((c) => [c.id, c.name]));
  const nameFor = (chamaId: string) =>
    chamaId === activeChamaId && activeChama
      ? activeChama.name
      : (names.get(chamaId) ?? shortId(chamaId));

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="chama-switch" className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
        Chama
      </label>
      <select
        id="chama-switch"
        className="max-w-52 truncate rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        value={activeChamaId}
        onChange={(event) => setActiveChama(event.target.value)}
      >
        {options.map((chamaId) => (
          <option key={chamaId} value={chamaId}>
            {nameFor(chamaId)}
          </option>
        ))}
      </select>
    </div>
  );
}