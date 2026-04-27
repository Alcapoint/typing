import { useEffect, useRef, useState } from "react";
import TrainingInteractiveChart from "../charts/TrainingInteractiveChart";

const getArray = (value) => (Array.isArray(value) ? value : []);
const getScoreLabel = (value) => `${Math.round(Number(value || 0))}%`;
const getSegmentLabel = (label) => ({
  start: "Старт",
  middle: "Середина",
  finish: "Финиш",
}[label] || label);
const getFocusLabel = (label) => ({
  accuracy: "точность",
  clean_run: "чистые серии",
  speed: "скорость",
  speed_control: "контроль на темпе",
  rhythm: "ровность ритма",
  endurance: "выносливость",
  recovery: "восстановление после ошибки",
  hard_words: "длинные и сложные слова",
  completion: "завершённость",
}[label] || label);
const getPositionLabel = (label) => ({
  start: "Начало слова",
  middle: "Середина слова",
  finish: "Конец слова",
}[label] || label);

function useInViewOnce(active = true) {
  const elementRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!active) {
      setIsVisible(false);
      return undefined;
    }

    if (isVisible) {
      return undefined;
    }

    const node = elementRef.current;
    if (!node) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          return;
        }
        setIsVisible(true);
        observer.disconnect();
      },
      {
        threshold: 0.24,
        rootMargin: "0px 0px -8% 0px",
      }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [active, isVisible]);

  return [elementRef, isVisible];
}

function AnalysisGauge({ score = 0, gaugeId = "metric", large = false, animate = false }) {
  const normalizedScore = Math.max(0, Math.min(100, Number(score) || 0));
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    if (!animate) {
      setAnimatedScore(0);
      return undefined;
    }

    let frameId = 0;
    let startedAt = 0;
    const duration = large ? 1200 : 950;

    const tick = (timestamp) => {
      if (!startedAt) {
        startedAt = timestamp;
      }

      const progress = Math.min((timestamp - startedAt) / duration, 1);
      const eased = 1 - ((1 - progress) ** 3);
      setAnimatedScore(normalizedScore * eased);

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [animate, gaugeId, large, normalizedScore]);

  return (
    <div className={`analysis-gauge ${large ? "analysis-gauge-large" : ""}`}>
      <div className="analysis-gauge-visual">
        <svg
          className="analysis-gauge-svg"
          viewBox={large ? "0 0 160 104" : "0 0 120 78"}
          aria-hidden="true"
        >
          <path
            className="analysis-gauge-track"
            d={large ? "M 18 86 A 62 62 0 0 1 142 86" : "M 14 64 A 46 46 0 0 1 106 64"}
            pathLength="100"
          />
          <path
            className="analysis-gauge-progress"
            d={large ? "M 18 86 A 62 62 0 0 1 142 86" : "M 14 64 A 46 46 0 0 1 106 64"}
            pathLength="100"
            style={{
              strokeDashoffset: 100 - animatedScore,
            }}
          />
        </svg>
      </div>

      <div className="analysis-gauge-score">
        <strong className="analysis-gauge-value">{Math.round(animatedScore)}</strong>
        <span className="analysis-gauge-suffix">%</span>
      </div>
    </div>
  );
}

function AnalysisReveal({
  as: Component = "div",
  active = true,
  className = "",
  children,
  ...props
}) {
  const [elementRef, isVisible] = useInViewOnce(active);

  return (
    <Component
      ref={elementRef}
      className={[
        className,
        "analysis-reveal",
        isVisible ? "visible" : "",
      ].join(" ").trim()}
      {...props}
    >
      {children}
    </Component>
  );
}

function AnalysisMetricHelp({ label, description }) {
  if (!description) {
    return null;
  }

  return (
    <div className="analysis-help-shell">
      <button
        className="analysis-help-button"
        type="button"
        aria-label={`Описание метрики ${label}`}
      >
        ?
      </button>
      <div className="analysis-help-tooltip" role="tooltip">
        {description}
      </div>
    </div>
  );
}

function AnalysisCardHeading({ title, description }) {
  return (
    <>
      <AnalysisMetricHelp label={title} description={description} />
      <div className="analysis-detail-heading">
        <h3>{title}</h3>
      </div>
    </>
  );
}

function AnalysisGaugeCard({ card, active = true }) {
  const reasons = getArray(card?.reasons);
  const [cardRef, isVisible] = useInViewOnce(active);

  return (
    <article
      ref={cardRef}
      className={`analysis-gauge-card analysis-reveal ${isVisible ? "visible" : ""}`}
    >
      <AnalysisMetricHelp label={card?.label} description={card?.headline} />
      <div className="analysis-gauge-card-top">
        <AnalysisGauge
          score={card?.score}
          gaugeId={card?.id || card?.label || "metric"}
          animate={isVisible}
        />
        <div className="analysis-gauge-copy">
          <h3>{card?.label}</h3>
        </div>
      </div>

      {reasons.length ? (
        <ul className="analysis-reason-list">
          {reasons.map((reason, index) => (
            <li key={`${card?.id || card?.label}-${index}`}>{reason}</li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

function ResultScreen({
  title = "Результат",
  words,
  replayText = "",
  totalTime,
  wpm,
  accuracy,
  analysis = null,
  analysisLoading = false,
  fixedScreen = true,
  replayMaxLines = 6,
  replayClassName = "",
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
}) {
  const [replayIndex, setReplayIndex] = useState(-1);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const replayWordRefs = useRef([]);
  const analysisPanelRef = useRef(null);
  const [heroRef, isHeroVisible] = useInViewOnce(Boolean(analysis) && isAnalysisOpen);
  const closeResultScreen = onSecondaryAction || onPrimaryAction || null;

  const strengths = getArray(analysis?.strengths);
  const painPoints = getArray(analysis?.pain_points);
  const recommendations = getArray(analysis?.recommendations);
  const scorecards = getArray(analysis?.metrics?.scorecards);
  const difficultWords = getArray(analysis?.metrics?.difficult_words).slice(0, 5);
  const strongestWords = getArray(analysis?.metrics?.strongest_words).slice(0, 5);
  const hesitationWords = getArray(analysis?.metrics?.hesitation_words).slice(0, 5);
  const rushedWords = getArray(analysis?.metrics?.rushed_words).slice(0, 5);
  const errorPatterns = getArray(analysis?.metrics?.error_patterns).slice(0, 5);
  const errorBursts = getArray(analysis?.metrics?.error_bursts).slice(0, 4);
  const segments = getArray(analysis?.metrics?.segments);
  const lengthBreakdown = getArray(analysis?.metrics?.word_length_breakdown);
  const positionDistribution = analysis?.metrics?.error_position_distribution || {};
  const focusCard = scorecards.length
    ? scorecards.reduce((lowest, card) => (
      Number(card.score) < Number(lowest.score) ? card : lowest
    ), scorecards[0])
    : null;

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

  useEffect(() => {
    setIsAnalysisOpen(false);
  }, [analysis?.headline, words]);

  useEffect(() => {
    if (!isAnalysisOpen || !analysisPanelRef.current) {
      return undefined;
    }

    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    let firstFrameId = 0;
    let secondFrameId = 0;

    firstFrameId = window.requestAnimationFrame(() => {
      secondFrameId = window.requestAnimationFrame(() => {
        analysisPanelRef.current?.scrollIntoView({
          behavior: prefersReducedMotion ? "auto" : "smooth",
          block: "start",
          inline: "nearest",
        });
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrameId);
      window.cancelAnimationFrame(secondFrameId);
    };
  }, [isAnalysisOpen]);

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

  const renderWordInsightItem = (item, index) => (
    <li key={`${item.correct}-${item.typed}-${item.wpm}-${index}`}>
      <div className="analysis-word-headline">
        <strong>{item.correct}</strong>
        <span>{getScoreLabel(item.accuracy)}</span>
      </div>
      <div className="analysis-word-meta">
        <span>Ввод: {item.typed || "—"}</span>
        <span>{item.wpm} WPM</span>
        {"errors" in item ? <span>{item.errors} ошибок</span> : null}
        {"duration" in item ? <span>{Number(item.duration).toFixed(2)} с</span> : null}
      </div>
    </li>
  );

  return (
    <div
      className={[
        "result-screen",
        fixedScreen ? "" : "result-screen-page",
      ].join(" ").trim()}
      onClick={(event) => {
        if (event.target !== event.currentTarget || !closeResultScreen) {
          return;
        }
        closeResultScreen();
      }}
    >
      <div
        className="result-screen-body"
        onClick={(event) => event.stopPropagation()}
      >
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

        <TrainingInteractiveChart
          words={words}
          className={[
            "chart-container-large",
            isAnalysisOpen ? "chart-container-analysis-open" : "",
          ].join(" ").trim()}
        />

        {(analysisLoading || analysis) && (
          <div className="analysis-toggle-shell">
            <button
              className={`analysis-toggle ${isAnalysisOpen ? "open" : ""}`}
              type="button"
              onClick={() => setIsAnalysisOpen((prev) => !prev)}
              aria-expanded={isAnalysisOpen}
            >
              <span className="analysis-toggle-main">
                <span className="analysis-toggle-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path
                      d="M9 4a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Zm6 0a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM6.5 14a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Zm11 0a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM10.7 7.8l2.6-.1m-8.7 8.1 3-6m9.9 0 2.9 5.9m-10.1.9h4.9"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span className="analysis-toggle-label">Детальный разбор</span>
              </span>
            </button>

            <div className={`analysis-collapse ${isAnalysisOpen ? "open" : ""}`}>
              <section ref={analysisPanelRef} className="analysis-panel">
                        {analysisLoading ? (
                  <div className="analysis-loading-copy">
                    <span className="analysis-kicker">Разбор тренировки</span>
                    <h2>Формируется аналитический профиль.</h2>
                    <p className="analysis-subtitle">
                      Выполняется расчёт темпа, ритма, ошибок и структуры слов.
                    </p>
                  </div>
                ) : (
                  <>
                    <div
                      ref={heroRef}
                      className={`analysis-hero analysis-reveal ${isHeroVisible ? "visible" : ""}`}
                    >
                      <div className="analysis-hero-gauge-shell">
                        <AnalysisGauge
                          score={analysis.overall_score}
                          gaugeId="overall"
                          large
                          animate={isHeroVisible}
                        />
                      </div>

                      <div className="analysis-hero-copy">
                        <span className="analysis-kicker">Разбор тренировки</span>
                        <h2>{analysis.headline}</h2>
                        <p className="analysis-subtitle">
                          {analysis?.metrics?.coach_note || analysis?.metrics?.band_label}
                        </p>

                        <div className="analysis-facts-row">
                          <div className="analysis-fact-pill">
                            <span className="analysis-fact-label">Общий уровень</span>
                            <strong>{analysis?.metrics?.band_label}</strong>
                          </div>
                          {focusCard ? (
                            <div className="analysis-fact-pill">
                              <span className="analysis-fact-label">Зона роста</span>
                              <strong>{getFocusLabel(focusCard.id)}</strong>
                            </div>
                          ) : null}
                          <div className="analysis-fact-pill">
                            <span className="analysis-fact-label">Ошибки</span>
                            <strong>{analysis?.metrics?.total_char_errors || 0} символов</strong>
                          </div>
                          <div className="analysis-fact-pill">
                            <span className="analysis-fact-label">Чистые слова</span>
                            <strong>{getScoreLabel(analysis?.metrics?.error_free_ratio_percent)}</strong>
                          </div>
                          <div className="analysis-fact-pill">
                            <span className="analysis-fact-label">Восстановление</span>
                            <strong>{getScoreLabel(analysis?.metrics?.recovery_ratio_percent)}</strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    {scorecards.length ? (
                      <div className="analysis-gauge-grid">
                        {scorecards.map((card) => (
                          <AnalysisGaugeCard
                            key={card.id || card.label}
                            card={card}
                            active={isAnalysisOpen}
                          />
                        ))}
                      </div>
                    ) : null}

                    <div className="analysis-columns">
                      <AnalysisReveal active={isAnalysisOpen} className="analysis-block analysis-insight-block">
                        <h3>Сильные стороны</h3>
                        <ul className="analysis-list">
                          {strengths.map((item) => (
                            <li key={item.title}>
                              <strong>{item.title}</strong>
                              <span>{item.description}</span>
                            </li>
                          ))}
                        </ul>
                      </AnalysisReveal>

                      <AnalysisReveal active={isAnalysisOpen} className="analysis-block analysis-insight-block">
                        <h3>Факторы снижения оценки</h3>
                        <ul className="analysis-list">
                          {painPoints.map((item) => (
                            <li key={item.title}>
                              <strong>{item.title}</strong>
                              <span>{item.description}</span>
                            </li>
                          ))}
                        </ul>
                      </AnalysisReveal>
                    </div>

                    <AnalysisReveal active={isAnalysisOpen} className="analysis-block analysis-insight-block">
                      <h3>Рекомендации</h3>
                      <ul className="analysis-list">
                        {recommendations.map((item) => (
                          <li key={item.title}>
                            <strong>{item.title}</strong>
                            <span>{item.description}</span>
                          </li>
                        ))}
                      </ul>
                    </AnalysisReveal>
 
                    <div className="analysis-detail-grid">
                      {strongestWords.length ? (
                        <AnalysisReveal active={isAnalysisOpen} className="analysis-detail-card">
                          <AnalysisCardHeading
                            title="Лучшие слова"
                            description="Слова с наиболее стабильным сочетанием темпа и точности."
                          />
                          <ul className="analysis-word-list">
                            {strongestWords.map((item, index) => renderWordInsightItem(item, index))}
                          </ul>
                        </AnalysisReveal>
                      ) : null}

                      {difficultWords.length ? (
                        <AnalysisReveal active={isAnalysisOpen} className="analysis-detail-card">
                          <AnalysisCardHeading
                            title="Проблемные слова"
                            description="Слова с наибольшим вкладом в снижение итоговой оценки."
                          />
                          <ul className="analysis-word-list">
                            {difficultWords.map((item, index) => renderWordInsightItem(item, index))}
                          </ul>
                        </AnalysisReveal>
                      ) : null}

                      {hesitationWords.length ? (
                        <AnalysisReveal active={isAnalysisOpen} className="analysis-detail-card">
                          <AnalysisCardHeading
                            title="Осторожный набор"
                            description="Слова без ошибок, где темп ниже текущего рабочего уровня."
                          />
                          <ul className="analysis-word-list">
                            {hesitationWords.map((item, index) => renderWordInsightItem(item, index))}
                          </ul>
                        </AnalysisReveal>
                      ) : null}

                      {rushedWords.length ? (
                        <AnalysisReveal active={isAnalysisOpen} className="analysis-detail-card">
                          <AnalysisCardHeading
                            title="Избыточное ускорение"
                            description="Слова, где рост темпа сопровождался ошибками."
                          />
                          <ul className="analysis-word-list">
                            {rushedWords.map((item, index) => renderWordInsightItem(item, index))}
                          </ul>
                        </AnalysisReveal>
                      ) : null}

                      {errorPatterns.length ? (
                        <AnalysisReveal active={isAnalysisOpen} className="analysis-detail-card">
                          <AnalysisCardHeading
                            title="Повторяющиеся ошибки"
                            description="Повторяющиеся замены символов в пределах одной тренировки."
                          />
                          <ul className="analysis-pattern-list">
                            {errorPatterns.map((pattern) => (
                              <li key={pattern.label}>
                                <div className="analysis-pattern-top">
                                  <strong>{pattern.label}</strong>
                                  <span>{pattern.count} раз</span>
                                </div>
                                <div className="analysis-pattern-examples">
                                  {getArray(pattern.examples).map((example, index) => (
                                    <span key={`${pattern.label}-${index}`}>
                                      {example.correct} -> {example.typed || "—"}
                                    </span>
                                  ))}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </AnalysisReveal>
                      ) : null}

                      {errorBursts.length ? (
                        <AnalysisReveal active={isAnalysisOpen} className="analysis-detail-card">
                          <AnalysisCardHeading
                            title="Серии ошибок"
                            description="Последовательности слов с несколькими ошибками подряд."
                          />
                          <ul className="analysis-burst-list">
                            {errorBursts.map((burst, index) => (
                              <li key={`${burst.words.join("-")}-${index}`}>
                                <strong>{burst.words.join(" • ")}</strong>
                                <span>{burst.words_count} слова подряд</span>
                                <span>{burst.avg_wpm} WPM · {getScoreLabel(burst.avg_accuracy)}</span>
                              </li>
                            ))}
                          </ul>
                        </AnalysisReveal>
                      ) : null}
                    </div>

                    <div className="analysis-summary-grid">
                      {segments.length ? (
                        <AnalysisReveal active={isAnalysisOpen} className="analysis-detail-card">
                          <AnalysisCardHeading
                            title="Динамика по дистанции"
                            description="Сравнение старта, середины и финиша."
                          />
                          <div className="analysis-segment-row">
                            {segments.map((segment) => (
                              <div key={segment.label} className="analysis-segment-card">
                                <span className="analysis-segment-label">{getSegmentLabel(segment.label)}</span>
                                <strong>{segment.avg_wpm} WPM</strong>
                                <span>{getScoreLabel(segment.avg_accuracy)} точность</span>
                                <span>{getScoreLabel(segment.error_free_ratio_percent)} слов без ошибок</span>
                                <span>Сложное слово: {segment.hardest_word.correct}</span>
                              </div>
                            ))}
                          </div>
                        </AnalysisReveal>
                      ) : null}

                      {lengthBreakdown.length ? (
                        <AnalysisReveal active={isAnalysisOpen} className="analysis-detail-card">
                          <AnalysisCardHeading
                            title="Слова по длине"
                            description="Сравнение коротких, средних и длинных слов."
                          />
                          <div className="analysis-length-grid">
                            {lengthBreakdown.map((bucket) => (
                              <div key={bucket.id} className="analysis-length-card">
                                <span className="analysis-metric-kicker">{bucket.label}</span>
                                <strong>{getScoreLabel(bucket.avg_accuracy)}</strong>
                                <span>{bucket.avg_wpm} WPM</span>
                                <span>{getScoreLabel(bucket.error_free_ratio_percent)} чистых слов</span>
                              </div>
                            ))}
                          </div>
                        </AnalysisReveal>
                      ) : null}

                      {Object.keys(positionDistribution).length ? (
                        <AnalysisReveal active={isAnalysisOpen} className="analysis-detail-card">
                          <AnalysisCardHeading
                            title="Зоны ошибок внутри слова"
                            description="Распределение ошибок по началу, середине и концу слова."
                          />
                          <div className="analysis-position-grid">
                            {["start", "middle", "finish"].map((zone) => (
                              <div key={zone} className="analysis-position-card">
                                <span className="analysis-metric-kicker">{getPositionLabel(zone)}</span>
                                <strong>{getScoreLabel(positionDistribution?.[zone]?.percent)}</strong>
                                <span>{positionDistribution?.[zone]?.count || 0} ошибок</span>
                              </div>
                            ))}
                          </div>
                        </AnalysisReveal>
                      ) : null}
                    </div>
                  </>
                )}
              </section>
            </div>
          </div>
        )}

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
    </div>
  );
}

export default ResultScreen;
