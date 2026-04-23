import { request } from "../baseClient";

export function getLeaderboard() {
  return request("/api/leaderboard/", {
    method: "GET",
  });
}

export function getLeaderboardUserDetail(userId) {
  return request(`/api/leaderboard/${userId}/`, {
    method: "GET",
  });
}
