import { useEffect, useRef, useState } from "react";
import TrainingInteractiveChart from "../charts/TrainingInteractiveChart";

function ResultScreen({
  title = "Результат",
  words,
  replayText = "",
  totalTime,
  wpm,
  accuracy,
  replayMaxLines = 6,
  replayClassName = "",
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
}) {
  const [replayIndex, setReplayIndex] = useState(-1);
  const replayWordRefs = useRef([]);

  useEffect(() => {
    let index = 0;
    const stepDuration = Math.max(16, 2000 / Math.max(words.length, 1));

    const interval = setInterval(() => {
      index += 1;
      setReplayIndex(index);

      if (index >= words.length) {
        clearInterval(interval);
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, [words]);

  const renderReplayWord = (word, index) => {
    const isVisible = index <= replayIndex;

    return (
      <span
        key={index}
        className={[
          "replay-word",
          isVisible ? "visible" : "",
        ].join(" ").trim()}
        ref={(element) => {
          replayWordRefs.current[index] = element;
        }}
      >
        {word.correct.split("").map((char, charIndex) => {
          const charClass = !isVisible
            ? "char"
            : word.typed?.[charIndex] === char
              ? "correct"
              : "incorrect";

          return (
            <span
              key={`${index}-${charIndex}`}
              className={`replay-char ${charClass}`}
            >
              {char}
            </span>
          );
        })}
      </span>
    );
  };

  return (
    <div className="result-screen">
      <h1>{title}</h1>

      <div className="stat-showcase">
        <div className="stat-card stat-card-accent">
          <span className="stat-label">Speed</span>
          <strong className="stat-value">{wpm}</strong>
          <span className="stat-suffix">WPM</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Accuracy</span>
          <strong className="stat-value">{accuracy}</strong>
          <span className="stat-suffix">%</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Time</span>
          <strong className="stat-value">{Number(totalTime || 0).toFixed(1)}</strong>
          <span className="stat-suffix">s</span>
        </div>
      </div>

      <div
        className={[
          "replay",
          "text-scroll",
          "text-scroll-result",
          "replay-scrollable",
          replayClassName,
        ].join(" ")}
        style={{
          maxHeight: `calc(1.8em * ${replayMaxLines} + 36px)`,
        }}
      >
        {replayText
          ? <div className="replay-text-content">{replayText}</div>
          : words.map((word, index) => renderReplayWord(word, index))}
      </div>

      <TrainingInteractiveChart words={words} className="chart-container-large" />

      <div className="result-actions">
        {secondaryActionLabel && onSecondaryAction && (
          <button className="result-btn result-btn-secondary" onClick={onSecondaryAction}>
            {secondaryActionLabel}
          </button>
        )}

        {primaryActionLabel && onPrimaryAction && (
          <button className="result-btn result-btn-primary" onClick={onPrimaryAction}>
            {primaryActionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export default ResultScreen;
