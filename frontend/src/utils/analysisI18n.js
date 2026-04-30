const EXACT_TRANSLATIONS = {
  "Высокая устойчивость и контроль": "High stability and control",
  "Высокая точность и устойчивый темп": "High accuracy and steady pace",
  "Стабильный результат с хорошим контролем": "Stable result with good control",
  "Рабочий уровень с локальными отклонениями": "Solid working level with local deviations",
  "Базовый уровень сформирован, но метрики неоднородны": "A basic level is formed, but the metrics are uneven",
  "Результат нестабилен по точности и ритму": "The result is unstable in accuracy and rhythm",
  "Техника набора": "Typing technique",
  "Темп и ритм": "Pace and rhythm",
  "Устойчивость": "Stability",
  "Точность": "Accuracy",
  "Чистые серии": "Clean streaks",
  "Скорость": "Speed",
  "Контроль на темпе": "Speed control",
  "Ровность ритма": "Rhythm consistency",
  "Выносливость": "Endurance",
  "Восстановление после ошибки": "Recovery after errors",
  "Длинные и сложные слова": "Long and difficult words",
  "Завершённость": "Completion",
  "Объединяет символьную точность, чистые серии, поведение на сложных словах и качество исправлений.": "Combines character accuracy, clean streaks, behavior on difficult words, and the quality of corrections.",
  "Объединяет итоговую скорость, ровность ритма, контроль ускорения и полноту прохождения текста.": "Combines final speed, rhythm consistency, acceleration control, and text completion.",
  "Показывает, как хорошо результат держится по дистанции и насколько быстро возвращается контроль после сбоев.": "Shows how well the result holds over the distance and how quickly control returns after disruptions.",
  "Доля корректно набранных символов по всей тренировке.": "Share of correctly typed characters across the whole training.",
  "Доля безошибочных слов и длина стабильных серий.": "Share of error-free words and the length of stable streaks.",
  "Фактический темп относительно целевого уровня для выбранного режима.": "Actual pace relative to the target level for the selected mode.",
  "Сохранение точности на повышенном темпе.": "Maintaining accuracy at elevated pace.",
  "Равномерность темпа между соседними словами.": "Evenness of pace between neighboring words.",
  "Сохранение темпа и точности от старта к финишу.": "Maintaining pace and accuracy from start to finish.",
  "Скорость возврата к точному набору после ошибки.": "How quickly accurate typing returns after an error.",
  "Качество набора на длинных и сложных словах.": "Typing quality on long and difficult words.",
  "Доля фактически пройденного объёма тренировки.": "Share of the target training volume that was actually completed.",
  "Выраженных отклонений при ускорении не зафиксировано.": "No pronounced deviations during acceleration were detected.",
  "Недостаточно эпизодов для устойчивой оценки показателя.": "There are not enough episodes for a stable evaluation of this indicator.",
};

const METRIC_REPLACEMENTS = [
  ["техника набора", "typing technique"],
  ["темп и ритм", "pace and rhythm"],
  ["устойчивость", "stability"],
  ["точность", "accuracy"],
  ["чистые серии", "clean streaks"],
  ["скорость", "speed"],
  ["контроль на темпе", "speed control"],
  ["ритм", "rhythm"],
  ["ровность ритма", "rhythm consistency"],
  ["выносливость", "endurance"],
  ["восстановление после ошибки", "recovery after errors"],
  ["сложные слова", "difficult words"],
  ["длинные и сложные слова", "long and difficult words"],
  ["завершённость", "completion"],
];

const applyMetricReplacements = (text) => (
  METRIC_REPLACEMENTS.reduce((currentText, [source, target]) => (
    currentText.replaceAll(source, target)
  ), text)
);

export function translateAnalysisText(text, locale) {
  if (!text || locale !== "en") {
    return text;
  }

  if (EXACT_TRANSLATIONS[text]) {
    return EXACT_TRANSLATIONS[text];
  }

  let nextText = applyMetricReplacements(text);

  const replacements = [
    [/^Стабильный результат, приоритет — (.+)$/u, "Stable result, priority is $1"],
    [/^Рабочий результат, ограничение — (.+)$/u, "Solid working result, limited by $1"],
    [/^Основное ограничение — (.+)$/u, "Main limitation is $1"],
    [/^Рабочий диапазон сохраняется по метрикам: (.+)\.$/u, "The working range is maintained in: $1."],
    [/^Ключевые метрики требуют дополнительной стабилизации\.$/u, "Key metrics need additional stabilization."],
    [/^Целевой объём тренировки пройден не полностью\.$/u, "The target training volume was not completed."],
    [/^Приоритет дальнейшей работы — (.+); во второй половине тренировки снижается устойчивость\.$/u, "The next priority is $1; stability drops in the second half of the training."],
    [/^Приоритет дальнейшей работы — (.+)\.$/u, "The next priority is $1."],
    [/^Чисто пройдено ([\d.,]+)% слов\.$/u, "Completed $1% of words cleanly."],
    [/^На сложных словах удержано ([\d.,]+)% точности\.$/u, "Accuracy stayed at $1% on difficult words."],
    [/^Внутри слова исправлено ([\d.,]+)% допущенных сбоев\.$/u, "$1% of in-word disruptions were corrected."],
    [/^Итоговый темп — ([\d.,]+) WPM, медианный темп по словам — ([\d.,]+) WPM\.$/u, "Final pace is $1 WPM, median word pace is $2 WPM."],
    [/^Средний скачок между соседними словами — ([\d.,]+) WPM\.$/u, "Average jump between neighboring words is $1 WPM."],
    [/^На быстрых словах удержано ([\d.,]+)% точности\.$/u, "Accuracy stayed at $1% on fast words."],
    [/^Максимальная чистая серия — ([\d.,]+) слов\.$/u, "Longest clean streak is $1 words."],
    [/^Восстановление после сбоя — ([\d.,]+)%, стабильное следующее слово — ([\d.,]+)%\.$/u, "Recovery after disruptions is $1%, stable next word is $2%."],
    [/^К финишу темп изменился на ([\d.,]+)%\.$/u, "By the finish, pace changed by $1%."],
    [/^Корректно набрано ([\d.,]+)% символов\.$/u, "$1% of characters were typed correctly."],
    [/^Наибольшее влияние на точность оказали (.+)\.$/u, "The strongest impact on accuracy came from $1."],
    [/^Наиболее частый паттерн ошибки — (.+)\.$/u, "The most frequent error pattern is $1."],
    [/^Без сбоев пройдено ([\d.,]+)% слов\.$/u, "$1% of words were completed without disruptions."],
    [/^Максимальная безошибочная серия — ([\d.,]+) слов\.$/u, "The longest error-free streak is $1 words."],
    [/^Наибольшее число сбоев связано со словами (.+)\.$/u, "The largest number of disruptions is linked to $1."],
    [/^Наиболее высокий устойчивый темп зафиксирован на (.+)\.$/u, "The highest stable pace was recorded on $1."],
    [/^Минимальный темп зафиксирован на слове (.+) \(([\d.,]+) WPM\)\.$/u, "The lowest pace was recorded on the word $1 ($2 WPM)."],
    [/^На быстрых словах точность составила ([\d.,]+)%\.$/u, "Accuracy on fast words reached $1%."],
    [/^Доля ускорений с ошибками — ([\d.,]+)%\.$/u, "The share of accelerated words with mistakes is $1%."],
    [/^Наибольшее отклонение при ускорении зафиксировано на (.+)\.$/u, "The biggest acceleration deviation was recorded on $1."],
    [/^Среднее изменение темпа между соседними словами — ([\d.,]+) WPM\.$/u, "Average pace change between neighboring words is $1 WPM."],
    [/^Коэффициент вариативности темпа — ([\d.,]+)\.$/u, "The pace variation coefficient is $1."],
    [/^Наиболее нестабильный участок связан со словом (.+)\.$/u, "The most unstable section is linked to the word $1."],
    [/^Снижение темпа к финишу — ([\d.,]+)%\.$/u, "Pace drop by the finish is $1%."],
    [/^Старт: ([\d.,]+) WPM и ([\d.,]+)% точности\. Финиш: ([\d.,]+) WPM и ([\d.,]+)%\.$/u, "Start: $1 WPM and $2% accuracy. Finish: $3 WPM and $4%."],
    [/^Наиболее сложное слово финального сегмента — (.+)\.$/u, "The most difficult word in the final segment is $1."],
    [/^После сбоя восстановление зафиксировано в ([\d.,]+)% случаев\.$/u, "Recovery after disruptions was recorded in $1% of cases."],
    [/^Внутри слова исправлено ([\d.,]+)% сбоев\.$/u, "$1% of disruptions were corrected inside the word."],
    [/^Среднее снижение скорости после сбоя — ([\d.,]+) WPM\.$/u, "Average speed drop after a disruption is $1 WPM."],
    [/^На длинных и сложных словах точность составила ([\d.,]+)%\.$/u, "Accuracy on long and difficult words reached $1%."],
    [/^Без ошибок пройдено ([\d.,]+)% таких слов\.$/u, "$1% of those words were completed without errors."],
    [/^Наибольшее влияние оказали (.+)\.$/u, "The strongest impact came from $1."],
    [/^Пройдено ([\d.,]+)% от целевого объёма\.$/u, "$1% of the target volume was completed."],
    [/^Это ([\d.,]+) из ([\d.,]+) слов\.$/u, "That is $1 out of $2 words."],
    [/^Это ([\d.,]+) слов и ([\d.,]+) символов набора\.$/u, "That is $1 words and $2 typed characters."],
    [/^Для режима на время критичен быстрый старт\.$/u, "A fast start is critical in Time mode."],
  ];

  replacements.forEach(([pattern, replacement]) => {
    nextText = nextText.replace(pattern, replacement);
  });

  return nextText;
}

export function localizeAnalysis(analysis, locale) {
  if (!analysis || locale !== "en") {
    return analysis;
  }

  const metrics = analysis.metrics || {};

  return {
    ...analysis,
    headline: translateAnalysisText(analysis.headline, locale),
    metrics: {
      ...metrics,
      band_label: translateAnalysisText(metrics.band_label, locale),
      coach_note: translateAnalysisText(metrics.coach_note, locale),
      summary_cards: Array.isArray(metrics.summary_cards)
        ? metrics.summary_cards.map((card) => ({
          ...card,
          label: translateAnalysisText(card.label, locale),
          headline: translateAnalysisText(card.headline, locale),
          reasons: Array.isArray(card.reasons)
            ? card.reasons.map((reason) => translateAnalysisText(reason, locale))
            : card.reasons,
        }))
        : metrics.summary_cards,
      scorecards: Array.isArray(metrics.scorecards)
        ? metrics.scorecards.map((card) => ({
          ...card,
          label: translateAnalysisText(card.label, locale),
          headline: translateAnalysisText(card.headline, locale),
          reasons: Array.isArray(card.reasons)
            ? card.reasons.map((reason) => translateAnalysisText(reason, locale))
            : card.reasons,
        }))
        : metrics.scorecards,
    },
  };
}
