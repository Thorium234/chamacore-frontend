import { api } from "@/lib/api/client";
import type {
  ChangePasswordPayload,
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
  identifier: string,
  password: string
): Promise<TokenOut> {
  const form = new URLSearchParams();
  form.append("username", identifier);
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

/**
 * `POST /auth/change-password` → `UserOut` (`app/api/v1/auth.py:123`).
 *
 * The backend clears `must_change_password`, revokes all refresh tokens, and
 * returns the updated user. The current access token remains usable until its
 * short expiry, so the session provider re-reads `/auth/me` immediately.
 */
export async function changePassword(payload: ChangePasswordPayload): Promise<UserOut> {
  const { data } = await api.post<UserOut>("/auth/change-password", payload);
  return data;
}
