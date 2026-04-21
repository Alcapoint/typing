class Api {
  constructor(headers) {
    this._headers = headers;
  }

  checkResponse(res) {
    return new Promise((resolve, reject) => {
      if (res.status === 204) {
        return resolve(res);
      }
      const func = res.status < 400 ? resolve : reject;
      res.json().then((data) => func(data));
    });
  }
  
  signin({ email, password }) {
    return fetch("/api/auth/token/login/", {
      method: "POST",
      headers: this._headers,
      body: JSON.stringify({
        email,
        password,
      }),
    }).then(this.checkResponse);
  }

  signout() {
    const token = localStorage.getItem("token");
    return fetch("/api/auth/token/logout/", {
      method: "POST",
      headers: {
        ...this._headers,
        authorization: `Token ${token}`,
      },
    }).then(this.checkResponse);
  }

  signup({ email, password, username, first_name, last_name }) {
    return fetch(`/api/users/`, {
      method: "POST",
      headers: this._headers,
      body: JSON.stringify({
        email,
        password,
        username,
        first_name,
        last_name,
      }),
    }).then(this.checkResponse);
  }

  getUserData() {
    const token = localStorage.getItem("token");
    return fetch(`/api/users/me/`, {
      method: "GET",
      headers: {
        ...this._headers,
        authorization: `Token ${token}`,
      },
    }).then(this.checkResponse);
  }

  updateProfile({ first_name, last_name, age }) {
    const token = localStorage.getItem("token");
    return fetch(`/api/users/me/`, {
      method: "PATCH",
      headers: {
        ...this._headers,
        authorization: `Token ${token}`,
      },
      body: JSON.stringify({
        first_name,
        last_name,
        age: age === "" ? null : Number(age),
      }),
    }).then(this.checkResponse);
  }

  changePassword({ current_password, new_password }) {
    const token = localStorage.getItem("token");
    return fetch(`/api/users/set_password/`, {
      method: "POST",
      headers: {
        ...this._headers,
        authorization: `Token ${token}`,
      },
      body: JSON.stringify({ current_password, new_password }),
    }).then(this.checkResponse);
  }

  changeAvatar({ file }) {
    const token = localStorage.getItem("token");
    return fetch(`/api/users/me/avatar/`, {
      method: "PUT",
      headers: {
        ...this._headers,
        authorization: `Token ${token}`,
      },
      body: JSON.stringify({ avatar: file }),
    }).then(this.checkResponse);
  }

  deleteAvatar() {
    const token = localStorage.getItem("token");
    return fetch(`/api/users/me/avatar/`, {
      method: "DELETE",
      headers: {
        ...this._headers,
        authorization: `Token ${token}`,
      },
    }).then(this.checkResponse);
  }

  resetPassword({ email }) {
    return fetch(`/api/users/reset_password/`, {
      method: "POST",
      headers: {
        ...this._headers,
      },
      body: JSON.stringify({ email }),
    }).then(this.checkResponse);
  }

  getUser({ id }) {
    const token = localStorage.getItem("token");
    const authorization = token ? { authorization: `Token ${token}` } : {};
    return fetch(`/api/users/${id}/`, {
      method: "GET",
      headers: {
        ...this._headers,
        ...authorization,
      },
    }).then(this.checkResponse);
  }

  getUsers({ page = 1, limit = 6 }) {
    const token = localStorage.getItem("token");
    return fetch(`/api/users/?page=${page}&limit=${limit}`, {
      method: "GET",
      headers: {
        ...this._headers,
        authorization: `Token ${token}`,
      },
    }).then(this.checkResponse);
  }

  saveTrainingResult({
    speed,
    accuracy,
    total_time,
    training_text,
    language_code,
    words,
    user_text_id,
    is_personal_text,
  }) {
    const token = localStorage.getItem("token");
    const authorization = token ? { authorization: `Token ${token}` } : {};

    return fetch(`/api/result/`, {
      method: "POST",
      headers: {
        ...this._headers,
        ...authorization,
      },
      body: JSON.stringify({
        speed,
        accuracy,
        total_time,
        training_text,
        language_code,
        user_text_id,
        is_personal_text,
        words,
      }),
    }).then(this.checkResponse);
  }

  getTrainingHistory() {
    const token = localStorage.getItem("token");
    return fetch(`/api/history/`, {
      method: "GET",
      headers: {
        ...this._headers,
        authorization: `Token ${token}`,
      },
    }).then(this.checkResponse);
  }

  getLeaderboard() {
    return fetch(`/api/leaderboard/`, {
      method: "GET",
      headers: this._headers,
    }).then(this.checkResponse);
  }

  getLeaderboardUserDetail(userId) {
    return fetch(`/api/leaderboard/${userId}/`, {
      method: "GET",
      headers: this._headers,
    }).then(this.checkResponse);
  }

  getTrainingDetail(id) {
    const token = localStorage.getItem("token");
    return fetch(`/api/history/${id}/`, {
      method: "GET",
      headers: {
        ...this._headers,
        authorization: `Token ${token}`,
      },
    }).then(this.checkResponse);
  }

  deleteTraining(id) {
    const token = localStorage.getItem("token");
    return fetch(`/api/history/${id}/`, {
      method: "DELETE",
      headers: {
        ...this._headers,
        authorization: `Token ${token}`,
      },
    }).then(this.checkResponse);
  }

  getLanguages() {
    return fetch(`/api/languages/`, {
      method: "GET",
      headers: this._headers,
    }).then(this.checkResponse);
  }

  getHelpSections() {
    return fetch(`/api/help-sections/`, {
      method: "GET",
      headers: this._headers,
    }).then(this.checkResponse);
  }

  getTrainingText({
    language,
    textType,
    trainingMode,
    size,
    includePunctuation,
    includeCapitals,
    userTextId,
  }) {
    const params = new URLSearchParams({ language });

    if (textType) {
      params.set("text_type", textType);
    }

    if (trainingMode) {
      params.set("mode", trainingMode);
    }

    if (typeof size === "number") {
      params.set("size", String(size));
    }

    if (typeof includePunctuation === "boolean") {
      params.set("punctuation", includePunctuation ? "1" : "0");
    }

    if (typeof includeCapitals === "boolean") {
      params.set("capitals", includeCapitals ? "1" : "0");
    }

    if (userTextId) {
      params.set("user_text_id", String(userTextId));
    }

    const token = localStorage.getItem("token");
    const authorization = token ? { authorization: `Token ${token}` } : {};

    return fetch(`/api/text/?${params.toString()}`, {
      method: "GET",
      headers: {
        ...this._headers,
        ...authorization,
      },
    }).then(this.checkResponse);
  }

  getUserTexts() {
    const token = localStorage.getItem("token");
    return fetch(`/api/user-texts/`, {
      method: "GET",
      headers: {
        ...this._headers,
        authorization: `Token ${token}`,
      },
    }).then(this.checkResponse);
  }

  createUserText({ title, content }) {
    const token = localStorage.getItem("token");
    return fetch(`/api/user-texts/`, {
      method: "POST",
      headers: {
        ...this._headers,
        authorization: `Token ${token}`,
      },
      body: JSON.stringify({ title, content }),
    }).then(this.checkResponse);
  }

  updateUserText(id, { title, content }) {
    const token = localStorage.getItem("token");
    return fetch(`/api/user-texts/${id}/`, {
      method: "PATCH",
      headers: {
        ...this._headers,
        authorization: `Token ${token}`,
      },
      body: JSON.stringify({ title, content }),
    }).then(this.checkResponse);
  }

  deleteUserText(id) {
    const token = localStorage.getItem("token");
    return fetch(`/api/user-texts/${id}/`, {
      method: "DELETE",
      headers: {
        ...this._headers,
        authorization: `Token ${token}`,
      },
    }).then(this.checkResponse);
  }

}

export default new Api({
  "content-type": "application/json",
});
