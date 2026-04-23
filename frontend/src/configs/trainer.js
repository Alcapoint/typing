export const TEXT_TYPES = [
  { value: "quote", label: "Цитата" },
  { value: "custom", label: "Кастомный" },
  { value: "nonsense", label: "Несуществующие слова" },
  { value: "words", label: "Случайные слова" },
  { value: "user", label: "Свой текст" },
];

export const TRAINING_MODES = [
  { value: "standard", label: "Обычный" },
  { value: "time", label: "На время" },
  { value: "mistake", label: "До ошибки" },
];

export const TIME_LIMITS = [
  { value: 15, label: "15 сек" },
  { value: 30, label: "30 сек" },
  { value: 60, label: "60 сек" },
  { value: 120, label: "120 сек" },
];

export const WORDS_PER_15_SECONDS = 25;
export const DEFAULT_TEXT_SIZE = 40;
export const MIN_WORD_DURATION_SECONDS = 0.5;

export const TEXT_SIZE_CONFIG = {
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

export const MISTAKE_MODE_SIZES = {
  quote: 160,
  default: 160,
};

export const APPEND_TEXT_SIZES = {
  quote: WORDS_PER_15_SECONDS,
  default: 80,
};

export const DEFAULT_LANGUAGES = [
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

export const DEFAULT_HELP_SECTIONS = [
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
