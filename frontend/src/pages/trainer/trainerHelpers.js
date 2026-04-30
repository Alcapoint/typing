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
  if (forms[0] === "word") {
    return Math.abs(value) === 1 ? forms[0] : forms[1];
  }

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

const getFormsForLocale = (forms, locale = "ru") => {
  if (Array.isArray(forms)) {
    return forms;
  }

  return forms?.[locale] || forms?.ru || ["word", "words", "words"];
};

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

export const getTextSizeLabel = (textType, size, locale = "ru") => {
  const { forms } = getTextSizeConfig(textType);
  return `≈ ${size} ${getPluralForm(size, getFormsForLocale(forms, locale))}`;
};

export const getAutoSizeLabel = (textType, size, locale = "ru") => {
  const { forms } = getTextSizeConfig(textType);
  return `≈ ${size} ${getPluralForm(size, getFormsForLocale(forms, locale))}`;
};

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

export const isWordPerfect = (correctWord = "", typedWord = "") => (
  correctWord === typedWord
);

export const getWordBurstMetrics = (
  correctWord = "",
  typedWord = "",
  duration = 0
) => {
  const safeDuration = getSafeWordDuration(duration);
  const baseCharsCount = Math.max(correctWord.length, typedWord.length, 1);
  const minutes = safeDuration / 60;

  return {
    burst: Math.round((baseCharsCount / 5) / minutes),
    cpm: Math.round(baseCharsCount / minutes),
  };
};

export const decorateWordsWithProgressMetrics = (words = []) => {
  let elapsedSeconds = 0;
  let progressCorrectCharsWithSpaces = 0;
  let progressRawCharsWithSpaces = 0;

  return words.map((word, index) => {
    const safeDuration = getSafeWordDuration(word.duration);
    const hasSeparatorAfter = index < words.length - 1 ? 1 : 0;
    const perfect = isWordPerfect(word.correct, word.typed);
    const rawCharsWithSpaces = (word.typed?.length || 0) + hasSeparatorAfter;
    const correctCharsWithSpaces = perfect
      ? (word.correct?.length || 0) + hasSeparatorAfter
      : 0;
    const wordMinutes = safeDuration / 60;
    elapsedSeconds += safeDuration;
    progressRawCharsWithSpaces += rawCharsWithSpaces;
    progressCorrectCharsWithSpaces += correctCharsWithSpaces;

    const elapsedMinutes = elapsedSeconds / 60;

    return {
      ...word,
      burst: Number(word.burst || 0),
      wpm: wordMinutes ? Math.round((correctCharsWithSpaces / 5) / wordMinutes) : 0,
      rwpm: wordMinutes ? Math.round((rawCharsWithSpaces / 5) / wordMinutes) : 0,
      progress_wpm: elapsedMinutes
        ? Math.round((progressCorrectCharsWithSpaces / 5) / elapsedMinutes)
        : 0,
      progress_rwpm: elapsedMinutes
        ? Math.round((progressRawCharsWithSpaces / 5) / elapsedMinutes)
        : 0,
    };
  });
};

export const getLiveProgressMetrics = (
  value = "",
  text = "",
  elapsedSeconds = 0
) => {
  if (!value.length || !elapsedSeconds) {
    return {
      wpm: 0,
      rwpm: 0,
    };
  }

  const sourceWords = text.split(" ");
  const typedWords = value.length ? value.split(" ") : [];
  const completedWordCount = value.endsWith(" ")
    ? typedWords.length
    : Math.max(typedWords.length - 1, 0);
  let correctCharsWithSpaces = 0;

  for (let index = 0; index < completedWordCount; index += 1) {
    if (typedWords[index] === sourceWords[index]) {
      correctCharsWithSpaces += (sourceWords[index]?.length || 0) + 1;
    }
  }

  const isFullTextTyped = value === text;
  if (
    isFullTextTyped
    && typedWords.length
    && typedWords[typedWords.length - 1] === sourceWords[typedWords.length - 1]
  ) {
    correctCharsWithSpaces += sourceWords[typedWords.length - 1]?.length || 0;
  }

  const minutes = elapsedSeconds / 60;

  return {
    wpm: minutes ? Math.round((correctCharsWithSpaces / 5) / minutes) : 0,
    rwpm: minutes ? Math.round((value.length / 5) / minutes) : 0,
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
