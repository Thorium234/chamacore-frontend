import { api } from "@/lib/api/client";
import type {
  LoanApplyPayload,
  LoanOut,
  LoanRepaymentCreatePayload,
  LoanRepaymentOut,
} from "@/types/api";

export async function listLoans(chamaId: string): Promise<LoanOut[]> {
  const { data } = await api.get<LoanOut[]>(`/chamas/${chamaId}/loans`);
  return data;
}

export async function listMemberLoans(
  chamaId: string,
  membershipId: string
): Promise<LoanOut[]> {
  const { data } = await api.get<LoanOut[]>(
    `/chamas/${chamaId}/memberships/${membershipId}/loans`
  );
  return data;
}

export async function applyForLoan(
  chamaId: string,
  payload: LoanApplyPayload
): Promise<LoanOut> {
  const { data } = await api.post<LoanOut>(`/chamas/${chamaId}/loans`, payload);
  return data;
}

export async function submitLoan(chamaId: string, loanId: string): Promise<LoanOut> {
  const { data } = await api.post<LoanOut>(`/chamas/${chamaId}/loans/${loanId}/submit`);
  return data;
}

export async function approveLoan(chamaId: string, loanId: string): Promise<LoanOut> {
  const { data } = await api.post<LoanOut>(`/chamas/${chamaId}/loans/${loanId}/approve`);
  return data;
}

export async function rejectLoan(
  chamaId: string,
  loanId: string,
  note?: string | null
): Promise<LoanOut> {
  const { data } = await api.post<LoanOut>(
    `/chamas/${chamaId}/loans/${loanId}/reject`,
    note ? { note } : {}
  );
  return data;
}

export async function cancelLoan(chamaId: string, loanId: string): Promise<LoanOut> {
  const { data } = await api.post<LoanOut>(`/chamas/${chamaId}/loans/${loanId}/cancel`);
  return data;
}

export async function disburseLoan(chamaId: string, loanId: string): Promise<LoanOut> {
  const { data } = await api.post<LoanOut>(`/chamas/${chamaId}/loans/${loanId}/disburse`);
  return data;
}

export async function listLoanRepayments(
  chamaId: string,
  loanId: string
): Promise<LoanRepaymentOut[]> {
  const { data } = await api.get<LoanRepaymentOut[]>(
    `/chamas/${chamaId}/loans/${loanId}/repayments`
  );
  return data;
}

export async function recordLoanRepayment(
  chamaId: string,
  loanId: string,
  payload: LoanRepaymentCreatePayload
): Promise<LoanOut> {
  const { data } = await api.post<LoanOut>(
    `/chamas/${chamaId}/loans/${loanId}/repayments`,
    payload
  );
  return data;
}

export async function reverseLoanRepayment(
  chamaId: string,
  loanId: string,
  repaymentId: string,
  note?: string | null
): Promise<LoanOut> {
  const { data } = await api.post<LoanOut>(
    `/chamas/${chamaId}/loans/${loanId}/repayments/${repaymentId}/reverse`,
    note ? { note } : {}
  );
  return data;
}