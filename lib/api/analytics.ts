import { api } from "@/lib/api/client";
import type { CollectionAnalyticsOut } from "@/types/api";

export async function getCollectionAnalytics(chamaId: string): Promise<CollectionAnalyticsOut> {
  const { data } = await api.get<CollectionAnalyticsOut>(
    `/chamas/${chamaId}/analytics/collections`
  );
  return data;
}
