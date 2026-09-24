import { api } from "@/lib/api/client";
import type {
  MemberLinkPayload,
  RegisterPayload,
  TokenOut,
  UserOut,
} from "@/types/api";

export async function registerUser(payload: RegisterPayload): Promise<UserOut> {
  const { data } = await api.post<UserOut>("/auth/register", payload);
  return data;
}

/** Login uses `application/x-www-form-urlencoded` (OAuth2 password grant). */
export async function login(
  email: string,
  password: string
): Promise<TokenOut> {
  const form = new URLSearchParams();
  form.append("username", email);
  form.append("password", password);
  const { data } = await api.post<TokenOut>("/auth/token", form, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return data;
}

export async function logout(refreshToken: string): Promise<void> {
  await api.post("/auth/logout", { refresh_token: refreshToken });
}

export async function getMe(): Promise<UserOut> {
  const { data } = await api.get<UserOut>("/auth/me");
  return data;
}

export async function linkMeToMember(payload: MemberLinkPayload): Promise<UserOut> {
  const { data } = await api.post<UserOut>("/auth/me/member-link", payload);
  return data;
}