import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import InteractiveChartShell from "./InteractiveChartShell";

const getArray = (value) => (Array.isArray(value) ? value : []);
const getArrayUniq = (values) => [...new Set(values)];

const datasetColorMap = {
  focus: "#ff9f43",
  brief: "#f3f3ef",
  recovery: "#7bed9f",
};

const focusPointColorMap = {
  problem: "#ff6b6b",
  rushed: "#ff9f43",
  pattern: "#f368e0",
  careful: "#7bed9f",
  strong: "#4fc3f7",
};

const overlayOrderMap = {
  focus: 0,
  brief: 1,
  recovery: 2,
};

const normalizeWordIndexes = (value) => (
  getArrayUniq(
    getArray(value)
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item) && item >= 0)
  )
);

const getWordAccuracy = (word) => {
  const typedWord = word?.typed || "";
  if (!typedWord.length) {
    return 100;
  }

  return Math.max(
    0,
    (((typedWord.length - (word?.errors || 0)) / typedWord.length) * 100)
  );
};

function TrainingAnalysisOverlayChart({
  words = [],
  focusBoard = [],
  compactInsights = [],
  recoveryTimeline = [],
  recoveryMetrics = {},
  className = "chart-container-large",
}) {
  const [enabledLayers, setEnabledLayers] = useState({
    focus: true,
    brief: true,
    recovery: true,
  });

  const toggleLayer = (layerKey) => {
    setEnabledLayers((current) => ({
      ...current,
      [layerKey]: !current[layerKey],
    }));
  };

  const focusItems = useMemo(() => (
    getArray(focusBoard)
      .map((item) => {
        const wordIndexes = normalizeWordIndexes(item.word_indexes);
        const wordIndex = wordIndexes[0];
        const word = words[wordIndex];
        if (!word) {
          return null;
        }

        return {
          overlayType: "focus",
          title: item.title,
          label: item.label,
          meta: item.meta,
          description: item.note,
          wordIndexes,
          wordIndex,
          color: focusPointColorMap[item.kind] || datasetColorMap.focus,
        };
      })
      .filter(Boolean)
  ), [focusBoard, words]);

  const briefItems = useMemo(() => (
    getArray(compactInsights)
      .map((item) => {
        const wordIndexes = normalizeWordIndexes(item.word_indexes);
        const wordIndex = wordIndexes[0];
        const word = words[wordIndex];
        if (!word) {
          return null;
        }

        return {
          overlayType: "brief",
          title: item.title,
          label: item.label,
          meta: `${word.wpm} WPM · ${getWordAccuracy(word).toFixed(1)}% · слово ${wordIndex + 1}`,
          description: item.description,
          wordIndexes,
          wordIndex,
          color: datasetColorMap.brief,
        };
      })
      .filter(Boolean)
  ), [compactInsights, words]);

  const recoveryItems = useMemo(() => (
    getArray(recoveryTimeline)
      .map((item) => {
        const wordIndex = Number(item.word_index);
        const nextWordIndex = Number(item.next_word_index);
        const word = words[wordIndex];
        if (!word) {
          return null;
        }

        return {
          overlayType: "recovery",
          title: item.after,
          label: item.recovered ? "Восстановление после сбоев" : "Сбой без восстановления",
          meta: `${item.recovery_score_percent}% восстановления · ${item.speed_drop} WPM просадки`,
          description: item.recovered
            ? (
              item.corrected_inside_word
                ? "Ошибка была исправлена внутри слова и поток удалось вернуть."
                : "После сбоя ритм был возвращён на следующем слове."
            )
            : "После сбоя темп и контроль не вернулись в рабочий диапазон сразу.",
          wordIndexes: normalizeWordIndexes([wordIndex, nextWordIndex]),
          wordIndex,
          color: item.recovered ? datasetColorMap.recovery : "#ff6b6b",
        };
      })
      .filter(Boolean)
  ), [recoveryTimeline, words]);

  const overlayGroups = useMemo(() => {
    const groups = new Map();
    const appendItems = (items, isEnabled) => {
      if (!isEnabled) {
        return;
      }

      items.forEach((item) => {
        const wordIndex = Number(item.wordIndex);
        if (!words[wordIndex]) {
          return;
        }

        const existing = groups.get(wordIndex) || { wordIndex, items: [] };
        existing.items.push(item);
        groups.set(wordIndex, existing);
      });
    };

    appendItems(focusItems, enabledLayers.focus);
    appendItems(briefItems, enabledLayers.brief);
    appendItems(recoveryItems, enabledLayers.recovery);

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        items: group.items.sort(
          (left, right) => overlayOrderMap[left.overlayType] - overlayOrderMap[right.overlayType]
        ),
      }))
      .sort((left, right) => left.wordIndex - right.wordIndex);
  }, [briefItems, enabledLayers, focusItems, recoveryItems, words]);

  const overlayZones = useMemo(() => (
    overlayGroups.map((group) => {
      const wordIndexes = getArrayUniq(
        group.items.flatMap((item) => item.wordIndexes || [group.wordIndex])
      ).sort((left, right) => left - right);
      const rawStart = wordIndexes[0] ?? group.wordIndex;
      const rawEnd = wordIndexes[wordIndexes.length - 1] ?? group.wordIndex;
      const start = rawStart === rawEnd
        ? Math.max(0, rawStart - 1)
        : rawStart;
      const end = rawStart === rawEnd
        ? Math.min(words.length - 1, rawEnd + 1)
        : rawEnd;

      return {
        wordIndex: group.wordIndex,
        start,
        end,
      };
    })
  ), [overlayGroups, words.length]);

  const mergedOverlayZones = useMemo(() => {
    const sorted = [...overlayZones].sort((left, right) => left.start - right.start);
    const merged = [];

    sorted.forEach((zone) => {
      const lastZone = merged[merged.length - 1];
      if (!lastZone || zone.start > lastZone.end + 1) {
        merged.push({ ...zone });
        return;
      }

      lastZone.end = Math.max(lastZone.end, zone.end);
    });

    return merged;
  }, [overlayZones]);

  const highlightDatasets = useMemo(() => (
    mergedOverlayZones.map((zone, index) => ({
      label: `WPM highlight ${index + 1}`,
      data: words.map((word, wordIndex) => (
        wordIndex >= zone.start && wordIndex <= zone.end ? word.wpm : null
      )),
      borderColor: "rgba(255, 255, 255, 0.98)",
      backgroundColor: "rgba(255, 255, 255, 0.98)",
      tension: 0.3,
      cubicInterpolationMode: "monotone",
      borderWidth: 3,
      pointRadius: 0,
      pointHoverRadius: 0,
      pointHitRadius: 0,
      spanGaps: false,
      borderCapStyle: "round",
      borderJoinStyle: "round",
      order: 2,
    }))
  ), [mergedOverlayZones, words]);

  const chartData = useMemo(() => ({
    labels: words.map((_, index) => index + 1),
    datasets: [
      {
        label: "WPM",
        data: words.map((word) => word.wpm),
        borderColor: "rgba(226, 183, 20, 0.18)",
        backgroundColor: "rgba(226, 183, 20, 0.18)",
        tension: 0.3,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 0,
        pointHitRadius: 0,
        order: 1,
      },
      {
        label: "Accuracy",
        data: words.map((word) => Math.max(0, 100 - ((word.errors || 0) * 10))),
        borderColor: "rgba(79, 195, 247, 0.18)",
        backgroundColor: "rgba(79, 195, 247, 0.18)",
        tension: 0.3,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 0,
        pointHitRadius: 0,
        order: 0,
      },
      ...highlightDatasets,
    ],
  }), [highlightDatasets, words]);

  const getOptions = useMemo(() => () => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 180,
    },
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      x: {
        grid: {
          color: "rgba(255,255,255,0.05)",
        },
      },
      y: {
        grid: {
          color: "rgba(255,255,255,0.05)",
        },
        min: 0,
        max: 105,
      },
    },
  }), []);

  const renderOverlaySection = (item, index, total) => (
    <div
      key={`${item.overlayType}-${item.title}-${index}`}
      className={`analysis-overlay-section analysis-overlay-section-${item.overlayType}`}
    >
      {index > 0 && <div className="analysis-overlay-divider" />}
      <span className="analysis-overlay-kicker" style={{ color: item.color }}>
        {item.label}
      </span>
      <strong>{item.title}</strong>
      <div className="analysis-overlay-meta">{item.meta}</div>
      {item.overlayType === "recovery" ? (
        <div className="analysis-overlay-stats">
          <span>Исправлено внутри слова: {Math.round(Number(recoveryMetrics.self_correction_ratio_percent || 0))}%</span>
          <span>Стабильное следующее слово: {Math.round(Number(recoveryMetrics.stable_follow_up_ratio_percent || 0))}%</span>
          <span>Средняя просадка темпа: {recoveryMetrics.recovery_examples?.average_speed_drop || 0} WPM</span>
        </div>
      ) : null}
      <p>{item.description}</p>
      {total > 1 ? (
        <span className="analysis-overlay-chip">{index + 1} из {total}</span>
      ) : null}
    </div>
  );

  const renderOverlay = ({
    activeState,
    liveActiveState,
    isActiveVisible,
    setActiveState,
    clearActiveState,
    containerRef,
  }) => (
    <>
      <div className="analysis-overlay-hotspots">
        {overlayGroups.map((group) => {
          const zone = overlayZones.find((item) => item.wordIndex === group.wordIndex);
          const minIndex = zone?.start ?? group.wordIndex;
          const maxIndex = zone?.end ?? group.wordIndex;
          const left = `${(minIndex / Math.max(words.length, 1)) * 100}%`;
          const width = `${((maxIndex - minIndex + 1) / Math.max(words.length, 1)) * 100}%`;
          const isActive = activeState?.group?.wordIndex === group.wordIndex;

          return (
            <button
              key={`analysis-hotspot-${group.wordIndex}`}
              type="button"
              className={`analysis-overlay-hotspot ${isActive ? "active" : ""}`}
              style={{ left, width }}
              onMouseEnter={(event) => {
                if (liveActiveState?.pinned) {
                  return;
                }
                const containerRect = containerRef.current?.getBoundingClientRect();
                const hotspotRect = event.currentTarget.getBoundingClientRect();
                setActiveState({
                  type: "analysis",
                  group,
                  x: hotspotRect.left - (containerRect?.left || 0) + hotspotRect.width / 2,
                  y: 24,
                  pinned: false,
                });
              }}
              onMouseLeave={() => {
                if (!liveActiveState?.pinned) {
                  clearActiveState();
                }
              }}
              onClick={(event) => {
                event.stopPropagation();
                if (liveActiveState?.pinned && liveActiveState?.group?.wordIndex === group.wordIndex) {
                  clearActiveState({ immediate: true });
                  return;
                }
                const containerRect = containerRef.current?.getBoundingClientRect();
                const hotspotRect = event.currentTarget.getBoundingClientRect();
                setActiveState({
                  type: "analysis",
                  group,
                  x: hotspotRect.left - (containerRect?.left || 0) + hotspotRect.width / 2,
                  y: 24,
                  pinned: true,
                });
              }}
              aria-label={`Разбор слова ${group.wordIndex + 1}`}
            />
          );
        })}
      </div>

      {activeState?.group ? (
        <div
          className="highlight"
          style={{
            left: `${((overlayZones.find((item) => item.wordIndex === activeState.group.wordIndex)?.start ?? activeState.group.wordIndex) / words.length) * 100}%`,
            width: `${(((overlayZones.find((item) => item.wordIndex === activeState.group.wordIndex)?.end ?? activeState.group.wordIndex) - (overlayZones.find((item) => item.wordIndex === activeState.group.wordIndex)?.start ?? activeState.group.wordIndex) + 1) / words.length) * 100}%`,
            opacity: isActiveVisible ? 1 : 0,
          }}
        />
      ) : null}
    </>
  );

  const renderTooltip = ({ activeState, isActiveVisible, clearActiveState, containerRef }) => {
    if (!activeState?.group) {
      return null;
    }

    const containerRect = containerRef.current?.getBoundingClientRect();
    const viewportX = (containerRect?.left || 0) + activeState.x;
    const viewportY = (containerRect?.top || 0) + activeState.y;
    const offset = 16;
    const items = activeState.group.items || [];
    const popupWidth = 420;
    const popupLeft = viewportX > window.innerWidth / 2
      ? Math.max(16, viewportX - popupWidth - offset)
      : Math.min(window.innerWidth - popupWidth - 16, viewportX + offset);

    return createPortal((
      <div
        className="chart-tooltip chart-tooltip-inline analysis-overlay-tooltip analysis-overlay-tooltip-stacked"
        data-visible={isActiveVisible ? "true" : "false"}
        style={{
          left: `${Math.max(16, popupLeft)}px`,
          right: "auto",
          top: `${Math.max(viewportY - 16, 16)}px`,
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="analysis-overlay-close"
          type="button"
          aria-label="Закрыть"
          onClick={() => clearActiveState({ immediate: true })}
        >
          ×
        </button>
        {items.map((item, index) => renderOverlaySection(item, index, items.length))}
      </div>
    ), document.body);
  };

  const onContainerClick = (_event, { activeState, clearActiveState }) => {
    if (activeState?.pinned) {
      clearActiveState({ immediate: true });
    } else {
      clearActiveState({ immediate: true });
    }
  };

  const onContainerMouseLeave = (event, { activeState, clearActiveState }) => {
    if (activeState?.pinned) {
      event.preventDefault();
      return;
    }
    clearActiveState();
  };

  return (
    <div className="analysis-overlay-shell">
      <div
        className="analysis-overlay-controls"
        onClick={(event) => event.stopPropagation()}
      >
        {[
          ["focus", "Ключевые точки", "#ff9f43"],
          ["brief", "Коротко по разбору", "#f3f3ef"],
          ["recovery", "Восстановление", "#7bed9f"],
        ].map(([key, label, color]) => (
          <label key={key} className={`analysis-overlay-check ${enabledLayers[key] ? "checked" : ""}`}>
            <input
              type="checkbox"
              checked={enabledLayers[key]}
              onChange={() => toggleLayer(key)}
            />
            <span className="analysis-overlay-box" style={{ "--overlay-accent": color }} />
            <span className="analysis-overlay-label">{label}</span>
          </label>
        ))}
      </div>

      <InteractiveChartShell
        data={chartData}
        className={className}
        getOptions={getOptions}
        renderOverlay={renderOverlay}
        renderTooltip={renderTooltip}
        onContainerClick={onContainerClick}
        onContainerMouseLeave={onContainerMouseLeave}
      />
    </div>
  );
}

export default TrainingAnalysisOverlayChart;
