import { useEffect, useMemo, useRef, useState } from "react";
import api from "../../api";
import LoadingHint from "../../components/feedback/LoadingHint";
import {
  TrainingSettingsSummary,
  TrainingTextButton,
} from "../../components/training/TrainingMeta";
import { useI18n } from "../../i18n";
import { formatDateTime } from "../../utils/date";
import {
  COMPARISON_LIMIT,
  getComparisonTrainingIds,
  removeComparisonTrainingIdAt,
  setComparisonTrainingIdAt,
} from "../../utils/comparison";

const emptySlots = Array.from({ length: COMPARISON_LIMIT });
const METRIC_COUNT_DURATION = 900;

const getArray = (value) => (Array.isArray(value) ? value : []);
const getNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const getTypedCharsWithSpaces = (words = []) => (
  getArray(words).reduce((total, word, index) => (
    total + String(word?.typed || "").length + (index < words.length - 1 ? 1 : 0)
  ), 0)
);

const getRawWpm = (item) => {
  const totalTime = Number(item?.total_time || 0);
  const chars = getTypedCharsWithSpaces(item?.words);
  return totalTime ? Math.round((chars / 5) / (totalTime / 60)) : 0;
};

const getAverage = (values) => {
  const numericValues = values.map(getNumber).filter((value) => value !== null);
  if (!numericValues.length) {
    return null;
  }
  return numericValues.reduce((total, value) => total + value, 0) / numericValues.length;
};

const getComparisonMetrics = (item, t) => {
  const words = getArray(item?.words);
  const analysis = item?.analysis || {};
  const metrics = analysis.metrics || {};
  const wordErrors = words.reduce((total, word) => total + Number(word?.errors || 0), 0);
  const cleanWords = words.filter((word) => !word?.had_mistake && Number(word?.errors || 0) === 0).length;

  return [
    {
      group: t("comparison.groups.main"),
      label: t("comparison.metrics.score"),
      value: getNumber(analysis.overall_score),
      suffix: "/100",
      higherBetter: true,
      description: t("comparison.descriptions.score"),
    },
    {
      group: t("comparison.groups.main"),
      label: t("comparison.metrics.wpm"),
      value: getNumber(item?.speed),
      suffix: "WPM",
      higherBetter: true,
      description: t("comparison.descriptions.wpm"),
    },
    {
      group: t("comparison.groups.main"),
      label: t("comparison.metrics.rwpm"),
      value: getRawWpm(item),
      suffix: "WPM",
      higherBetter: true,
      description: t("comparison.descriptions.rwpm"),
    },
    {
      group: t("comparison.groups.main"),
      label: t("comparison.metrics.accuracy"),
      value: getNumber(item?.accuracy),
      suffix: "%",
      higherBetter: true,
      digits: 1,
      description: t("comparison.descriptions.accuracy"),
    },
    {
      group: t("comparison.groups.main"),
      label: t("comparison.metrics.time"),
      value: getNumber(item?.total_time),
      suffix: "s",
      higherBetter: false,
      digits: 1,
      description: t("comparison.descriptions.time"),
    },
    {
      group: t("comparison.groups.text"),
      label: t("comparison.metrics.typedWords"),
      value: getNumber(metrics.typed_words_count) ?? words.length,
      suffix: "",
      higherBetter: true,
      description: t("comparison.descriptions.typedWords"),
    },
    {
      group: t("comparison.groups.text"),
      label: t("comparison.metrics.typedChars"),
      value: getNumber(metrics.typed_chars_count) ?? getTypedCharsWithSpaces(words),
      suffix: "",
      higherBetter: true,
      description: t("comparison.descriptions.typedChars"),
    },
    {
      group: t("comparison.groups.text"),
      label: t("comparison.metrics.cleanWords"),
      value: cleanWords,
      suffix: "",
      higherBetter: true,
      description: t("comparison.descriptions.cleanWords"),
    },
    {
      group: t("comparison.groups.text"),
      label: t("comparison.metrics.wordErrors"),
      value: getNumber(metrics.total_char_errors) ?? wordErrors,
      suffix: "",
      higherBetter: false,
      description: t("comparison.descriptions.wordErrors"),
    },
    {
      group: t("comparison.groups.analysis"),
      label: t("comparison.metrics.speedScore"),
      value: getNumber(analysis.speed_score),
      suffix: "/100",
      higherBetter: true,
      description: t("comparison.descriptions.speedScore"),
    },
    {
      group: t("comparison.groups.analysis"),
      label: t("comparison.metrics.accuracyScore"),
      value: getNumber(analysis.accuracy_score),
      suffix: "/100",
      higherBetter: true,
      description: t("comparison.descriptions.accuracyScore"),
    },
    {
      group: t("comparison.groups.analysis"),
      label: t("comparison.metrics.stabilityScore"),
      value: getNumber(analysis.stability_score),
      suffix: "/100",
      higherBetter: true,
      description: t("comparison.descriptions.stabilityScore"),
    },
    {
      group: t("comparison.groups.analysis"),
      label: t("comparison.metrics.completionScore"),
      value: getNumber(analysis.completion_score),
      suffix: "/100",
      higherBetter: true,
      description: t("comparison.descriptions.completionScore"),
    },
    {
      group: t("comparison.groups.pace"),
      label: t("comparison.metrics.avgWordWpm"),
      value: getNumber(metrics.average_word_wpm) ?? getAverage(words.map((word) => word?.wpm)),
      suffix: "WPM",
      higherBetter: true,
      description: t("comparison.descriptions.avgWordWpm"),
    },
    {
      group: t("comparison.groups.pace"),
      label: t("comparison.metrics.medianWpm"),
      value: getNumber(metrics.median_word_wpm),
      suffix: "WPM",
      higherBetter: true,
      description: t("comparison.descriptions.medianWpm"),
    },
    {
      group: t("comparison.groups.pace"),
      label: t("comparison.metrics.avgJump"),
      value: getNumber(metrics.average_jump_wpm),
      suffix: "WPM",
      higherBetter: false,
      description: t("comparison.descriptions.avgJump"),
    },
    {
      group: t("comparison.groups.control"),
      label: t("comparison.metrics.errorFreeWords"),
      value: getNumber(metrics.error_free_ratio_percent),
      suffix: "%",
      higherBetter: true,
      digits: 1,
      description: t("comparison.descriptions.errorFreeWords"),
    },
    {
      group: t("comparison.groups.control"),
      label: t("comparison.metrics.cleanStreak"),
      value: getNumber(metrics.longest_clean_streak),
      suffix: "",
      higherBetter: true,
      description: t("comparison.descriptions.cleanStreak"),
    },
    {
      group: t("comparison.groups.control"),
      label: t("comparison.metrics.disruptedWords"),
      value: getNumber(metrics.total_disrupted_words),
      suffix: "",
      higherBetter: false,
      description: t("comparison.descriptions.disruptedWords"),
    },
    {
      group: t("comparison.groups.recovery"),
      label: t("comparison.metrics.selfCorrection"),
      value: getNumber(metrics.self_correction_ratio_percent),
      suffix: "%",
      higherBetter: true,
      digits: 1,
      description: t("comparison.descriptions.selfCorrection"),
    },
    {
      group: t("comparison.groups.recovery"),
      label: t("comparison.metrics.stableFollowUp"),
      value: getNumber(metrics.stable_follow_up_ratio_percent),
      suffix: "%",
      higherBetter: true,
      digits: 1,
      description: t("comparison.descriptions.stableFollowUp"),
    },
    {
      group: t("comparison.groups.recovery"),
      label: t("comparison.metrics.speedDrop"),
      value: getNumber(metrics.average_speed_drop),
      suffix: "WPM",
      higherBetter: false,
      digits: 1,
      description: t("comparison.descriptions.speedDrop"),
    },
  ];
};

const formatAnimatedValue = (value, digits = 0) => (
  digits > 0 ? Number(value).toFixed(digits) : Math.round(Number(value))
);

const easeOutQuart = (progress) => 1 - ((1 - progress) ** 4);

function useRevealOnScroll({
  threshold = 0.18,
  rootMargin = "0px 0px -12% 0px",
} = {}) {
  const elementRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isVisible) {
      return undefined;
    }

    if (typeof window === "undefined" || typeof window.IntersectionObserver === "undefined") {
      setIsVisible(true);
      return undefined;
    }

    const node = elementRef.current;
    if (!node) {
      return undefined;
    }

    const observer = new window.IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [isVisible, rootMargin, threshold]);

  return { elementRef, isVisible };
}

function ComparisonRevealSection({
  className = "",
  children,
  threshold,
  rootMargin,
}) {
  const { elementRef, isVisible } = useRevealOnScroll({ threshold, rootMargin });

  return (
    <section
      ref={elementRef}
      className={[
        className,
        "comparison-reveal-section",
        isVisible ? "is-visible" : "",
      ].join(" ").trim()}
    >
      {typeof children === "function" ? children(isVisible) : children}
    </section>
  );
}

function ComparisonSlot({ item, index, locale, t, onChoose, onRemove }) {
  return (
    <div className={`comparison-slot ${item ? "filled" : "empty"}`}>
      {item ? (
        <>
          <div className="comparison-slot-head">
            <span className="comparison-slot-number">#{index + 1}</span>
            <strong>{formatDateTime(item.created_at, locale)}</strong>
          </div>
          <div className="comparison-slot-meta">
            <TrainingSettingsSummary training={item} className="comparison-slot-training-meta" compact />
            <TrainingTextButton
              text={item.training_text}
              title={t("trainingMeta.fullTextTitle")}
              subtitle={formatDateTime(item.created_at, locale)}
              buttonClassName="comparison-slot-text-button"
            />
          </div>
          <div className="comparison-slot-stats">
            <span>{item.speed} WPM</span>
            <span>{Number(item.accuracy || 0).toFixed(1)}%</span>
            <span>{Number(item.total_time || 0).toFixed(1)}s</span>
          </div>
          <div className="comparison-slot-actions">
            <button className="comparison-slot-button" type="button" onClick={() => onChoose(index)}>
              {t("comparison.editTraining")}
            </button>
            <button className="comparison-remove-button" type="button" onClick={() => onRemove(index)}>
              {t("comparison.removeTraining")}
            </button>
          </div>
        </>
      ) : (
        <div className="comparison-slot-empty-content">
          <span className="comparison-slot-number">#{index + 1}</span>
          <button className="comparison-add-button" type="button" onClick={() => onChoose(index)}>
            {t("comparison.addTraining")}
          </button>
        </div>
      )}
    </div>
  );
}

function ComparisonMetricHelp({ label, description }) {
  const { t } = useI18n();

  if (!description) {
    return null;
  }

  return (
    <div className="comparison-help-shell">
      <button
        className="comparison-help-button"
        type="button"
        aria-label={t("comparison.metricAria", { label })}
      >
        ?
      </button>
      <div className="comparison-help-tooltip" role="tooltip">
        {description}
      </div>
    </div>
  );
}

function AnimatedWinCount({ value, total, active }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!active) {
      setDisplayValue(0);
      return undefined;
    }

    let frameId = 0;
    let startTime = 0;
    const duration = 700;

    const tick = (timestamp) => {
      if (!startTime) {
        startTime = timestamp;
      }
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setDisplayValue(Math.round(value * easeOutQuart(progress)));
      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    frameId = window.requestAnimationFrame(tick);

    return () => window.cancelAnimationFrame(frameId);
  }, [value, active]);

  return (
    <>
      <strong>{displayValue}</strong>
      <span>/{total}</span>
    </>
  );
}

function ComparisonSummaryCard({
  item,
  slotIndex,
  winCount,
  totalMetrics,
  isBest,
  active,
  t,
}) {
  const [showHighlight, setShowHighlight] = useState(false);

  useEffect(() => {
    if (!active) {
      setShowHighlight(false);
      return undefined;
    }

    if (!isBest) {
      setShowHighlight(false);
      return undefined;
    }

    const timerId = window.setTimeout(() => {
      setShowHighlight(true);
    }, METRIC_COUNT_DURATION + 80);

    return () => window.clearTimeout(timerId);
  }, [active, isBest, item.id, winCount]);

  return (
    <div
      className={[
        "comparison-summary-card",
        showHighlight ? "best is-highlighted" : "",
      ].join(" ").trim()}
    >
      {isBest ? (
        <span className={`comparison-crown ${showHighlight ? "visible" : ""}`}>♛</span>
      ) : null}
      <span className="comparison-summary-label">{t("comparison.trainingNumber", { number: slotIndex + 1 })}</span>
      <div className="comparison-summary-value">
        <AnimatedWinCount
          value={winCount}
          total={totalMetrics}
          active={active}
        />
      </div>
    </div>
  );
}

function ComparisonMetricValue({
  valueMetric,
  itemId,
  isBest,
  isTiedBest,
  active,
}) {
  const [displayValue, setDisplayValue] = useState(
    valueMetric.value === null || valueMetric.value === undefined ? null : 0
  );
  const [showHighlight, setShowHighlight] = useState(false);

  useEffect(() => {
    if (!active) {
      setDisplayValue(valueMetric.value === null || valueMetric.value === undefined ? null : 0);
      setShowHighlight(false);
      return undefined;
    }

    const numericValue = getNumber(valueMetric.value);
    if (numericValue === null) {
      setDisplayValue(null);
      setShowHighlight(false);
      return undefined;
    }

    let frameId = 0;
    let highlightTimerId = 0;
    let startTime = 0;

    setDisplayValue(0);
    setShowHighlight(false);

    const tick = (timestamp) => {
      if (!startTime) {
        startTime = timestamp;
      }
      const progress = Math.min((timestamp - startTime) / METRIC_COUNT_DURATION, 1);
      setDisplayValue(numericValue * easeOutQuart(progress));

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
        return;
      }

      setDisplayValue(numericValue);
      if (isBest) {
        highlightTimerId = window.setTimeout(() => {
          setShowHighlight(true);
        }, 80);
      }
    };

    frameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(highlightTimerId);
    };
  }, [active, isBest, isTiedBest, itemId, valueMetric.digits, valueMetric.value]);

  return (
    <div
      className={[
        "comparison-metric-value",
        showHighlight && isBest ? "best is-highlighted" : "",
        showHighlight && isTiedBest ? "tied" : "",
      ].join(" ").trim()}
    >
      {isBest && !isTiedBest ? (
        <span className={`comparison-crown ${showHighlight ? "visible" : ""}`}>♛</span>
      ) : null}
      <strong>
        {displayValue === null
          ? "—"
          : formatAnimatedValue(displayValue, valueMetric.digits ?? 0)}
      </strong>
      {valueMetric.suffix ? <span>{valueMetric.suffix}</span> : null}
    </div>
  );
}

function TrainingPickerModal({
  items,
  selectedIds,
  message,
  locale,
  onSelect,
  onClose,
}) {
  const { t } = useI18n();
  const speedLabel = t("result.focusLabels.speed");
  const accuracyLabel = t("comparison.metrics.accuracy");
  const timeLabel = t("comparison.metrics.time");

  return (
    <div className="confirm-modal-backdrop" onClick={onClose}>
      <div className="comparison-picker-modal" onClick={(event) => event.stopPropagation()}>
        <div className="panel-heading">
          <h3>{t("comparison.pickerTitle")}</h3>
          <p>{t("comparison.pickerSubtitle")}</p>
        </div>

        {message ? <p className="comparison-message">{message}</p> : null}

        <div className="comparison-picker-list">
          {items.length ? items.map((item) => {
            const isSelected = selectedIds.includes(item.id);
            return (
              <button
                key={item.id}
                className={`history-card comparison-picker-card ${isSelected ? "selected" : ""}`}
                type="button"
                onClick={() => onSelect(item)}
              >
                <div className="history-card-top">
                  <div>
                    <h3 className="history-card-date">{formatDateTime(item.created_at, locale)}</h3>
                    <p className="history-text-preview">{item.training_text}</p>
                  </div>
                  {isSelected ? <span className="comparison-selected-badge">{t("comparison.selected")}</span> : null}
                </div>
                <div className="history-stats">
                  <div className="stat-badge stat-badge-accent">
                    <span className="stat-badge-label">{speedLabel}</span>
                    <div className="stat-badge-value-row">
                      <strong className="stat-badge-value">{item.speed}</strong>
                      <span className="stat-badge-suffix">WPM</span>
                    </div>
                  </div>
                  <div className="stat-badge">
                    <span className="stat-badge-label">{accuracyLabel}</span>
                    <div className="stat-badge-value-row">
                      <strong className="stat-badge-value">{item.accuracy}</strong>
                      <span className="stat-badge-suffix">%</span>
                    </div>
                  </div>
                  <div className="stat-badge">
                    <span className="stat-badge-label">{timeLabel}</span>
                    <div className="stat-badge-value-row">
                      <strong className="stat-badge-value">{Number(item.total_time || 0).toFixed(1)}</strong>
                      <span className="stat-badge-suffix">s</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          }) : (
            <p className="page-muted">{t("comparison.noItems")}</p>
          )}
        </div>

        <div className="result-actions confirm-actions">
          <button className="result-btn result-btn-secondary" type="button" onClick={onClose}>
            {t("comparison.close")}
          </button>
        </div>
      </div>
    </div>
  );
}

function ComparisonPage({ currentUser }) {
  const { locale, t } = useI18n();
  const comparisonStartRef = useRef(null);
  const previousComparisonSignatureRef = useRef("");
  const hasInitializedComparisonRef = useRef(false);
  const [items, setItems] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pickerSlot, setPickerSlot] = useState(null);
  const [pickerMessage, setPickerMessage] = useState("");

  useEffect(() => {
    setSelectedIds(getComparisonTrainingIds());
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    api
      .getTrainingHistory()
      .then((data) => setItems(getArray(data)))
      .catch(() => setError(t("comparison.errorLoad")))
      .finally(() => setLoading(false));
  }, [currentUser, t]);

  const slotItems = useMemo(() => (
    emptySlots.map((_, index) => (
      items.find((item) => item.id === selectedIds[index]) || null
    ))
  ), [items, selectedIds]);

  const selectedEntries = useMemo(() => (
    slotItems.reduce((entries, item, slotIndex) => (
      item ? [...entries, { item, slotIndex }] : entries
    ), [])
  ), [slotItems]);

  const selectedItems = useMemo(() => selectedEntries.map((entry) => entry.item), [selectedEntries]);

  const metricRows = useMemo(() => {
    const rows = selectedItems.map((item) => getComparisonMetrics(item, t));
    const firstRow = rows[0] || [];

    return firstRow
      .filter((metric, metricIndex) => (
        rows.some((row) => row[metricIndex]?.value !== null && row[metricIndex]?.value !== undefined)
      ))
      .map((metric, metricIndex) => ({
        ...metric,
        values: rows.map((row) => row[metricIndex] || metric),
      }));
  }, [selectedItems, t]);

  const groupedMetricRows = useMemo(() => (
    metricRows.reduce((groups, metric) => {
      const nextGroups = { ...groups };
      nextGroups[metric.group] = [...(nextGroups[metric.group] || []), metric];
      return nextGroups;
    }, {})
  ), [metricRows]);

  const winSummary = useMemo(() => {
    const totals = new Array(selectedItems.length).fill(0);
    const comparableMetricCount = metricRows.length;

    metricRows.forEach((metric) => {
      const comparableValues = metric.values
        .map((valueMetric) => getNumber(valueMetric.value));
      const existingValues = comparableValues.filter((value) => value !== null);
      if (existingValues.length < 2) {
        return;
      }

      const bestValue = metric.higherBetter
        ? Math.max(...existingValues)
        : Math.min(...existingValues);
      const bestIndexes = comparableValues.reduce((indexes, value, index) => (
        value === bestValue ? [...indexes, index] : indexes
      ), []);

      if (bestIndexes.length === 1) {
        totals[bestIndexes[0]] += 1;
      }
    });

    return {
      totalMetrics: comparableMetricCount,
      wins: totals,
    };
  }, [metricRows, selectedItems.length]);

  const summaryBestIndexes = useMemo(() => {
    const bestValue = Math.max(...winSummary.wins, 0);
    if (bestValue <= 0) {
      return [];
    }

    const bestIndexes = winSummary.wins.reduce((indexes, value, index) => (
      value === bestValue ? [...indexes, index] : indexes
    ), []);

    return bestIndexes.length === 1 ? bestIndexes : [];
  }, [winSummary.wins]);

  const comparisonSignature = useMemo(() => (
    selectedEntries
      .map(({ item, slotIndex }) => `${slotIndex}:${item.id}`)
      .join("|")
  ), [selectedEntries]);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!hasInitializedComparisonRef.current) {
      previousComparisonSignatureRef.current = comparisonSignature;
      hasInitializedComparisonRef.current = true;
      return;
    }

    if (
      comparisonSignature &&
      comparisonSignature !== previousComparisonSignatureRef.current &&
      selectedEntries.length >= 2
    ) {
      comparisonStartRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }

    previousComparisonSignatureRef.current = comparisonSignature;
  }, [comparisonSignature, loading, selectedEntries.length]);

  const handleChoose = (slotIndex) => {
    setPickerSlot(slotIndex);
    setPickerMessage("");
  };

  const handleSelect = (item) => {
    const result = setComparisonTrainingIdAt(pickerSlot, item.id);
    if (result.status === "duplicate") {
      setPickerMessage(t("comparison.duplicate"));
      return;
    }

    setSelectedIds(result.ids);
    setMessage("");
    setPickerSlot(null);
  };

  const handleRemove = (slotIndex) => {
    setSelectedIds(removeComparisonTrainingIdAt(slotIndex));
    setMessage("");
  };

  if (!currentUser) {
    return (
      <div className="page-card">
        <h2>{t("comparison.title")}</h2>
        <p className="page-muted">{t("comparison.loginRequired")}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-card">
        <LoadingHint variant="page" />
      </div>
    );
  }

  if (error) {
    return <div className="page-card">{error}</div>;
  }

  return (
    <div className="comparison-page">
      <div className="page-card">
        <h2>{t("comparison.title")}</h2>
        <p className="page-muted">
          {t("comparison.intro")}
        </p>
        {message ? <p className="comparison-message">{message}</p> : null}
      </div>

      <div className="comparison-slots">
        {slotItems.map((item, index) => (
          <ComparisonSlot
            key={`slot-${index}`}
            item={item}
            index={index}
            locale={locale}
            t={t}
            onChoose={handleChoose}
            onRemove={handleRemove}
          />
        ))}
      </div>

      {selectedEntries.length < 2 ? (
        <div className="page-card comparison-empty-state">
          {t("comparison.empty")}
        </div>
      ) : (
        <div className="comparison-metrics" ref={comparisonStartRef}>
          <div className="comparison-summary-sticky">
            <section
              key={`summary-${comparisonSignature}`}
              className="comparison-summary-section comparison-summary-section-visible"
            >
              <div className="comparison-summary-grid">
                {selectedEntries.map(({ item, slotIndex }, index) => (
                  <ComparisonSummaryCard
                    key={`summary-${item.id}`}
                    item={item}
                    slotIndex={slotIndex}
                    winCount={winSummary.wins[index] || 0}
                    totalMetrics={winSummary.totalMetrics}
                    isBest={summaryBestIndexes.includes(index)}
                    active
                    t={t}
                  />
                ))}
              </div>
            </section>
          </div>

          {Object.entries(groupedMetricRows).map(([group, rows]) => (
            <ComparisonRevealSection
              key={`${comparisonSignature}-${group}`}
              className="comparison-metric-section"
            >
              {(isVisible) => (
                <>
                  <h3>{group}</h3>
                  <div className="comparison-metric-table">
                    <div className="comparison-metric-row comparison-metric-row-head">
                      <div className="comparison-metric-label comparison-metric-label-head">{t("comparison.metricHead")}</div>
                      {selectedEntries.map(({ item, slotIndex }) => (
                        <div
                          key={`group-head-${group}-${item.id}`}
                          className="comparison-metric-value comparison-metric-column-head"
                        >
                          <strong>#{slotIndex + 1}</strong>
                        </div>
                      ))}
                    </div>
                    {rows.map((metric) => {
                      const comparableValues = metric.values
                        .map((valueMetric) => getNumber(valueMetric.value))
                        .filter((value) => value !== null);
                      const bestValue = metric.higherBetter
                        ? Math.max(...comparableValues)
                        : Math.min(...comparableValues);
                      const bestCount = comparableValues.filter((value) => value === bestValue).length;

                      return (
                        <div key={`${metric.group}-${metric.label}`} className="comparison-metric-row">
                          <div className="comparison-metric-label">
                            <span>{metric.label}</span>
                            <ComparisonMetricHelp label={metric.label} description={metric.description} />
                          </div>
                          {metric.values.map((valueMetric, valueIndex) => {
                            const numericValue = getNumber(valueMetric.value);
                            const isBest = comparableValues.length > 1 && numericValue === bestValue;
                            const isTiedBest = isBest && bestCount > 1;
                            return (
                              <ComparisonMetricValue
                                key={`${metric.label}-${selectedEntries[valueIndex]?.item.id}`}
                                valueMetric={valueMetric}
                                itemId={selectedEntries[valueIndex]?.item.id}
                                isBest={isBest}
                                isTiedBest={isTiedBest}
                                active={isVisible}
                              />
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </ComparisonRevealSection>
          ))}
        </div>
      )}

      {pickerSlot !== null ? (
        <TrainingPickerModal
          items={items}
          selectedIds={selectedEntries.map((entry) => entry.item.id)}
          message={pickerMessage}
          locale={locale}
          onSelect={handleSelect}
          onClose={() => setPickerSlot(null)}
        />
      ) : null}
    </div>
  );
}

export default ComparisonPage;
