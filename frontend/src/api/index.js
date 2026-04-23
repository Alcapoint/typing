import * as authApi from "./resources/auth";
import * as leaderboardApi from "./resources/leaderboard";
import * as trainerApi from "./resources/trainer";
import * as usersApi from "./resources/users";

const api = {
  ...authApi,
  ...usersApi,
  ...trainerApi,
  ...leaderboardApi,
};

export default api;
