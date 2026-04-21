import { useEffect, useLayoutEffect, useRef, useState } from "react";
import api from "./api";
import ResultScreen from "./ResultScreen";

const TEXT_TYPES = [
  { value: "quote", label: "Цитата" },
  { value: "custom", label: "Кастомный" },
  { value: "nonsense", label: "Несуществующие слова" },
  { value: "words", label: "Случайные слова" },
  { value: "user", label: "Свой текст" },
];

const TRAINING_MODES = [
  { value: "standard", label: "Обычный" },
  { value: "time", label: "На время" },
  { value: "mistake", label: "До ошибки" },
];

const TIME_LIMITS = [
  { value: 15, label: "15 сек" },
  { value: 30, label: "30 сек" },
  { value: 60, label: "60 сек" },
  { value: 120, label: "120 сек" },
];

const WORDS_PER_15_SECONDS = 25;

const TEXT_SIZE_CONFIG = {
  quote: {
    min: 25,
    max: 200,
    step: 25,
    defaultValue: 25,
    forms: ["слово", "слова", "слов"],
  },
  custom: {
    min: 20,
    max: 140,
    step: 10,
    defaultValue: 40,
    forms: ["слово", "слова", "слов"],
  },
  nonsense: {
    min: 20,
    max: 140,
    step: 10,
    defaultValue: 40,
    forms: ["слово", "слова", "слов"],
  },
  words: {
    min: 20,
    max: 140,
    step: 10,
    defaultValue: 40,
    forms: ["слово", "слова", "слов"],
  },
};

const MISTAKE_MODE_SIZES = {
  quote: 160,
  default: 160,
};

const APPEND_TEXT_SIZES = {
  quote: WORDS_PER_15_SECONDS,
  default: 80,
};

const MIN_WORD_DURATION_SECONDS = 0.5;
const DEFAULT_LANGUAGES = [
  {
    code: "ru",
    name: "Russian",
    native_name: "Русский",
    flag_emoji: "🇷🇺",
  },
  {
    code: "en",
    name: "English",
    native_name: "English",
    flag_emoji: "🇬🇧",
  },
];

const DEFAULT_HELP_SECTIONS = [
  {
    title: "Горячие клавиши",
    items: [
      "Tab — загрузить новый текст",
      "Enter — завершить тренировку досрочно",
      "Esc — закрыть открытые меню",
    ],
  },
  {
    title: "Метрики",
    items: [
      "WPM — скорость в словах в минуту",
      "CPM — скорость в символах в минуту",
      "Accuracy — процент правильно набранных символов",
      "Time — общее время прохождения текста",
    ],
  },
  {
    title: "Подсказки",
    items: [
      "Шестерёнка открывает настройки языка, вида текста и режима",
      "В режиме На время текст автоматически продолжается дальше",
      "Клик по странице возвращает фокус в поле ввода",
    ],
  },
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const getOptionLabel = (options, value) => (
  options.find((option) => option.value === value)?.label || String(value)
);

const getPluralForm = (value, forms) => {
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

const getTextSizeConfig = (textType) => (
  TEXT_SIZE_CONFIG[textType] || TEXT_SIZE_CONFIG.custom
);

const getLockedTextSize = (textType, trainingMode, timeLimitSeconds) => {
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

const getRequestedTextSize = (
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

const getAppendSize = (textType) => (
  textType === "quote" ? APPEND_TEXT_SIZES.quote : APPEND_TEXT_SIZES.default
);

const getTextSizeLabel = (textType, size) => {
  const { forms } = getTextSizeConfig(textType);
  return `≈ ${size} ${getPluralForm(size, forms)}`;
};

const getAutoSizeLabel = (textType, size) => {
  return `≈ ${size} ${getPluralForm(size, ["слово", "слова", "слов"])}`;
};

function TrainerPage({ currentUser, isLoggedIn, replayTraining }) {
  const [selectedTextType, setSelectedTextType] = useState("quote");
  const [userTexts, setUserTexts] = useState([]);
  const [selectedUserTextId, setSelectedUserTextId] = useState(null);
  const [trainingMode, setTrainingMode] = useState("standard");
  const [timeLimitSeconds, setTimeLimitSeconds] = useState(30);
  const [textSize, setTextSize] = useState(TEXT_SIZE_CONFIG.quote.defaultValue);
  const [includePunctuation, setIncludePunctuation] = useState(true);
  const [includeCapitals, setIncludeCapitals] = useState(true);
  const [languages, setLanguages] = useState(DEFAULT_LANGUAGES);
  const [helpSections, setHelpSections] = useState(DEFAULT_HELP_SECTIONS);
  const [selectedLanguage, setSelectedLanguage] = useState(
    localStorage.getItem("trainer-language") || "ru"
  );
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const [isHelpMenuOpen, setIsHelpMenuOpen] = useState(false);
  const [openSettingsField, setOpenSettingsField] = useState("");
  const [text, setText] = useState("");
  const [textError, setTextError] = useState("");
  const [isTextLoading, setIsTextLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [input, setInput] = useState("");
  const [startTime, setStartTime] = useState(null);
  const [wpm, setWpm] = useState(0);
  const [cpm, setCpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [finished, setFinished] = useState(false);
  const [wordStats, setWordStats] = useState([]);
  const [currentWordStart, setCurrentWordStart] = useState(null);

  const inputRef = useRef(null);
  const finishTimeout = useRef(null);
  const settingsMenuRef = useRef(null);
  const helpMenuRef = useRef(null);
  const wordsRef = useRef([]);
  const trainerTextRef = useRef(null);
  const trainerWordRefs = useRef([]);
  const textRequestIdRef = useRef(0);
  const completedWordDurationsRef = useRef([]);
  const skipAutoLoadRef = useRef(Boolean(replayTraining?.training_text));
  const lastAutoScrollTopRef = useRef(0);
  const appendInFlightRef = useRef(false);

  const requestedTextSize = getRequestedTextSize(
    selectedTextType,
    trainingMode,
    textSize,
    timeLimitSeconds
  );
  const availableTextTypes = isLoggedIn
    ? TEXT_TYPES
    : TEXT_TYPES.filter((type) => type.value !== "user");

  const applyTrainingText = (content) => {
    const nextContent = (content || "").replace(/\s+/g, " ").trim();

    setText(nextContent);
    setTextError("");
    setElapsedSeconds(0);
    setTotalTime(0);
    setInput("");
    setStartTime(null);
    setFinished(false);
    setWpm(0);
    setCpm(0);
    setAccuracy(100);
    setWordStats([]);
    setCurrentWordStart(null);
    wordsRef.current = nextContent ? nextContent.split(" ") : [];
    completedWordDurationsRef.current = [];
    lastAutoScrollTopRef.current = 0;
    appendInFlightRef.current = false;

    if (finishTimeout.current) {
      clearTimeout(finishTimeout.current);
      finishTimeout.current = null;
    }

    if (trainerTextRef.current) {
      trainerTextRef.current.scrollTo({ top: 0, behavior: "auto" });
    }
  };

  const buildTextRequestConfig = (overrides = {}) => {
    const requestTextType = overrides.textType ?? selectedTextType;
    const requestMode = overrides.trainingMode ?? trainingMode;
    const requestTimeLimit = overrides.timeLimitSeconds ?? timeLimitSeconds;
    const requestTextSize = overrides.textSize ?? textSize;

    return {
      language: overrides.language ?? selectedLanguage,
      textType: requestTextType,
      trainingMode: requestMode,
      userTextId:
        requestTextType === "user"
          ? overrides.userTextId ?? selectedUserTextId
          : undefined,
      size:
        overrides.size
        ?? getRequestedTextSize(
          requestTextType,
          requestMode,
          requestTextSize,
          requestTimeLimit
        ),
      includePunctuation:
        requestTextType === "custom"
          ? overrides.includePunctuation ?? includePunctuation
          : undefined,
      includeCapitals:
        requestTextType === "custom"
          ? overrides.includeCapitals ?? includeCapitals
          : undefined,
    };
  };

  const loadText = (overrides = {}) => {
    if ((overrides.textType ?? selectedTextType) === "user" && !(overrides.userTextId ?? selectedUserTextId)) {
      setText("");
      setInput("");
      setTextError("Сначала добавьте свой текст в профиле и выберите его.");
      setIsTextLoading(false);
      return;
    }

    const requestId = textRequestIdRef.current + 1;
    textRequestIdRef.current = requestId;
    setIsTextLoading(true);
    setTextError("");

    api
      .getTrainingText(buildTextRequestConfig(overrides))
      .then((data) => {
        if (requestId !== textRequestIdRef.current) {
          return;
        }
        if (!data?.content) {
          throw new Error("empty-text");
        }
        applyTrainingText(data.content);
      })
      .catch(() => {
        if (requestId !== textRequestIdRef.current) {
          return;
        }
        setText("");
        wordsRef.current = [];
        setInput("");
        setTextError("Не удалось загрузить текст для выбранных настроек.");
      })
      .finally(() => {
        if (requestId === textRequestIdRef.current) {
          setIsTextLoading(false);
        }
      });
  };

  const appendTextChunk = () => {
    if (appendInFlightRef.current || trainingMode !== "time") {
      return;
    }

    appendInFlightRef.current = true;
    const activeRequestId = textRequestIdRef.current;

    api
      .getTrainingText(buildTextRequestConfig({ size: getAppendSize(selectedTextType) }))
      .then((data) => {
        if (activeRequestId !== textRequestIdRef.current || !data?.content) {
          return;
        }

        setText((previousText) => {
          const nextText = `${previousText} ${data.content}`.replace(/\s+/g, " ").trim();
          wordsRef.current = nextText ? nextText.split(" ") : [];
          return nextText;
        });
      })
      .catch(() => null)
      .finally(() => {
        if (activeRequestId === textRequestIdRef.current) {
          appendInFlightRef.current = false;
        }
      });
  };

  useEffect(() => {
    if (!isLoggedIn) {
      setUserTexts([]);
      setSelectedUserTextId(null);
      return;
    }

    api
      .getUserTexts()
      .then((data) => {
        const nextTexts = Array.isArray(data) ? data : [];
        setUserTexts(nextTexts);
        setSelectedUserTextId((currentId) => (
          nextTexts.some((item) => item.id === currentId)
            ? currentId
            : nextTexts[0]?.id || null
        ));
      })
      .catch(() => {
        setUserTexts([]);
        setSelectedUserTextId(null);
      });
  }, [isLoggedIn, currentUser?.id]);

  useEffect(() => {
    api
      .getLanguages()
      .then((data) => {
        if (!Array.isArray(data) || !data.length) {
          return;
        }

        setLanguages(data);

        const savedLanguage = localStorage.getItem("trainer-language");
        const nextLanguage = data.some((item) => item.code === savedLanguage)
          ? savedLanguage
          : data.some((item) => item.code === "ru")
            ? "ru"
            : data[0].code;

        setSelectedLanguage(nextLanguage);
      })
      .catch(() => {
        setLanguages(DEFAULT_LANGUAGES);
      });
  }, []);

  useEffect(() => {
    api
      .getHelpSections()
      .then((data) => {
        if (!Array.isArray(data) || !data.length) {
          return;
        }

        const normalizedSections = data
          .filter((section) => section?.title)
          .map((section) => ({
            title: section.title,
            items: Array.isArray(section.items)
              ? section.items.map((item) => item?.text).filter(Boolean)
              : [],
          }))
          .filter((section) => section.items.length);

        if (normalizedSections.length) {
          setHelpSections(normalizedSections);
        }
      })
      .catch(() => {
        setHelpSections(DEFAULT_HELP_SECTIONS);
      });
  }, []);

  useEffect(() => {
    if (!selectedLanguage) {
      return;
    }

    if (!isLoggedIn && selectedTextType === "user") {
      setSelectedTextType("quote");
      return;
    }

    if (skipAutoLoadRef.current) {
      skipAutoLoadRef.current = false;
      return;
    }

    localStorage.setItem("trainer-language", selectedLanguage);
    loadText();
  }, [
    selectedLanguage,
    selectedTextType,
    selectedUserTextId,
    trainingMode,
    timeLimitSeconds,
    requestedTextSize,
    includePunctuation,
    includeCapitals,
  ]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!settingsMenuRef.current?.contains(event.target)) {
        setIsSettingsMenuOpen(false);
        setOpenSettingsField("");
      }
      if (!helpMenuRef.current?.contains(event.target)) {
        setIsHelpMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    if (text) {
      inputRef.current?.focus();
    }
  }, [text]);

  useEffect(() => {
    if (!startTime || finished) {
      return undefined;
    }

    const tick = () => {
      setElapsedSeconds((Date.now() - startTime) / 1000);
    };

    tick();
    const intervalId = setInterval(tick, 100);
    return () => clearInterval(intervalId);
  }, [finished, startTime]);

  useEffect(() => {
    if (
      trainingMode !== "time"
      || !startTime
      || finished
      || elapsedSeconds < timeLimitSeconds
    ) {
      return;
    }

    if (finishTimeout.current) {
      clearTimeout(finishTimeout.current);
      finishTimeout.current = null;
    }

    finalizeTest(input);
  }, [elapsedSeconds, finished, input, startTime, timeLimitSeconds, trainingMode]);

  useEffect(() => {
    if (replayTraining?.training_text) {
      skipAutoLoadRef.current = true;
      textRequestIdRef.current += 1;

      if (replayTraining.language?.code) {
        setSelectedLanguage(replayTraining.language.code);
        localStorage.setItem("trainer-language", replayTraining.language.code);
      }

      if (replayTraining.is_personal_text) {
        setSelectedTextType("user");
      }

      applyTrainingText(
        replayTraining.training_text
      );
    }
  }, [replayTraining]);

  const getCurrentWordIndex = () => {
    if (!wordsRef.current.length) {
      return 0;
    }

    return Math.min(
      input.split(" ").length - 1,
      wordsRef.current.length - 1
    );
  };

  useLayoutEffect(() => {
    const scrollContainer = trainerTextRef.current;

    if (!scrollContainer) {
      return;
    }

    const rafId = window.requestAnimationFrame(() => {
      const activeMarker = scrollContainer.querySelector(".current, .current-space-slot");
      const fallbackWordElement = trainerWordRefs.current[getCurrentWordIndex()];
      const targetElement = activeMarker || fallbackWordElement;

      if (!targetElement) {
        return;
      }

      const computedStyles = window.getComputedStyle(scrollContainer);
      const lineHeight = parseFloat(computedStyles.lineHeight) || 50;
      const maxScrollTop = Math.max(
        0,
        scrollContainer.scrollHeight - scrollContainer.clientHeight
      );
      const containerRect = scrollContainer.getBoundingClientRect();
      const targetRect = targetElement.getBoundingClientRect();
      const targetMiddle =
        targetRect.top - containerRect.top + scrollContainer.scrollTop + targetRect.height / 2;
      const triggerLine = scrollContainer.scrollTop + scrollContainer.clientHeight / 2;

      if (targetMiddle >= triggerLine && scrollContainer.scrollTop < maxScrollTop) {
        const nextScrollTop = Math.min(
          Math.max(
            targetMiddle - scrollContainer.clientHeight / 2 + lineHeight * 0.35,
            scrollContainer.scrollTop + lineHeight * 0.9
          ),
          maxScrollTop
        );

        if (nextScrollTop > lastAutoScrollTopRef.current + 1) {
          lastAutoScrollTopRef.current = nextScrollTop;
          scrollContainer.scrollTo({
            top: nextScrollTop,
            behavior: "smooth",
          });
        }
      } else if (
        scrollContainer.scrollTop < lastAutoScrollTopRef.current - lineHeight / 2
      ) {
        lastAutoScrollTopRef.current = scrollContainer.scrollTop;
      }
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [input, text]);

  const persistResult = (finalWords, totalTimeValue, finalSpeed, finalAccuracy) => {
    if (!isLoggedIn) {
      return;
    }

    api.saveTrainingResult({
      speed: finalSpeed,
      accuracy: finalAccuracy,
      total_time: totalTimeValue,
      training_text: text,
      language_code: selectedLanguage,
      user_text_id: selectedTextType === "user" ? selectedUserTextId : null,
      is_personal_text: selectedTextType === "user",
      words: finalWords,
    }).catch(() => null);
  };

  const getAdjustedTotalTime = (seconds, compensateCompletionDelay = false) => (
    Math.max(0, seconds - (compensateCompletionDelay ? 1 : 0))
  );

  const getWordsFromValue = (value) => (
    value.trim().length ? value.trim().split(/\s+/) : []
  );

  const getCompletedWordCount = (value) => {
    const typedWords = getWordsFromValue(value);

    if (!typedWords.length) {
      return 0;
    }

    return value.endsWith(" ")
      ? typedWords.length
      : Math.max(typedWords.length - 1, 0);
  };

  const getTypedErrorCount = (value) => {
    let mismatchCount = 0;

    for (let index = 0; index < value.length; index += 1) {
      if (value[index] !== text[index]) {
        mismatchCount += 1;
      }
    }

    return mismatchCount;
  };

  const getWordErrorCount = (correctWord = "", typedWord = "") => {
    const maxLength = Math.max(correctWord.length, typedWord.length);
    let mismatchCount = 0;

    for (let index = 0; index < maxLength; index += 1) {
      if ((correctWord[index] || "") !== (typedWord[index] || "")) {
        mismatchCount += 1;
      }
    }

    return mismatchCount;
  };

  const getSafeWordDuration = (duration) => Math.max(duration, MIN_WORD_DURATION_SECONDS);

  const getWordSpeedMetrics = (correctWord = "", typedWord = "", duration = 0) => {
    const safeDuration = getSafeWordDuration(duration);
    const baseCharsCount = Math.max(correctWord.length, typedWord.length, 1);
    const minutes = safeDuration / 60;

    return {
      wpm: Math.round((baseCharsCount / 5) / minutes),
      cpm: Math.round(baseCharsCount / minutes),
    };
  };

  const getSourceWordRanges = () => {
    let cursor = 0;

    return wordsRef.current.map((word) => {
      const range = {
        correct: word,
        start: cursor,
        end: cursor + word.length,
      };

      cursor += word.length + 1;
      return range;
    });
  };

  function finalizeTest(value, options = {}) {
    if (finished) {
      return;
    }

    const now = Date.now();
    const sessionStartTime = options.startedAt ?? startTime;
    const activeWordStart = options.currentWordStartedAt ?? currentWordStart;
    const sourceWordRanges = getSourceWordRanges();
    const typedWordRanges = sourceWordRanges.filter(({ start }) => start < value.length);
    const finalWords = typedWordRanges.map(({ correct, start, end }, index) => {
      const typedWord = value.slice(start, Math.min(end, value.length));
      const isLastTypedWord = index === typedWordRanges.length - 1;
      const duration = completedWordDurationsRef.current[index]
        ?? (
          isLastTypedWord && activeWordStart
            ? (now - activeWordStart) / 1000
            : 0
        );
      const { wpm: wordWpm, cpm: wordCpm } = getWordSpeedMetrics(
        correct,
        typedWord,
        duration
      );

      return {
        correct,
        typed: typedWord,
        duration,
        wpm: wordWpm,
        cpm: wordCpm,
        errors: getWordErrorCount(correct, typedWord),
      };
    });

    const rawTotalTime = sessionStartTime ? (now - sessionStartTime) / 1000 : 0;
    const totalTimeValue = trainingMode === "time"
      ? Math.min(rawTotalTime, timeLimitSeconds)
      : getAdjustedTotalTime(rawTotalTime, options.compensateCompletionDelay);
    const typedErrors = getTypedErrorCount(value);
    const finalSpeed = totalTimeValue
      ? Math.round((value.length / 5) / (totalTimeValue / 60))
      : 0;
    const finalAccuracy = value.length
      ? Number((((value.length - typedErrors) / value.length) * 100).toFixed(1))
      : 100;

    setWpm(finalSpeed);
    setCpm(totalTimeValue ? Math.round(value.length / (totalTimeValue / 60)) : 0);
    setAccuracy(finalAccuracy);
    setElapsedSeconds(rawTotalTime);
    setTotalTime(totalTimeValue);
    setWordStats(finalWords);
    setFinished(true);
    persistResult(finalWords, totalTimeValue, finalSpeed, finalAccuracy);
  }

  const updateLiveMetrics = (value, currentStartTime) => {
    const typedErrors = getTypedErrorCount(value);
    const nextAccuracy = value.length
      ? Number((((value.length - typedErrors) / value.length) * 100).toFixed(1))
      : 100;

    setAccuracy(nextAccuracy);

    if (currentStartTime) {
      const elapsedMinutes = (Date.now() - currentStartTime) / 1000 / 60;
      const nextWpm = (value.length / 5) / elapsedMinutes || 0;

      setWpm(Math.round(nextWpm));
      setCpm(Math.round(value.length / elapsedMinutes));
    } else {
      setWpm(0);
      setCpm(0);
    }
  };

  const handleChange = (event) => {
    if (finished) {
      return;
    }

    const value = event.target.value;
    const previousCompletedWordCount = getCompletedWordCount(input);
    const nextCompletedWordCount = getCompletedWordCount(value);

    if (value.length > text.length) {
      return;
    }

    let activeStartTime = startTime;

    if (!activeStartTime && value.length === 1) {
      const now = Date.now();
      activeStartTime = now;
      setStartTime(now);
      setCurrentWordStart(now);
    }

    if (value.length > input.length) {
      const lastChar = value[value.length - 1];
      const expectedChar = text[value.length - 1];

      if (lastChar === " ") {
        const now = Date.now();
        const completedWordIndex = Math.max(nextCompletedWordCount - 1, 0);
        const duration = currentWordStart ? (now - currentWordStart) / 1000 : 0;

        completedWordDurationsRef.current = completedWordDurationsRef.current.slice(
          0,
          completedWordIndex
        );
        completedWordDurationsRef.current[completedWordIndex] = duration;
        setCurrentWordStart(now);
      }

      if (trainingMode === "mistake" && lastChar !== expectedChar) {
        setInput(value);
        updateLiveMetrics(value, activeStartTime);
        finalizeTest(value, {
          startedAt: activeStartTime,
          currentWordStartedAt: currentWordStart || activeStartTime,
        });
        return;
      }
    }

    if (nextCompletedWordCount < previousCompletedWordCount) {
      completedWordDurationsRef.current = completedWordDurationsRef.current.slice(
        0,
        nextCompletedWordCount
      );
      setCurrentWordStart(Date.now());
    }

    setInput(value);
    updateLiveMetrics(value, activeStartTime);

    if (trainingMode === "time" && text.length - value.length < 80) {
      appendTextChunk();
    }

    if (trainingMode !== "time" && value.length === text.length) {
      if (!finishTimeout.current) {
        finishTimeout.current = setTimeout(() => {
          finalizeTest(value, { compensateCompletionDelay: true });
        }, 1000);
      }
    } else if (finishTimeout.current) {
      clearTimeout(finishTimeout.current);
      finishTimeout.current = null;
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Tab") {
      event.preventDefault();
      loadText();
    }

    if (event.key === "Escape") {
      setIsSettingsMenuOpen(false);
      setOpenSettingsField("");
      setIsHelpMenuOpen(false);
    }

    if (event.key === "Enter") {
      event.preventDefault();

      if (!input.length) {
        return;
      }

      if (finishTimeout.current) {
        clearTimeout(finishTimeout.current);
        finishTimeout.current = null;
      }

      finalizeTest(input);
    }
  };

  const handleContainerClick = (event) => {
    if (
      event.target.closest(".auth-anchor")
      || event.target.closest(".trainer-settings")
      || event.target.closest(".trainer-help")
    ) {
      return;
    }

    inputRef.current?.focus();
  };

  const renderText = () => {
    let globalIndex = 0;

    return wordsRef.current.map((word, wordIndex) => {
      const renderedChars = word.split("").map((char, charIndex) => {
        const absoluteIndex = globalIndex + charIndex;
        let className = "char";
        const typedChar = input[absoluteIndex];
        const wrongChar = typedChar && typedChar !== char ? typedChar : "";

        if (absoluteIndex < input.length) {
          className = input[absoluteIndex] === char ? "correct" : "incorrect";
        } else if (absoluteIndex === input.length) {
          className = "current";
        }

        return (
          <span key={`${wordIndex}-${charIndex}`} className="char-slot">
            {wrongChar && <span className="word-typo-char">{wrongChar}</span>}
            <span className={className}>{char}</span>
          </span>
        );
      });

      globalIndex += word.length;

      let space = null;
      if (wordIndex < wordsRef.current.length - 1) {
        let className = "char";

        if (globalIndex < input.length) {
          className = input[globalIndex] === " " ? "correct" : "incorrect";
        } else if (globalIndex === input.length) {
          className = "current";
        }

        space = (
          <span
            key={`space-${wordIndex}`}
            className={className === "current" ? "current-space-slot" : className}
          >
            {" "}
          </span>
        );

        globalIndex += 1;
      }

      return (
        <span
          key={`word-${wordIndex}`}
          className="word-block"
          ref={(element) => {
            trainerWordRefs.current[wordIndex] = element;
          }}
        >
          <span className="word-main">{renderedChars}</span>
          {space}
        </span>
      );
    });
  };

  const handleRestartCurrentText = () => {
    if (!text) {
      loadText();
      return;
    }

    applyTrainingText(text);
  };

  const formatTimerValue = (seconds) => {
    const safeSeconds = Math.max(0, seconds);
    const minutes = Math.floor(safeSeconds / 60);
    const secs = Math.floor(safeSeconds % 60);

    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const renderSettingsSelectRow = ({
    field,
    label,
    valueLabel,
    options,
    selectedValue,
    onSelect,
  }) => (
    <div className="settings-row">
      <span className="settings-label">{label}</span>
      <div className="settings-field">
        <button
          className="settings-select-button"
          type="button"
          onClick={() => {
            setOpenSettingsField((prev) => (prev === field ? "" : field));
          }}
        >
          <span>{valueLabel}</span>
          <span className={`settings-select-caret ${openSettingsField === field ? "open" : ""}`}>⌄</span>
        </button>

        <div className={`settings-options ${openSettingsField === field ? "open" : ""}`}>
          {options.map((option) => (
            <button
              key={String(option.value)}
              className={`settings-option ${selectedValue === option.value ? "active" : ""}`}
              type="button"
              onClick={() => {
                onSelect(option.value);
                setOpenSettingsField("");
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const shouldShowTimer = !finished && (Boolean(startTime) || trainingMode === "time");
  const timerValue = trainingMode === "time"
    ? startTime
      ? Math.max(timeLimitSeconds - elapsedSeconds, 0)
      : timeLimitSeconds
    : elapsedSeconds;

  if (finished) {
    return (
      <ResultScreen
        words={wordStats}
        totalTime={totalTime}
        wpm={wpm}
        accuracy={accuracy}
        replayMaxLines={6}
        primaryActionLabel="Вернуться"
        onPrimaryAction={handleRestartCurrentText}
      />
    );
  }

  return (
    <div className="container" onClick={handleContainerClick}>
      <div className="trainer-toolbar">
        <div className="trainer-settings" ref={settingsMenuRef}>
          <button
            className={`settings-trigger ${isSettingsMenuOpen ? "open" : ""}`}
            type="button"
            onClick={() => {
              setIsSettingsMenuOpen((prev) => !prev);
              setOpenSettingsField("");
              setIsHelpMenuOpen(false);
            }}
            aria-label="Открыть настройки текста"
            aria-expanded={isSettingsMenuOpen}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.03 7.03 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.49.42l-.36 2.54c-.58.23-1.12.54-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.7 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94L2.82 14.52a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96c.5.4 1.05.72 1.63.94l.36 2.54a.5.5 0 0 0 .49.42h3.84a.5.5 0 0 0 .5-.42l.36-2.54c.58-.23 1.12-.54 1.63-.94l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z"
                fill="currentColor"
              />
            </svg>
          </button>

          <div className={`settings-popover ${isSettingsMenuOpen ? "open" : ""}`}>
            <div className="settings-type-tabs" role="tablist" aria-label="Тип текста">
              {availableTextTypes.map((type) => (
                <button
                  key={type.value}
                  className={`settings-type-tab ${selectedTextType === type.value ? "active" : ""}`}
                  type="button"
                  role="tab"
                  aria-selected={selectedTextType === type.value}
                  onClick={() => {
                    setSelectedTextType(type.value);
                    setTextSize(getTextSizeConfig(type.value).defaultValue);
                  }}
                >
                  {type.label}
                </button>
              ))}
            </div>

            {selectedTextType !== "user" ? renderSettingsSelectRow({
              field: "language",
              label: "Язык",
              valueLabel: `${languages.find((language) => language.code === selectedLanguage)?.flag_emoji || "🌐"} ${languages.find((language) => language.code === selectedLanguage)?.native_name || selectedLanguage}`,
              options: languages.map((language) => ({
                value: language.code,
                label: `${language.flag_emoji} ${language.native_name}`,
              })),
              selectedValue: selectedLanguage,
              onSelect: (value) => {
                setSelectedLanguage(value);
              },
            }) : null}

            {selectedTextType === "user" ? renderSettingsSelectRow({
              field: "userText",
              label: "Текст",
              valueLabel: userTexts.find((item) => item.id === selectedUserTextId)?.title || "Выберите текст",
              options: userTexts.map((item) => ({
                value: item.id,
                label: item.title,
              })),
              selectedValue: selectedUserTextId,
              onSelect: (value) => {
                setSelectedUserTextId(value);
              },
            }) : null}

            {selectedTextType === "user" && !userTexts.length ? (
              <div className="settings-row settings-row-note">
                <span className="settings-label">Свой текст</span>
                <div className="settings-note">
                  Добавьте тексты в профиле, чтобы тренироваться на своих заготовках.
                </div>
              </div>
            ) : null}

            {selectedTextType === "custom" ? (
              <>
                <div className="settings-row">
                  <span className="settings-label">Пунктуация</span>
                  <button
                    className={`settings-checkbox settings-checkbox-standalone ${includePunctuation ? "checked" : ""}`}
                    type="button"
                    role="checkbox"
                    aria-checked={includePunctuation}
                    aria-label="Пунктуация"
                    onClick={() => setIncludePunctuation((prev) => !prev)}
                  >
                    <span className="settings-checkbox-mark" aria-hidden="true" />
                  </button>
                </div>

                <div className="settings-row">
                  <span className="settings-label">Заглавные</span>
                  <button
                    className={`settings-checkbox settings-checkbox-standalone ${includeCapitals ? "checked" : ""}`}
                    type="button"
                    role="checkbox"
                    aria-checked={includeCapitals}
                    aria-label="Заглавные"
                    onClick={() => setIncludeCapitals((prev) => !prev)}
                  >
                    <span className="settings-checkbox-mark" aria-hidden="true" />
                  </button>
                </div>
              </>
            ) : null}

            {renderSettingsSelectRow({
              field: "mode",
              label: "Режим",
              valueLabel: getOptionLabel(TRAINING_MODES, trainingMode),
              options: TRAINING_MODES,
              selectedValue: trainingMode,
              onSelect: (value) => {
                setTrainingMode(value);
              },
            })}

            {trainingMode === "time" && renderSettingsSelectRow({
              field: "timeLimit",
              label: "Время",
              valueLabel: getOptionLabel(TIME_LIMITS, timeLimitSeconds),
              options: TIME_LIMITS,
              selectedValue: timeLimitSeconds,
              onSelect: (value) => {
                setTimeLimitSeconds(value);
              },
            })}

            {trainingMode === "standard" && selectedTextType !== "user" ? (
              <div className="settings-row settings-row-slider">
                <span className="settings-label">Размер</span>
                <div className="settings-slider-field">
                  <input
                    className="settings-slider"
                    type="range"
                    min={getTextSizeConfig(selectedTextType).min}
                    max={getTextSizeConfig(selectedTextType).max}
                    step={getTextSizeConfig(selectedTextType).step}
                    value={textSize}
                    onChange={(event) => {
                      setTextSize(Number(event.target.value));
                    }}
                  />
                  <span className="settings-slider-value">
                    {getTextSizeLabel(selectedTextType, requestedTextSize)}
                  </span>
                </div>
              </div>
            ) : selectedTextType !== "user" ? (
              <div className="settings-row settings-row-note">
                <span className="settings-label">Размер</span>
                <div className="settings-note">
                  Авто: {getAutoSizeLabel(selectedTextType, requestedTextSize)}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="trainer-help" ref={helpMenuRef}>
          <button
            className={`help-trigger ${isHelpMenuOpen ? "open" : ""}`}
            type="button"
            onClick={() => {
              setIsHelpMenuOpen((prev) => !prev);
              setIsSettingsMenuOpen(false);
              setOpenSettingsField("");
            }}
            aria-label="Открыть подсказки"
            aria-expanded={isHelpMenuOpen}
          >
            ?
          </button>

          <div className={`help-popover ${isHelpMenuOpen ? "open" : ""}`}>
            {helpSections.map((section) => (
              <div key={section.title} className="help-row">
                <span className="help-label">{section.title}</span>
                <div className="help-values">
                  {section.items.map((item) => (
                    <span key={item} className="help-item">{item}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="reload-btn-shell">
          <button
            className={`reload-btn ${input.length > 0 ? "visible" : "hidden"}`}
            onClick={handleRestartCurrentText}
            type="button"
            aria-label="Сбросить и начать этот текст заново"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M20 11a8 8 0 1 1-2.34-5.66"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M20 4v5h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="timer-row" aria-hidden={!shouldShowTimer}>
        <div className={`timer-chip ${shouldShowTimer ? "visible" : ""}`}>
          {formatTimerValue(timerValue)}
        </div>
      </div>

      <div className="text text-scroll text-scroll-trainer" ref={trainerTextRef}>
        {isTextLoading
          ? ""
          : textError
            ? textError
            : renderText()}
      </div>

      <textarea
        ref={inputRef}
        value={input}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className="hidden-input"
      />
    </div>
  );
}

export default TrainerPage;
