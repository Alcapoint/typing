import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import api from "../../api";
import ResultScreen from "../../components/result/ResultScreen";
import { useI18n } from "../../i18n";
import {
  DEFAULT_LANGUAGES,
  TEXT_SIZE_CONFIG,
  TEXT_TYPES,
  TIME_LIMITS,
  TRAINING_MODES,
} from "../../configs/trainer";
import TrainerSettingsSelectRow from "./components/TrainerSettingsSelectRow";
import TrainerTextPanel from "./components/TrainerTextPanel";
import {
  decorateWordsWithProgressMetrics,
  getAdjustedTotalTime,
  getAppendSize,
  getAutoSizeLabel,
  getCompletedWordCount,
  getLiveProgressMetrics,
  getOptionLabel,
  getRequestedTextSize,
  getSourceWordRanges,
  getTextSizeConfig,
  getTextSizeLabel,
  getTypedErrorCount,
  getWordErrorCount,
  getWordBurstMetrics,
} from "./trainerHelpers";

const isTextEntryElement = (element) => {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    element.closest(
      'input, textarea, select, [contenteditable="true"], [contenteditable="plaintext-only"]'
    )
  );
};

function TrainerPage({ currentUser, isLoggedIn, isMobileViewport = false, replayTraining }) {
  const { locale, t } = useI18n();
  const [selectedTextType, setSelectedTextType] = useState("quote");
  const [userTexts, setUserTexts] = useState([]);
  const [selectedUserTextId, setSelectedUserTextId] = useState(null);
  const [trainingMode, setTrainingMode] = useState("standard");
  const [timeLimitSeconds, setTimeLimitSeconds] = useState(30);
  const [textSize, setTextSize] = useState(TEXT_SIZE_CONFIG.quote.defaultValue);
  const [includePunctuation, setIncludePunctuation] = useState(true);
  const [includeCapitals, setIncludeCapitals] = useState(true);
  const [languages, setLanguages] = useState(DEFAULT_LANGUAGES);
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
  const [accuracy, setAccuracy] = useState(100);
  const [finished, setFinished] = useState(false);
  const [wordStats, setWordStats] = useState([]);
  const [resultAnalysis, setResultAnalysis] = useState(null);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [currentWordStart, setCurrentWordStart] = useState(null);
  const [trainingSessionToken, setTrainingSessionToken] = useState(null);

  const inputRef = useRef(null);
  const finishTimeout = useRef(null);
  const settingsMenuRef = useRef(null);
  const helpMenuRef = useRef(null);
  const wordsRef = useRef([]);
  const trainerTextRef = useRef(null);
  const trainerWordRefs = useRef([]);
  const textRequestIdRef = useRef(0);
  const trainingRunIdRef = useRef(0);
  const completedWordDurationsRef = useRef([]);
  const skipAutoLoadRef = useRef(Boolean(replayTraining?.training_text));
  const lastAutoScrollTopRef = useRef(0);
  const appendInFlightRef = useRef(false);
  const sessionStartedRef = useRef(false);
  const sessionStartPromiseRef = useRef(null);
  const mistakeWordIndexesRef = useRef(new Set());

  const requestedTextSize = getRequestedTextSize(
    selectedTextType,
    trainingMode,
    textSize,
    timeLimitSeconds
  );
  const isTrainerLocked = isMobileViewport;
  const availableTextTypes = isLoggedIn
    ? TEXT_TYPES
    : TEXT_TYPES.filter((type) => type.value !== "user");
  const localizedTextTypes = availableTextTypes.map((type) => ({
    ...type,
    label: t(`trainer.textTypes.${type.value}`),
  }));
  const localizedTrainingModes = TRAINING_MODES.map((mode) => ({
    ...mode,
    label: t(`trainer.trainingModes.${mode.value}`),
  }));
  const localizedTimeLimits = TIME_LIMITS.map((limit) => ({
    ...limit,
    label: t(`trainer.timeLimits.${limit.value}`),
  }));
  const selectedLanguageOption = languages.find((language) => language.code === selectedLanguage) || null;
  const selectedUserText = userTexts.find((item) => item.id === selectedUserTextId) || null;
  const helpSections = [
    {
      title: t("trainer.helpSections.hotkeys"),
      items: [
        t("trainer.helpItems.tab"),
        t("trainer.helpItems.enter"),
        t("trainer.helpItems.esc"),
      ],
    },
    {
      title: t("trainer.helpSections.metrics"),
      items: [
        t("trainer.helpItems.wpm"),
        t("trainer.helpItems.cpm"),
        t("trainer.helpItems.accuracy"),
        t("trainer.helpItems.time"),
      ],
    },
    {
      title: t("trainer.helpSections.tips"),
      items: [
        t("trainer.helpItems.gear"),
        t("trainer.helpItems.timeMode"),
        t("trainer.helpItems.focus"),
      ],
    },
  ];

  const applyTrainingText = (content, { sessionToken = null } = {}) => {
    const nextContent = (content || "").replace(/\s+/g, " ").trim();
    trainingRunIdRef.current += 1;

    setText(nextContent);
    setTextError("");
    setElapsedSeconds(0);
    setTotalTime(0);
    setInput("");
    setStartTime(null);
    setFinished(false);
    setWpm(0);
    setAccuracy(100);
    setWordStats([]);
    setResultAnalysis(null);
    setIsAnalysisLoading(false);
    setCurrentWordStart(null);
    setTrainingSessionToken(sessionToken);
    wordsRef.current = nextContent ? nextContent.split(" ") : [];
    completedWordDurationsRef.current = [];
    lastAutoScrollTopRef.current = 0;
    appendInFlightRef.current = false;
    sessionStartedRef.current = false;
    sessionStartPromiseRef.current = null;
    mistakeWordIndexesRef.current = new Set();

    if (finishTimeout.current) {
      clearTimeout(finishTimeout.current);
      finishTimeout.current = null;
    }

    if (trainerTextRef.current) {
      trainerTextRef.current.scrollTo({ top: 0, behavior: "auto" });
    }
  };

  const buildTextRequestConfig = useCallback((overrides = {}) => {
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
      sessionToken: overrides.sessionToken,
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
  }, [
    includeCapitals,
    includePunctuation,
    selectedLanguage,
    selectedTextType,
    selectedUserTextId,
    textSize,
    timeLimitSeconds,
    trainingMode,
  ]);

  const loadText = useCallback((overrides = {}) => {
    if ((overrides.textType ?? selectedTextType) === "user" && !(overrides.userTextId ?? selectedUserTextId)) {
      setText("");
      setInput("");
      setTextError(t("trainer.addOwnTextFirst"));
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
        applyTrainingText(data.content, {
          sessionToken: data.session_token || null,
        });
      })
      .catch(() => {
        if (requestId !== textRequestIdRef.current) {
          return;
        }
        setText("");
        wordsRef.current = [];
        setInput("");
        setTextError(t("trainer.loadTextError"));
      })
      .finally(() => {
        if (requestId === textRequestIdRef.current) {
          setIsTextLoading(false);
        }
      });
  }, [buildTextRequestConfig, selectedTextType, selectedUserTextId, t]);

  const appendTextChunk = useCallback(() => {
    if (appendInFlightRef.current || trainingMode !== "time") {
      return;
    }

    appendInFlightRef.current = true;
    const activeRequestId = textRequestIdRef.current;

    api
      .getTrainingText(buildTextRequestConfig({
        size: getAppendSize(selectedTextType),
        sessionToken: trainingSessionToken,
      }))
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
  }, [buildTextRequestConfig, selectedTextType, trainingMode, trainingSessionToken]);

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
    includeCapitals,
    includePunctuation,
    isLoggedIn,
    loadText,
    requestedTextSize,
    selectedLanguage,
    selectedTextType,
    selectedUserTextId,
    timeLimitSeconds,
    trainingMode,
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

    document.addEventListener("pointerdown", handleOutsideClick);
    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    if (text && !isTrainerLocked) {
      inputRef.current?.focus();
    }
  }, [isTrainerLocked, text]);

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

      if (currentUser) {
        api
          .createReplayTrainingSession({
            training_text: replayTraining.training_text,
            language_code: replayTraining.language?.code,
            user_text_id: replayTraining.user_text?.id || null,
            is_personal_text: replayTraining.is_personal_text,
            mode: trainingMode,
          })
          .then((data) => {
            applyTrainingText(data?.content || replayTraining.training_text, {
              sessionToken: data?.session_token || null,
            });
          })
          .catch(() => {
            applyTrainingText(replayTraining.training_text);
          });
        return;
      }

      applyTrainingText(replayTraining.training_text);
    }
  }, [currentUser, replayTraining, trainingMode]);

  const getCurrentWordIndex = useCallback(() => {
    if (!wordsRef.current.length) {
      return 0;
    }

    return Math.min(
      input.split(" ").length - 1,
      wordsRef.current.length - 1
    );
  }, [input]);

  const getWordIndexByCharPosition = useCallback((charIndex) => {
    if (charIndex < 0 || !wordsRef.current.length) {
      return 0;
    }

    let cursor = 0;

    for (let wordIndex = 0; wordIndex < wordsRef.current.length; wordIndex += 1) {
      const word = wordsRef.current[wordIndex];
      const wordEnd = cursor + word.length;

      if (charIndex <= wordEnd) {
        return wordIndex;
      }

      cursor = wordEnd + 1;
    }

    return wordsRef.current.length - 1;
  }, []);

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
  }, [getCurrentWordIndex, input, text]);

  const persistResult = useCallback((finalWords, totalTimeValue, finalSpeed, finalAccuracy) => {
    if (!isLoggedIn || !trainingSessionToken) {
      setResultAnalysis(null);
      setIsAnalysisLoading(false);
      return;
    }

    const activeRequestId = trainingRunIdRef.current;
    setResultAnalysis(null);
    setIsAnalysisLoading(true);

    const startPromise = sessionStartPromiseRef.current || Promise.resolve();
    startPromise
      .then(() => {
        if (!sessionStartedRef.current) {
          if (activeRequestId === trainingRunIdRef.current) {
            setIsAnalysisLoading(false);
          }
          return null;
        }

        return api.saveTrainingResult({
          speed: finalSpeed,
          accuracy: finalAccuracy,
          total_time: totalTimeValue,
          training_text: text,
          session_token: trainingSessionToken,
          language_code: selectedLanguage,
          user_text_id: selectedTextType === "user" ? selectedUserTextId : null,
          is_personal_text: selectedTextType === "user",
          words: finalWords,
        });
      })
      .then((savedResult) => {
        if (activeRequestId !== trainingRunIdRef.current || !savedResult) {
          return;
        }
        setResultAnalysis(savedResult.analysis || null);
      })
      .catch(() => null)
      .finally(() => {
        if (activeRequestId === trainingRunIdRef.current) {
          setIsAnalysisLoading(false);
        }
      });
  }, [isLoggedIn, selectedLanguage, selectedTextType, selectedUserTextId, text, trainingSessionToken]);

  const finalizeTest = useCallback((value, options = {}) => {
    if (finished) {
      return;
    }

    const now = Date.now();
    const sessionStartTime = options.startedAt ?? startTime;
    const activeWordStart = options.currentWordStartedAt ?? currentWordStart;
    const sourceWordRanges = getSourceWordRanges(wordsRef.current);
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
      const { burst: wordBurst, cpm: wordCpm } = getWordBurstMetrics(
        correct,
        typedWord,
        duration
      );

      return {
        correct,
        typed: typedWord,
        duration,
        burst: wordBurst,
        cpm: wordCpm,
        errors: getWordErrorCount(correct, typedWord),
        had_mistake: mistakeWordIndexesRef.current.has(index),
      };
    });
    const decoratedWords = decorateWordsWithProgressMetrics(finalWords);

    const rawTotalTime = sessionStartTime ? (now - sessionStartTime) / 1000 : 0;
    const totalTimeValue = trainingMode === "time"
      ? Math.min(rawTotalTime, timeLimitSeconds)
      : getAdjustedTotalTime(rawTotalTime, options.compensateCompletionDelay);
    const typedErrors = getTypedErrorCount(value, text);
    const completedCorrectChars = finalWords.reduce((total, word, index) => {
      const separator = index < finalWords.length - 1 ? 1 : 0;
      return total + (word.typed === word.correct ? word.correct.length + separator : 0);
    }, 0);
    const finalSpeed = totalTimeValue
      ? Math.round((completedCorrectChars / 5) / (totalTimeValue / 60))
      : 0;
    const finalAccuracy = value.length
      ? Number((((value.length - typedErrors) / value.length) * 100).toFixed(1))
      : 100;

    setWpm(finalSpeed);
    setAccuracy(finalAccuracy);
    setElapsedSeconds(rawTotalTime);
    setTotalTime(totalTimeValue);
    setWordStats(decoratedWords);
    setFinished(true);
    persistResult(decoratedWords, totalTimeValue, finalSpeed, finalAccuracy);
  }, [
    currentWordStart,
    finished,
    persistResult,
    startTime,
    text,
    timeLimitSeconds,
    trainingMode,
  ]);

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
  }, [elapsedSeconds, finalizeTest, finished, input, startTime, timeLimitSeconds, trainingMode]);

  const updateLiveMetrics = useCallback((value, currentStartTime) => {
    const typedErrors = getTypedErrorCount(value, text);
    const nextAccuracy = value.length
      ? Number((((value.length - typedErrors) / value.length) * 100).toFixed(1))
      : 100;

    setAccuracy(nextAccuracy);

    if (currentStartTime) {
      const elapsedSecondsValue = (Date.now() - currentStartTime) / 1000;
      const { wpm: nextWpm } = getLiveProgressMetrics(
        value,
        text,
        elapsedSecondsValue
      );

      setWpm(nextWpm);
    } else {
      setWpm(0);
    }
  }, [text]);

  const applyInputValue = useCallback((value) => {
    if (finished || isTrainerLocked) {
      return;
    }

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

      if (trainingSessionToken && !sessionStartPromiseRef.current) {
        sessionStartPromiseRef.current = api
          .startTrainingSession(trainingSessionToken)
          .then(() => {
            sessionStartedRef.current = true;
          })
          .catch(() => {
            setTrainingSessionToken(null);
          })
          .finally(() => {
            sessionStartPromiseRef.current = null;
          });
      } else if (!trainingSessionToken) {
        sessionStartedRef.current = false;
      }
    }

    if (value.length > input.length) {
      const appendedSlice = value.slice(input.length);
      const firstAppendedIndex = input.length;
      const lastChar = value[value.length - 1];
      const expectedChar = text[value.length - 1];

      for (let offset = 0; offset < appendedSlice.length; offset += 1) {
        const charIndex = firstAppendedIndex + offset;
        if (value[charIndex] !== text[charIndex]) {
          mistakeWordIndexesRef.current.add(getWordIndexByCharPosition(charIndex));
        }
      }

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
  }, [
    currentWordStart,
    finalizeTest,
    finished,
    getWordIndexByCharPosition,
    input,
    isTrainerLocked,
    appendTextChunk,
    startTime,
    text,
    trainingMode,
    trainingSessionToken,
    updateLiveMetrics,
  ]);

  const handleChange = (event) => {
    applyInputValue(event.target.value);
  };

  const handleKeyDown = (event) => {
    if (isTrainerLocked) {
      return;
    }

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
    if (isTrainerLocked) {
      return;
    }

    if (
      event.target.closest(".auth-anchor")
      || event.target.closest(".trainer-settings")
      || event.target.closest(".trainer-help")
    ) {
      return;
    }

    inputRef.current?.focus();
  };

  useEffect(() => {
    const handleGlobalTyping = (event) => {
      if (
        finished
        || isTrainerLocked
        || !text
        || event.defaultPrevented
        || event.ctrlKey
        || event.metaKey
        || event.altKey
      ) {
        return;
      }

      if (document.querySelector(".auth-popover")) {
        return;
      }

      if (isTextEntryElement(event.target)) {
        return;
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        inputRef.current?.focus();
        applyInputValue(input.slice(0, -1));
        return;
      }

      if (event.key.length !== 1) {
        return;
      }

      event.preventDefault();
      inputRef.current?.focus();
      applyInputValue(`${input}${event.key}`);
    };

    document.addEventListener("keydown", handleGlobalTyping, true);
    return () => {
      document.removeEventListener("keydown", handleGlobalTyping, true);
    };
  }, [applyInputValue, finished, input, isTrainerLocked, text]);

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

    if (isLoggedIn) {
      api
        .createReplayTrainingSession({
          training_text: text,
          language_code: selectedLanguage,
          user_text_id: selectedTextType === "user" ? selectedUserTextId : null,
          is_personal_text: selectedTextType === "user",
          mode: trainingMode,
        })
        .then((data) => {
          applyTrainingText(data?.content || text, {
            sessionToken: data?.session_token || null,
          });
        })
        .catch(() => {
          applyTrainingText(text);
        });
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
        analysis={resultAnalysis}
        analysisLoading={isAnalysisLoading}
        trainingMeta={{
          language: selectedLanguageOption,
          text_type: selectedTextType,
          mode: trainingMode,
          requested_size: requestedTextSize,
          is_personal_text: selectedTextType === "user",
          user_text_title: selectedUserText?.title || "",
          training_text: text,
        }}
        replayMaxLines={6}
        primaryActionLabel={t("trainer.back")}
        onPrimaryAction={handleRestartCurrentText}
      />
    );
  }

  const toggleSettingsField = (field) => {
    setOpenSettingsField((prev) => (prev === field ? "" : field));
  };

  const handleSettingsSelect = (onSelect) => (value) => {
    onSelect(value);
    setOpenSettingsField("");
  };

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
            aria-label={t("trainer.openSettingsAria")}
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
            <div className="settings-type-tabs" role="tablist" aria-label={t("trainer.textTypeAria")}>
              {localizedTextTypes.map((type) => (
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

            {selectedTextType !== "user" ? (
              <TrainerSettingsSelectRow
                field="language"
                label={t("trainer.language")}
                valueLabel={`${languages.find((language) => language.code === selectedLanguage)?.flag_emoji || "🌐"} ${languages.find((language) => language.code === selectedLanguage)?.native_name || selectedLanguage}`}
                options={languages.map((language) => ({
                  value: language.code,
                  label: `${language.flag_emoji} ${language.native_name}`,
                }))}
                selectedValue={selectedLanguage}
                openField={openSettingsField}
                onToggle={toggleSettingsField}
                onSelect={handleSettingsSelect(setSelectedLanguage)}
              />
            ) : null}

            {selectedTextType === "user" ? (
              <TrainerSettingsSelectRow
                field="userText"
                label={t("trainer.text")}
                valueLabel={userTexts.find((item) => item.id === selectedUserTextId)?.title || t("trainer.chooseText")}
                options={userTexts.map((item) => ({
                  value: item.id,
                  label: item.title,
                }))}
                selectedValue={selectedUserTextId}
                openField={openSettingsField}
                onToggle={toggleSettingsField}
                onSelect={handleSettingsSelect(setSelectedUserTextId)}
              />
            ) : null}

            {selectedTextType === "user" && !userTexts.length ? (
              <div className="settings-row settings-row-note">
                <span className="settings-label">{t("trainer.ownText")}</span>
                <div className="settings-note">
                  {t("trainer.ownTextNote")}
                </div>
              </div>
            ) : null}

            {selectedTextType === "custom" ? (
              <>
                <div className="settings-row">
                  <span className="settings-label">{t("trainer.punctuation")}</span>
                  <button
                    className={`settings-checkbox settings-checkbox-standalone ${includePunctuation ? "checked" : ""}`}
                    type="button"
                    role="checkbox"
                    aria-checked={includePunctuation}
                    aria-label={t("trainer.punctuation")}
                    onClick={() => setIncludePunctuation((prev) => !prev)}
                  >
                    <span className="settings-checkbox-mark" aria-hidden="true" />
                  </button>
                </div>

                <div className="settings-row">
                  <span className="settings-label">{t("trainer.capitals")}</span>
                  <button
                    className={`settings-checkbox settings-checkbox-standalone ${includeCapitals ? "checked" : ""}`}
                    type="button"
                    role="checkbox"
                    aria-checked={includeCapitals}
                    aria-label={t("trainer.capitals")}
                    onClick={() => setIncludeCapitals((prev) => !prev)}
                  >
                    <span className="settings-checkbox-mark" aria-hidden="true" />
                  </button>
                </div>
              </>
            ) : null}

            <TrainerSettingsSelectRow
              field="mode"
              label={t("trainer.mode")}
              valueLabel={getOptionLabel(localizedTrainingModes, trainingMode)}
              options={localizedTrainingModes}
              selectedValue={trainingMode}
              openField={openSettingsField}
              onToggle={toggleSettingsField}
              onSelect={handleSettingsSelect(setTrainingMode)}
            />

            {trainingMode === "time" ? (
              <TrainerSettingsSelectRow
                field="timeLimit"
                label={t("trainer.time")}
                valueLabel={getOptionLabel(localizedTimeLimits, timeLimitSeconds)}
                options={localizedTimeLimits}
                selectedValue={timeLimitSeconds}
                openField={openSettingsField}
                onToggle={toggleSettingsField}
                onSelect={handleSettingsSelect(setTimeLimitSeconds)}
              />
            ) : null}

            {trainingMode === "standard" && selectedTextType !== "user" ? (
              <div className="settings-row settings-row-slider">
                <span className="settings-label">{t("trainer.size")}</span>
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
                    {getTextSizeLabel(selectedTextType, requestedTextSize, locale)}
                  </span>
                </div>
              </div>
            ) : selectedTextType !== "user" ? (
              <div className="settings-row settings-row-note">
                <span className="settings-label">{t("trainer.size")}</span>
                <div className="settings-note">
                  {t("trainer.auto")}: {getAutoSizeLabel(selectedTextType, requestedTextSize, locale)}
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
            aria-label={t("trainer.openHelpAria")}
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
            aria-label={t("trainer.reloadAria")}
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

      <TrainerTextPanel
        isLocked={isTrainerLocked}
        isTextLoading={isTextLoading}
        textError={textError}
        trainerTextRef={trainerTextRef}
        renderText={renderText}
      />

      <textarea
        ref={inputRef}
        value={input}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className="hidden-input"
        disabled={isTrainerLocked}
      />
    </div>
  );
}

export default TrainerPage;
