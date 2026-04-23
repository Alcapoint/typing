import {
  APPEND_TEXT_SIZES,
  MIN_WORD_DURATION_SECONDS,
  MISTAKE_MODE_SIZES,
  TEXT_SIZE_CONFIG,
  WORDS_PER_15_SECONDS,
} from "../../configs/trainer";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const getOptionLabel = (options, value) => (
  options.find((option) => option.value === value)?.label || String(value)
);

export const getPluralForm = (value, forms) => {
  const absValue = Math.abs(value) % 100;
  const lastDigit = absValue % 10;

  if (absValue > 10 && absValue < 20) {
    return forms[2];
  }
  if (lastDigit > 1 && lastDigit < 5) {
    return forms[1];
  }
  if (lastDigit === 1) {
    return forms[0];
  }
  return forms[2];
};

export const getTextSizeConfig = (textType) => (
  TEXT_SIZE_CONFIG[textType] || TEXT_SIZE_CONFIG.custom
);

export const getLockedTextSize = (textType, trainingMode, timeLimitSeconds) => {
  if (trainingMode === "time") {
    return Math.round((timeLimitSeconds / 15) * WORDS_PER_15_SECONDS);
  }

  if (trainingMode === "mistake") {
    return textType === "quote"
      ? MISTAKE_MODE_SIZES.quote
      : MISTAKE_MODE_SIZES.default;
  }

  return getTextSizeConfig(textType).defaultValue;
};

export const getRequestedTextSize = (
  textType,
  trainingMode,
  textSize,
  timeLimitSeconds
) => {
  if (trainingMode !== "standard") {
    return getLockedTextSize(textType, trainingMode, timeLimitSeconds);
  }

  const config = getTextSizeConfig(textType);
  return clamp(textSize, config.min, config.max);
};

export const getAppendSize = (textType) => (
  textType === "quote" ? APPEND_TEXT_SIZES.quote : APPEND_TEXT_SIZES.default
);

export const getTextSizeLabel = (textType, size) => {
  const { forms } = getTextSizeConfig(textType);
  return `≈ ${size} ${getPluralForm(size, forms)}`;
};

export const getAutoSizeLabel = (textType, size) => (
  `≈ ${size} ${getPluralForm(size, ["слово", "слова", "слов"])}`
);

export const getAdjustedTotalTime = (
  seconds,
  compensateCompletionDelay = false
) => Math.max(0, seconds - (compensateCompletionDelay ? 1 : 0));

export const getWordsFromValue = (value) => (
  value.trim().length ? value.trim().split(/\s+/) : []
);

export const getCompletedWordCount = (value) => {
  const typedWords = getWordsFromValue(value);

  if (!typedWords.length) {
    return 0;
  }

  return value.endsWith(" ")
    ? typedWords.length
    : Math.max(typedWords.length - 1, 0);
};

export const getTypedErrorCount = (value, text) => {
  let mismatchCount = 0;

  for (let index = 0; index < value.length; index += 1) {
    if (value[index] !== text[index]) {
      mismatchCount += 1;
    }
  }

  return mismatchCount;
};

export const getWordErrorCount = (correctWord = "", typedWord = "") => {
  const maxLength = Math.max(correctWord.length, typedWord.length);
  let mismatchCount = 0;

  for (let index = 0; index < maxLength; index += 1) {
    if ((correctWord[index] || "") !== (typedWord[index] || "")) {
      mismatchCount += 1;
    }
  }

  return mismatchCount;
};

export const getSafeWordDuration = (duration) => (
  Math.max(duration, MIN_WORD_DURATION_SECONDS)
);

export const getWordSpeedMetrics = (
  correctWord = "",
  typedWord = "",
  duration = 0
) => {
  const safeDuration = getSafeWordDuration(duration);
  const baseCharsCount = Math.max(correctWord.length, typedWord.length, 1);
  const minutes = safeDuration / 60;

  return {
    wpm: Math.round((baseCharsCount / 5) / minutes),
    cpm: Math.round(baseCharsCount / minutes),
  };
};

export const getSourceWordRanges = (words) => {
  let cursor = 0;

  return words.map((word) => {
    const range = {
      correct: word,
      start: cursor,
      end: cursor + word.length,
    };

    cursor += word.length + 1;
    return range;
  });
};
