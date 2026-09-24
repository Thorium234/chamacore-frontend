import { api } from "@/lib/api/client";
import type {
  ContributionCreatePayload,
  ContributionOut,
  ContributionReversePayload,
} from "@/types/api";

export async function listContributions(chamaId: string): Promise<ContributionOut[]> {
  const { data } = await api.get<ContributionOut[]>(`/chamas/${chamaId}/contributions`);
  return data;
}

export async function createContribution(
  chamaId: string,
  payload: ContributionCreatePayload
): Promise<ContributionOut> {
  const { data } = await api.post<ContributionOut>(
    `/chamas/${chamaId}/contributions`,
    payload
  );
  return data;
}

export async function confirmContribution(
  chamaId: string,
  contributionId: string
): Promise<ContributionOut> {
  const { data } = await api.post<ContributionOut>(
    `/chamas/${chamaId}/contributions/${contributionId}/confirm`
  );
  return data;
}

export async function reverseContribution(
  chamaId: string,
  contributionId: string,
  payload: ContributionReversePayload = {}
): Promise<ContributionOut> {
  const { data } = await api.post<ContributionOut>(
    `/chamas/${chamaId}/contributions/${contributionId}/reverse`,
    payload
  );
  return data;
}