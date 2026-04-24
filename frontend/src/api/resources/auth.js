import { getAuthHeaders, getToken, request } from "../baseClient";

export function signin({ login, password }) {
  return request("/api/auth/token/login/", {
    method: "POST",
    body: JSON.stringify({
      login,
      password,
    }),
  });
}

export function signout() {
  return request("/api/auth/token/logout/", {
    method: "POST",
    headers: getAuthHeaders({ optional: true }),
    skipAuthRefresh: true,
  });
}

export function refreshSession() {
  return request("/api/auth/token/refresh/", {
    method: "POST",
    headers: {
      ...getAuthHeaders(),
      "x-csrf-token": getToken() || "",
    },
    body: JSON.stringify({}),
    skipAuthRefresh: true,
  });
}

export function signup({ email, username, password, password_confirm }) {
  return request("/api/users/", {
    method: "POST",
    body: JSON.stringify({
      email,
      username,
      password,
      password_confirm,
    }),
  });
}
