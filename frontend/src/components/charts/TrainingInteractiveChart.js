import { useEffect, useMemo, useRef, useState } from "react";
import InteractiveChartShell from "./InteractiveChartShell";
import { useI18n } from "../../i18n";

const SPEED_WINDOW_WORDS = 5;
const MIN_WORD_DURATION_SECONDS = 0.5;

const getWordAccuracy = (word) => {
  const typedWord = word?.typed || "";
  if (!typedWord.length) {
    return "100.0";
  }

  return Math.max(
    0,
    (((typedWord.length - (word?.errors || 0)) / typedWord.length) * 100)
  ).toFixed(1);
};

const isWordPerfect = (word) => (
  String(word?.correct || "") === String(word?.typed || "")
);

const getWordDuration = (word) => (
  Math.max(Number(word?.duration || 0), MIN_WORD_DURATION_SECONDS)
);

export const getRollingSpeedSeries = (words = []) => words.map((_, index) => {
  const windowStart = Math.max(0, index - SPEED_WINDOW_WORDS + 1);
  const windowWords = words.slice(windowStart, index + 1);
  const seconds = windowWords.reduce((total, word) => total + getWordDuration(word), 0);
  const minutes = seconds / 60;

  if (!minutes) {
    return {
      wpm: 0,
      rwpm: 0,
    };
  }

  const chars = windowWords.reduce((total, word, windowIndex) => {
    const sourceIndex = windowStart + windowIndex;
    const separator = sourceIndex < words.length - 1 ? 1 : 0;
    const typedLength = String(word?.typed || "").length;
    const correctLength = String(word?.correct || "").length;

    return {
      raw: total.raw + typedLength + separator,
      correct: total.correct + (isWordPerfect(word) ? correctLength + separator : 0),
    };
  }, {
    raw: 0,
    correct: 0,
  });

  return {
    wpm: Math.round((chars.correct / 5) / minutes),
    rwpm: Math.round((chars.raw / 5) / minutes),
  };
});

function TrainingInteractiveChart({ words = [], className = "chart-container-large" }) {
  const { t } = useI18n();
  const tooltipRef = useRef(null);
  const [visibleSeries, setVisibleSeries] = useState({
    wpm: true,
    rwpm: true,
    burst: true,
    accuracy: true,
    errors: true,
  });
  const [tooltipSize, setTooltipSize] = useState({
    width: 320,
    height: 220,
  });

  const toggleSeries = (seriesKey) => {
    setVisibleSeries((current) => ({
      ...current,
      [seriesKey]: !current[seriesKey],
    }));
  };

  const speedSeries = useMemo(() => getRollingSpeedSeries(words), [words]);

  useEffect(() => {
    if (!tooltipRef.current) {
      return undefined;
    }

    const measureTooltip = () => {
      if (!tooltipRef.current) {
        return;
      }

      const nextSize = {
        width: tooltipRef.current.offsetWidth || 320,
        height: tooltipRef.current.offsetHeight || 220,
      };

      setTooltipSize((current) => (
        current.width !== nextSize.width || current.height !== nextSize.height
          ? nextSize
          : current
      ));
    };

    const frameId = window.requestAnimationFrame(measureTooltip);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  });

  const errorMarkerData = useMemo(() => (
    words.map((word, index) => {
      if (!(word?.had_mistake || (word?.errors || 0) > 0)) {
        return null;
      }

      const wpmValue = Number(speedSeries[index]?.wpm ?? word.wpm ?? word.burst ?? 0);
      const rwpmValue = Number(speedSeries[index]?.rwpm ?? word.rwpm ?? word.wpm ?? word.burst ?? 0);
      const burstValue = Number(word.burst ?? word.wpm ?? 0);
      const accuracyValue = Math.max(0, 100 - ((word.errors || 0) * 10));
      const prevValues = [
        Number(speedSeries[index - 1]?.wpm ?? words[index - 1]?.wpm ?? wpmValue),
        Number(speedSeries[index - 1]?.rwpm ?? words[index - 1]?.rwpm ?? rwpmValue),
        Number(words[index - 1]?.burst ?? burstValue),
      ];
      const nextValues = [
        Number(speedSeries[index + 1]?.wpm ?? words[index + 1]?.wpm ?? wpmValue),
        Number(speedSeries[index + 1]?.rwpm ?? words[index + 1]?.rwpm ?? rwpmValue),
        Number(words[index + 1]?.burst ?? burstValue),
      ];
      const localMax = Math.max(wpmValue, rwpmValue, burstValue, accuracyValue, ...prevValues, ...nextValues);
      const localMin = Math.min(wpmValue, rwpmValue, burstValue, accuracyValue, ...prevValues, ...nextValues);
      const topRoom = 103 - localMax;
      const bottomRoom = localMin - 3;
      const preferTop = topRoom >= bottomRoom;
      const baseOffset = preferTop ? Math.max(8, Math.min(14, topRoom - 1)) : -Math.max(8, Math.min(14, bottomRoom - 1));
      const parityOffset = index % 2 === 0 ? 1.5 : -1.5;
      return Math.max(4, Math.min(101, burstValue + baseOffset + parityOffset));
    })
  ), [speedSeries, words]);

  const chartData = useMemo(() => ({
    labels: words.map((_, index) => index + 1),
    datasets: [
      {
        label: "WPM",
        data: speedSeries.map((item) => item.wpm),
        borderColor: visibleSeries.wpm ? "#e2b714" : "rgba(226, 183, 20, 0)",
        tension: 0.42,
        pointRadius: 0,
        pointHoverRadius: 0,
        pointHitRadius: 0,
        borderWidth: 3,
      },
      {
        label: "rWPM",
        data: speedSeries.map((item) => item.rwpm),
        borderColor: visibleSeries.rwpm ? "rgba(226, 183, 20, 0.72)" : "rgba(226, 183, 20, 0)",
        tension: 0.42,
        pointRadius: 0,
        pointHoverRadius: 0,
        pointHitRadius: 0,
        borderWidth: 2,
        borderDash: [8, 6],
      },
      {
        label: "Burst",
        data: words.map((word) => Number(word.burst ?? word.wpm ?? 0)),
        borderColor: visibleSeries.burst ? "#6f6f73" : "rgba(111, 111, 115, 0)",
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 0,
        pointHitRadius: 0,
        borderWidth: 2,
      },
      {
        label: "Accuracy",
        data: words.map((word) => Math.max(0, 100 - ((word.errors || 0) * 10))),
        borderColor: visibleSeries.accuracy ? "#4fc3f7" : "rgba(79, 195, 247, 0)",
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 0,
        pointHitRadius: 0,
      },
      {
        label: "Errors",
        data: errorMarkerData,
        showLine: false,
        pointStyle: "crossRot",
        pointRadius: words.map((word) => (((word?.had_mistake || (word?.errors || 0) > 0) && visibleSeries.errors) ? 8 : 0)),
        pointHoverRadius: words.map((word) => (((word?.had_mistake || (word?.errors || 0) > 0) && visibleSeries.errors) ? 9 : 0)),
        pointHitRadius: words.map((word) => (((word?.had_mistake || (word?.errors || 0) > 0)) ? 12 : 0)),
        pointBorderColor: words.map((word) => (((word?.had_mistake || (word?.errors || 0) > 0) && visibleSeries.errors) ? "#ff5252" : "rgba(255, 82, 82, 0)")),
        pointBackgroundColor: words.map((word) => (((word?.had_mistake || (word?.errors || 0) > 0) && visibleSeries.errors) ? "#ff5252" : "rgba(255, 82, 82, 0)")),
        pointBorderWidth: words.map((word) => (((word?.had_mistake || (word?.errors || 0) > 0) && visibleSeries.errors) ? 2.5 : 0)),
        order: 10,
      },
    ],
  }), [errorMarkerData, speedSeries, visibleSeries, words]);

  const getOptions = useMemo(() => ({ setActiveState, clearActiveState }) => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      tooltip: {
        enabled: false,
        external: (context) => {
          const tooltip = context.tooltip;

          if (tooltip.opacity === 0 || !tooltip.dataPoints?.length) {
            clearActiveState();
            return;
          }

          const index = tooltip.dataPoints[0].dataIndex;
          const word = words[index];
          if (!word) {
            clearActiveState();
            return;
          }

          const primaryMeta = context.chart.getDatasetMeta(0);
          const currentPoint = primaryMeta?.data?.[index];
          const prevPoint = primaryMeta?.data?.[index - 1];
          const nextPoint = primaryMeta?.data?.[index + 1];
          let highlightWidth = 0;

          if (prevPoint && nextPoint) {
            highlightWidth = Math.abs(nextPoint.x - prevPoint.x) / 2;
          } else if (nextPoint && currentPoint) {
            highlightWidth = Math.abs(nextPoint.x - currentPoint.x);
          } else if (prevPoint && currentPoint) {
            highlightWidth = Math.abs(currentPoint.x - prevPoint.x);
          }

          if (!highlightWidth) {
            highlightWidth = (context.chart.chartArea?.right - context.chart.chartArea?.left) / Math.max(words.length, 1);
          }

          setActiveState({
            type: "word",
            index,
            x: currentPoint?.x ?? tooltip.caretX,
            y: tooltip.caretY,
            chartAreaTop: context.chart.chartArea?.top ?? 0,
            chartAreaBottom: context.chart.chartArea?.bottom ?? context.chart.height ?? 0,
            chartAreaLeft: context.chart.chartArea?.left ?? 0,
            chartAreaRight: context.chart.chartArea?.right ?? context.chart.width ?? 0,
            highlightWidth,
            correctWord: word.correct || "",
            typedWord: word.typed || "",
            wpm: Number(speedSeries[index]?.wpm ?? word.wpm ?? word.burst ?? 0),
            rwpm: Number(speedSeries[index]?.rwpm ?? word.rwpm ?? word.wpm ?? word.burst ?? 0),
            burst: Number(word.burst ?? word.wpm ?? 0),
            cpm: word.cpm || 0,
            accuracy: getWordAccuracy(word),
            duration: Number(word.duration || 0).toFixed(2),
            errors: Number(word.errors || 0),
            hadMistake: Boolean(word.had_mistake || (word.errors || 0) > 0),
          });
        },
      },
      legend: {
        display: false,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        grid: {
          display: false,
        },
      },
    },
    onHover: (_, elements) => {
      if (elements.length) {
        setActiveState((current) => ({
          ...(current || {}),
          index: elements[0].index,
        }));
      } else {
        clearActiveState();
      }
    },
    onLeave: () => {
      clearActiveState();
    },
  }), [speedSeries, words]);

  const renderOverlay = ({ activeState, containerRef }) => (
    activeState?.index !== null && activeState?.index !== undefined && words.length > 0 ? (
      <div
        className="highlight"
        style={{
          left: `${Math.max(0, (activeState.x || 0) - ((activeState.highlightWidth || 0) / 2))}px`,
          width: `${Math.min(
            activeState.highlightWidth || 0,
            containerRef.current?.clientWidth || activeState.highlightWidth || 0
          )}px`,
        }}
      />
    ) : null
  );

  const renderTooltip = ({ activeState, containerRef }) => {
    if (!activeState?.type) {
      return null;
    }

    const containerWidth = containerRef.current?.clientWidth || 0;
    const baseTooltipWidth = Math.min(
      tooltipSize.width || 320,
      containerWidth <= 420 ? 260 : 320
    );
    const tooltipHeight = tooltipSize.height || 220;
    const offset = 16;
    const chartPadding = 8;
    const chartAreaLeft = activeState.chartAreaLeft || 0;
    const chartAreaRight = activeState.chartAreaRight || containerWidth;
    const chartMidpoint = chartAreaLeft + ((chartAreaRight - chartAreaLeft) / 2);
    const cursorX = activeState.x || 0;
    const preferredSide = cursorX >= chartMidpoint ? "left" : "right";
    const availableLeft = Math.max(0, cursorX - chartAreaLeft - offset - chartPadding);
    const availableRight = Math.max(0, chartAreaRight - cursorX - offset - chartPadding);
    const selectedSide = (
      preferredSide === "left"
        ? (availableLeft >= Math.min(baseTooltipWidth, availableRight) || availableLeft >= availableRight ? "left" : "right")
        : (availableRight >= Math.min(baseTooltipWidth, availableLeft) || availableRight >= availableLeft ? "right" : "left")
    );
    const sideCapacity = Math.max(
      140,
      selectedSide === "left" ? availableLeft : availableRight
    );
    const tooltipWidth = Math.min(baseTooltipWidth, sideCapacity);
    const preferredLeft = selectedSide === "left"
      ? cursorX - tooltipWidth - offset
      : cursorX + offset;
    const minLeft = Math.max(chartAreaLeft + chartPadding, chartPadding);
    const maxLeft = Math.max(
      minLeft,
      Math.min(
        chartAreaRight - tooltipWidth - chartPadding,
        containerWidth - tooltipWidth - chartPadding
      )
    );
    const tooltipLeft = Math.min(Math.max(preferredLeft, minLeft), maxLeft);
    const chartAreaTop = Math.max((activeState.chartAreaTop || 0) + chartPadding, chartPadding);
    const chartAreaBottom = Math.max(chartAreaTop, (activeState.chartAreaBottom || 0) - chartPadding);
    const preferredTop = Math.max((activeState.y || 0) - 16, chartAreaTop);
    const maxTop = Math.max(chartAreaTop, chartAreaBottom - tooltipHeight);
    const tooltipTop = Math.min(preferredTop, maxTop);

    return (
      <div
        ref={tooltipRef}
        className="chart-tooltip chart-tooltip-inline"
        style={{
          left: `${tooltipLeft}px`,
          right: "auto",
          top: `${tooltipTop}px`,
          width: `${tooltipWidth}px`,
          minWidth: 0,
          maxWidth: `${tooltipWidth}px`,
        }}
      >
        <div className="tooltip-word">
          {activeState.correctWord.split("").map((char, index) => (
            <span
              key={`${char}-${index}`}
              style={{ color: activeState.typedWord?.[index] !== char ? "#ff5252" : undefined }}
            >
              {char}
            </span>
          ))}
        </div>
        <div className="tooltip-line">
          <strong>{t("result.chart.written")}</strong>{" "}
          <span className="tooltip-typed">{activeState.typedWord}</span>
        </div>
        <div>⚡ {activeState.wpm} WPM</div>
        <div>⋯ {activeState.rwpm} rWPM</div>
        <div>• {activeState.burst} Burst</div>
        <div>⌨️ {activeState.cpm} CPM</div>
        <div>🎯 {activeState.accuracy}% Accuracy</div>
        <div>❌ {activeState.errors} {t("result.chart.errorsShort")}</div>
        {activeState.hadMistake && !activeState.errors ? <div>↩ {t("result.chart.correctedMistake")}</div> : null}
        <div>⏱ {activeState.duration}s</div>
      </div>
    );
  };

  return (
    <div className="chart-with-legend">
      <InteractiveChartShell
        data={chartData}
        className={className}
        getOptions={getOptions}
        renderOverlay={renderOverlay}
        renderTooltip={renderTooltip}
      />

      <div className="chart-series-legend">
        {[
          ["wpm", "WPM", "#e2b714"],
          ["rwpm", "rWPM", "rgba(226, 183, 20, 0.72)"],
          ["burst", "burst", "#6f6f73"],
          ["accuracy", t("result.chart.legendAccuracy"), "#4fc3f7"],
          ["errors", t("result.chart.legendErrors"), "#ff5252"],
        ].map(([key, label, color]) => (
          <label
            key={key}
            className={`chart-series-toggle ${visibleSeries[key] ? "active" : "disabled"}`}
          >
            <input
              type="checkbox"
              checked={visibleSeries[key]}
              onChange={() => toggleSeries(key)}
            />
            <span
              className={`chart-series-swatch ${
                key === "errors"
                  ? "chart-series-swatch-errors"
                  : key === "rwpm"
                    ? "chart-series-swatch-line chart-series-swatch-line-dashed"
                    : "chart-series-swatch-line"
              }`}
              style={{ "--series-color": color }}
            />
            <span className="chart-series-text">{label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default TrainingInteractiveChart;
