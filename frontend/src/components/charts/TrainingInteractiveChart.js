import { useMemo, useRef, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip
);

function TrainingInteractiveChart({ words = [], className = "chart-container-large" }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const [tooltipData, setTooltipData] = useState(null);
  const containerRef = useRef(null);

  const chartData = useMemo(() => ({
    labels: words.map((_, index) => index + 1),
    datasets: [
      {
        label: "WPM",
        data: words.map((word) => word.wpm),
        borderColor: "#e2b714",
        tension: 0.3,
      },
      {
        label: "Accuracy",
        data: words.map((word) => Math.max(0, 100 - ((word.errors || 0) * 10))),
        borderColor: "#4fc3f7",
        tension: 0.3,
      },
    ],
  }), [words]);

  const clearActiveState = () => {
    setActiveIndex(null);
    setTooltipData(null);
  };

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
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

          const typedWord = word.typed || "";
          const correctWord = word.correct || "";
          const accuracyValue = typedWord.length
            ? Math.max(
              0,
              (((typedWord.length - (word.errors || 0)) / typedWord.length) * 100)
            ).toFixed(1)
            : "100.0";

          setActiveIndex(index);
          setTooltipData({
            correctWord,
            typedWord,
            wpm: word.wpm,
            cpm: word.cpm || 0,
            accuracy: accuracyValue,
            duration: Number(word.duration || 0).toFixed(2),
            x: tooltip.caretX,
            y: tooltip.caretY,
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
          color: "rgba(255,255,255,0.05)",
        },
      },
      y: {
        grid: {
          color: "rgba(255,255,255,0.05)",
        },
      },
    },
    onHover: (_, elements) => {
      if (elements.length) {
        setActiveIndex(elements[0].index);
      } else {
        clearActiveState();
      }
    },
    onLeave: () => {
      clearActiveState();
    },
  }), [words]);

  const renderWordDiff = (correct, typed) => (
    correct.split("").map((char, index) => (
      <span
        key={`${char}-${index}`}
        style={{ color: typed?.[index] !== char ? "#ff5252" : undefined }}
      >
        {char}
      </span>
    ))
  );

  return (
    <div
      className={`chart-container ${className}`}
      ref={containerRef}
      onMouseLeave={clearActiveState}
    >
      <Line data={chartData} options={options} />

      {activeIndex !== null && words.length > 0 && (
        <div
          className="highlight"
          style={{
            left: `${(activeIndex / words.length) * 100}%`,
            width: `${100 / words.length}%`,
          }}
        />
      )}

      {tooltipData && (
        (() => {
          const containerWidth = containerRef.current?.clientWidth || 0;
          const isRightHalf = containerWidth
            ? tooltipData.x > containerWidth / 2
            : false;
          const offset = 16;

          return (
            <div
              className="chart-tooltip chart-tooltip-inline"
              style={{
                left: isRightHalf ? "auto" : `${tooltipData.x + offset}px`,
                right: isRightHalf
                  ? `${Math.max(containerWidth - tooltipData.x + offset, 16)}px`
                  : "auto",
                top: `${Math.max(tooltipData.y - 16, 16)}px`,
              }}
            >
              <div className="tooltip-word">
                {renderWordDiff(tooltipData.correctWord, tooltipData.typedWord)}
              </div>
              <div className="tooltip-line">
                <strong>Написано:</strong>{" "}
                <span className="tooltip-typed">{tooltipData.typedWord}</span>
              </div>
              <div>⚡ {tooltipData.wpm} WPM</div>
              <div>⌨️ {tooltipData.cpm} CPM</div>
              <div>🎯 {tooltipData.accuracy}% Accuracy</div>
              <div>⏱ {tooltipData.duration}s</div>
            </div>
          );
        })()
      )}
    </div>
  );
}

export default TrainingInteractiveChart;
