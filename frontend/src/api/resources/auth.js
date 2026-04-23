import { getAuthHeaders, request } from "../baseClient";

export function signin({ email, password }) {
  return request("/api/auth/token/login/", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
    }),
  });
}

export function signout() {
  return request("/api/auth/token/logout/", {
    method: "POST",
    headers: getAuthHeaders(),
  });
}

export function signup({ email, password, username, first_name, last_name }) {
  return request("/api/users/", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      username,
      first_name,
      last_name,
    }),
  });
}

export function resetPassword({ email }) {
  return request("/api/users/reset_password/", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}
