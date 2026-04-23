import { getAuthHeaders, request } from "../baseClient";

export function saveTrainingResult({
  speed,
  accuracy,
  total_time,
  training_text,
  language_code,
  words,
  user_text_id,
  is_personal_text,
}) {
  return request("/api/result/", {
    method: "POST",
    headers: getAuthHeaders({ optional: true }),
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
  });
}

export function getTrainingHistory() {
  return request("/api/history/", {
    method: "GET",
    headers: getAuthHeaders(),
  });
}

export function getTrainingDetail(id) {
  return request(`/api/history/${id}/`, {
    method: "GET",
    headers: getAuthHeaders(),
  });
}

export function deleteTraining(id) {
  return request(`/api/history/${id}/`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
}

export function getLanguages() {
  return request("/api/languages/", {
    method: "GET",
  });
}

export function getHelpSections() {
  return request("/api/help-sections/", {
    method: "GET",
  });
}

export function getTrainingText({
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

  return request(`/api/text/?${params.toString()}`, {
    method: "GET",
    headers: getAuthHeaders({ optional: true }),
  });
}

export function getUserTexts() {
  return request("/api/user-texts/", {
    method: "GET",
    headers: getAuthHeaders(),
  });
}

export function createUserText({ title, content }) {
  return request("/api/user-texts/", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ title, content }),
  });
}

export function updateUserText(id, { title, content }) {
  return request(`/api/user-texts/${id}/`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({ title, content }),
  });
}

export function deleteUserText(id) {
  return request(`/api/user-texts/${id}/`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
}
