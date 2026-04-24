const DEFAULT_HEADERS = {
  "content-type": "application/json",
};

const ACCESS_TOKEN_STORAGE_KEY = "access_token";
const LEGACY_TOKEN_STORAGE_KEY = "token";

let refreshPromise = null;

function createClientError(detail, status) {
  const error = new Error(detail);
  error.detail = detail;
  if (status !== undefined) {
    error.status = status;
  }
  return error;
}

function parseResponsePayload(res) {
  if (res.status === 204) {
    return Promise.resolve(null);
  }

  return res.text().then((rawText) => {
    if (!rawText) {
      return null;
    }

    try {
      return JSON.parse(rawText);
    } catch (error) {
      return { detail: rawText };
    }
  });
}

function buildError(res, data) {
  const error = data || {
    detail: `Request failed with status ${res.status}`,
  };
  error.status = res.status;
  return error;
}

async function checkResponse(res) {
  const data = await parseResponsePayload(res);

  if (res.ok) {
    return data;
  }

  return Promise.reject(buildError(res, data));
}

function buildHeaders(headers = {}) {
  return {
    ...DEFAULT_HEADERS,
    ...headers,
  };
}

export function getToken() {
  return localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)
    || localStorage.getItem(LEGACY_TOKEN_STORAGE_KEY);
}

export function setToken(token) {
  if (!token) {
    clearToken();
    return;
  }

  localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
  localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY);
}

export function clearToken() {
  localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY);
}

export function hasToken() {
  return Boolean(getToken());
}

export function getAuthHeaders({ optional = false } = {}) {
  const token = getToken();

  if (!token && !optional) {
    return {};
  }

  return token ? { authorization: `Bearer ${token}` } : {};
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    credentials: "include",
    ...options,
    headers: buildHeaders(options.headers),
  });

  return response;
}

export async function refreshAccessToken() {
  const csrfToken = getToken();

  if (!csrfToken) {
    throw createClientError("No access token available for refresh.");
  }

  if (!refreshPromise) {
    refreshPromise = fetchJson("/api/auth/token/refresh/", {
      method: "POST",
      headers: {
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({}),
    })
      .then(checkResponse)
      .then((data) => {
        if (!data?.access_token) {
          throw createClientError("Refresh response does not contain access token.");
        }

        setToken(data.access_token);
        return data.access_token;
      })
      .catch((error) => {
        clearToken();
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

export async function request(url, { headers = {}, skipAuthRefresh = false, ...options } = {}) {
  const response = await fetchJson(url, { ...options, headers });

  if (response.status !== 401 || skipAuthRefresh || !hasToken()) {
    return checkResponse(response);
  }

  try {
    await refreshAccessToken();
  } catch (error) {
    return checkResponse(response);
  }

  const nextHeaders = {
    ...headers,
  };

  if (headers.authorization !== undefined) {
    nextHeaders.authorization = `Bearer ${getToken()}`;
  }

  if (headers["x-csrf-token"] !== undefined) {
    nextHeaders["x-csrf-token"] = getToken();
  }

  const retryResponse = await fetchJson(url, {
    ...options,
    headers: nextHeaders,
  });

  return checkResponse(retryResponse);
}
