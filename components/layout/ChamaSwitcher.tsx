"use client";

import { useChama } from "@/features/chamas/ChamaContext";
import { getChama } from "@/lib/api/chamas";
import { useQuery } from "@/lib/query/hooks";
import { shortId } from "@/lib/format";

export function ChamaSwitcher() {
  const { activeChamaId, activeChama, knownChamaIds, setActiveChama } = useChama();

  const options = activeChamaId ? [...new Set([activeChamaId, ...knownChamaIds])] : [];

  const namesQuery = useQuery<Record<string, string>>(
    options.length > 0 ? `chama-names:${options.join(",")}` : null,
    async () => {
      const result: Record<string, string> = {};
      for (const chamaId of options) {
        try {
          const chama = await getChama(chamaId);
          result[chamaId] = chama.name;
        } catch {
          // Chama not accessible to this user (e.g. membership ended); skip it.
        }
      }
      return result;
    }
  );

  if (!activeChamaId) return null;

  const names = namesQuery.data ?? {};

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="chama-switch" className="text-sm font-medium text-zinc-500">
        Chama
      </label>
      <select
        id="chama-switch"
        className="max-w-52 truncate rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        value={activeChamaId}
        onChange={(event) => setActiveChama(event.target.value)}
      >
        {options.map((chamaId) => (
          <option key={chamaId} value={chamaId}>
            {chamaId === activeChamaId && activeChama
              ? activeChama.name
              : (names[chamaId] ?? shortId(chamaId))}
          </option>
        ))}
      </select>
    </div>
  );
}