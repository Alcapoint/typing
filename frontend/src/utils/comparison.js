const COMPARISON_STORAGE_KEY = "typing-trainer-comparison-ids";
export const COMPARISON_LIMIT = 3;

const normalizeSlots = (value) => {
  const source = Array.isArray(value) ? value : [];
  return Array.from({ length: COMPARISON_LIMIT }, (_, index) => {
    const number = Number(source[index]);
    return Number.isFinite(number) ? number : null;
  });
};

export const getComparisonTrainingIds = () => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    return normalizeSlots(JSON.parse(window.localStorage.getItem(COMPARISON_STORAGE_KEY)));
  } catch (error) {
    return normalizeSlots([]);
  }
};

export const saveComparisonTrainingIds = (ids) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    COMPARISON_STORAGE_KEY,
    JSON.stringify(normalizeSlots(ids))
  );
};

export const addComparisonTrainingId = (id) => {
  const numericId = Number(id);
  const ids = getComparisonTrainingIds();

  if (ids.includes(numericId)) {
    return {
      status: "duplicate",
      ids,
    };
  }

  const emptyIndex = ids.findIndex((itemId) => itemId === null);
  const nextIds = [...ids];
  nextIds[emptyIndex === -1 ? 0 : emptyIndex] = numericId;
  saveComparisonTrainingIds(nextIds);

  return {
    status: emptyIndex === -1 ? "replaced" : "added",
    ids: nextIds,
  };
};

export const setComparisonTrainingIdAt = (slotIndex, id) => {
  const numericId = Number(id);
  const ids = getComparisonTrainingIds();

  if (ids.some((itemId, index) => index !== slotIndex && itemId === numericId)) {
    return {
      status: "duplicate",
      ids,
    };
  }

  const nextIds = [...ids];
  nextIds[slotIndex] = numericId;
  saveComparisonTrainingIds(nextIds);

  return {
    status: "set",
    ids: nextIds,
  };
};

export const removeComparisonTrainingIdAt = (slotIndex) => {
  const ids = getComparisonTrainingIds();
  const nextIds = [...ids];
  nextIds[slotIndex] = null;
  saveComparisonTrainingIds(nextIds);
  return nextIds;
};
