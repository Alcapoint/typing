import { getAuthHeaders, request } from "../baseClient";

export function getUserData() {
  return request("/api/users/me/", {
    method: "GET",
    headers: getAuthHeaders(),
  });
}

export function updateProfile({ first_name, last_name, age }) {
  return request("/api/users/me/", {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      first_name,
      last_name,
      age: age === "" ? null : Number(age),
    }),
  });
}

export function changePassword({ current_password, new_password }) {
  return request("/api/users/set_password/", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ current_password, new_password }),
  });
}

export function changeAvatar({ file }) {
  return request("/api/users/me/avatar/", {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ avatar: file }),
  });
}

export function deleteAvatar() {
  return request("/api/users/me/avatar/", {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
}

export function getUser({ id }) {
  return request(`/api/users/${id}/`, {
    method: "GET",
    headers: getAuthHeaders({ optional: true }),
  });
}

export function getUsers({ page = 1, limit = 6 }) {
  return request(`/api/users/?page=${page}&limit=${limit}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });
}
