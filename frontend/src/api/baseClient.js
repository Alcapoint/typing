const DEFAULT_HEADERS = {
  "content-type": "application/json",
};

function checkResponse(res) {
  if (res.status === 204) {
    return Promise.resolve(res);
  }

  return res.text().then((rawText) => {
    let data = null;

    if (rawText) {
      try {
        data = JSON.parse(rawText);
      } catch (error) {
        data = {
          detail: rawText,
        };
      }
    }

    if (res.ok) {
      return data;
    }

    return Promise.reject(
      data || {
        detail: `Request failed with status ${res.status}`,
      }
    );
  });
}

export function getToken() {
  return localStorage.getItem("token");
}

export function getAuthHeaders({ optional = false } = {}) {
  const token = getToken();

  if (!token && !optional) {
    return {};
  }

  return token ? { authorization: `Token ${token}` } : {};
}

export function request(url, { headers = {}, ...options } = {}) {
  return fetch(url, {
    ...options,
    headers: {
      ...DEFAULT_HEADERS,
      ...headers,
    },
  }).then(checkResponse);
}
