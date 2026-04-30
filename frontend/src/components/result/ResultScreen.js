import { useEffect, useRef, useState } from "react";
import AnalysisProfileChart from "../charts/AnalysisProfileChart";
import TrainingInteractiveChart from "../charts/TrainingInteractiveChart";
import { useI18n } from "../../i18n";
import { localizeAnalysis } from "../../utils/analysisI18n";

const getArray = (value) => (Array.isArray(value) ? value : []);
const getScoreLabel = (value) => `${Math.round(Number(value || 0))}%`;
const getFocusLabel = (label, t) => t(`result.focusLabels.${label}`) || label;

const getDerivedSpeedMetrics = (words = [], totalTime = 0) => {
  const totalTimeValue = Number(totalTime || 0);
  if (!words.length || !totalTimeValue) {
    return {
      wpm: 0,
      rwpm: 0,
      burst: 0,
    };
  }

  let correctCharsWithSpaces = 0;
  let rawCharsWithSpaces = 0;
  let burstChars = 0;

  words.forEach((word, index) => {
    const correct = String(word.correct || "");
    const typed = String(word.typed || "");
    const separator = index < words.length - 1 ? 1 : 0;
    rawCharsWithSpaces += typed.length + separator;
    burstChars += Math.max(correct.length, typed.length, 1);
    if (typed === correct) {
      correctCharsWithSpaces += correct.length + separator;
    }
  });

  const minutes = totalTimeValue / 60;

  return {
    wpm: minutes ? Math.round((correctCharsWithSpaces / 5) / minutes) : 0,
    rwpm: minutes ? Math.round((rawCharsWithSpaces / 5) / minutes) : 0,
    burst: minutes ? Math.round((burstChars / 5) / minutes) : 0,
  };
};

function AnimatedMetricValue({ value = 0, digits = 0, animateKey = "" }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let frameId = 0;
    let startedAt = 0;
    const duration = 1450;
    const target = Number(value || 0);

    const tick = (timestamp) => {
      if (!startedAt) {
        startedAt = timestamp;
      }

      const progress = Math.min((timestamp - startedAt) / duration, 1);
      const eased = 1 - ((1 - progress) ** 3);
      setDisplayValue(target * eased);

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    setDisplayValue(0);
    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [animateKey, value]);

  return digits > 0
    ? displayValue.toFixed(digits)
    : Math.round(displayValue);
}

function ResultStatInline({
  label,
  value,
  digits = 0,
  animateKey = "",
  suffix = "",
  description = "",
}) {
  return (
    <div className="stat-card stat-card-inline stat-card-inline-help">
      <span className="stat-label">{label}</span>
      <strong className="stat-value">
        <AnimatedMetricValue value={value} digits={digits} animateKey={animateKey} />
      </strong>
      {suffix ? <span className="stat-suffix">{suffix}</span> : null}
      {description ? <div className="stat-help-tooltip">{description}</div> : null}
    </div>
  );
}

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
  const { t } = useI18n();

  if (!description) {
    return null;
  }

  return (
    <div className="analysis-help-shell">
      <button
        className="analysis-help-button"
        type="button"
        aria-label={t("result.metricAria", { label })}
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
  title,
  subtitle = "",
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
  const { locale, t } = useI18n();
  const [replayIndex, setReplayIndex] = useState(-1);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const replayWordRefs = useRef([]);
  const analysisPanelRef = useRef(null);
  const [heroRef, isHeroVisible] = useInViewOnce(Boolean(analysis) && isAnalysisOpen);
  const closeResultScreen = onSecondaryAction || onPrimaryAction || null;
  const resolvedTitle = title || t("result.title");
  const localizedAnalysis = localizeAnalysis(analysis, locale);
  const derivedSpeedMetrics = getDerivedSpeedMetrics(words, totalTime);
  const displayWpm = words.length ? derivedSpeedMetrics.wpm : Number(wpm || 0);
  const displayRwpm = derivedSpeedMetrics.rwpm;
  const displayBurst = derivedSpeedMetrics.burst;
  const metricAnimationKey = `${resolvedTitle}-${words.length}-${Number(totalTime || 0)}`;

  const summaryCards = getArray(localizedAnalysis?.metrics?.summary_cards);
  const segments = getArray(localizedAnalysis?.metrics?.segments);
  const lengthBreakdown = getArray(localizedAnalysis?.metrics?.word_length_breakdown);
  const focusCard = summaryCards.length
    ? summaryCards.reduce((lowest, card) => (
      Number(card.score) < Number(lowest.score) ? card : lowest
    ), summaryCards[0])
    : null;
  const recoveryExamples = localizedAnalysis?.metrics?.recovery_examples || {};
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
  }, [localizedAnalysis?.headline, words]);

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
        <h1>{resolvedTitle}</h1>
        {subtitle ? <p className="result-subtitle">{subtitle}</p> : null}

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

        <div className="stat-showcase">
          <ResultStatInline
            label="WPM"
            value={displayWpm}
            animateKey={`${metricAnimationKey}-wpm`}
            description={t("result.wpmDescription")}
          />
          <ResultStatInline
            label="rWPM"
            value={displayRwpm}
            animateKey={`${metricAnimationKey}-rwpm`}
            description={t("result.rwpmDescription")}
          />
          <ResultStatInline
            label="BURST"
            value={displayBurst}
            animateKey={`${metricAnimationKey}-burst`}
            description={t("result.burstDescription")}
          />
          <ResultStatInline
            label={t("result.statLabels.accuracy")}
            value={Number(accuracy || 0)}
            digits={1}
            animateKey={`${metricAnimationKey}-accuracy`}
            suffix="%"
            description={t("result.accuracyDescription")}
          />
          <ResultStatInline
            label={t("result.statLabels.time")}
            value={Number(totalTime || 0)}
            digits={1}
            animateKey={`${metricAnimationKey}-time`}
            suffix="s"
            description={t("result.timeDescription")}
          />
        </div>

        <TrainingInteractiveChart
          words={words}
          className={[
            "chart-container-large",
            isAnalysisOpen ? "chart-container-analysis-open" : "",
          ].join(" ").trim()}
        />

        {(analysisLoading || localizedAnalysis) && (
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
                <span className="analysis-toggle-label">{t("result.detailedAnalysis")}</span>
              </span>
            </button>

            <div className={`analysis-collapse ${isAnalysisOpen ? "open" : ""}`}>
              <section ref={analysisPanelRef} className="analysis-panel">
                        {analysisLoading ? (
                  <div className="analysis-loading-copy">
                    <span className="analysis-kicker">{t("result.analysisKicker")}</span>
                    <h2>{t("result.analysisPreparing")}</h2>
                    <p className="analysis-subtitle">
                      {t("result.analysisPreparingBody")}
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
                          score={localizedAnalysis.overall_score}
                          gaugeId="overall"
                          large
                          animate={isHeroVisible}
                        />
                      </div>

                      <div className="analysis-hero-copy">
                        <span className="analysis-kicker">{t("result.analysisKicker")}</span>
                        <h2>{localizedAnalysis.headline}</h2>
                        <p className="analysis-subtitle">
                          {localizedAnalysis?.metrics?.coach_note || localizedAnalysis?.metrics?.band_label}
                        </p>

                        <div className="analysis-facts-row">
                          <div className="analysis-fact-pill">
                            <span className="analysis-fact-label">{t("result.overallLevel")}</span>
                            <strong>{localizedAnalysis?.metrics?.band_label}</strong>
                          </div>
                          {focusCard ? (
                            <div className="analysis-fact-pill">
                              <span className="analysis-fact-label">{t("result.growthZone")}</span>
                              <strong>{getFocusLabel(focusCard.id, t)}</strong>
                            </div>
                          ) : null}
                          <div className="analysis-fact-pill">
                            <span className="analysis-fact-label">{t("result.cleanStreak")}</span>
                            <strong>{localizedAnalysis?.metrics?.longest_clean_streak || 0} {t("result.wordsSuffix")}</strong>
                          </div>
                          <div className="analysis-fact-pill">
                            <span className="analysis-fact-label">{t("result.cleanWords")}</span>
                            <strong>{getScoreLabel(localizedAnalysis?.metrics?.error_free_ratio_percent)}</strong>
                          </div>
                          {localizedAnalysis?.metrics?.recovery_opportunities_count ? (
                            <div className="analysis-fact-pill">
                              <span className="analysis-fact-label">{t("result.recoveryFixes")}</span>
                              <strong>{getScoreLabel(localizedAnalysis?.metrics?.self_correction_ratio_percent)}</strong>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {summaryCards.length ? (
                      <div className="analysis-gauge-grid">
                        {summaryCards.map((card) => (
                          <AnalysisGaugeCard
                            key={card.id || card.label}
                            card={card}
                            active={isAnalysisOpen}
                          />
                        ))}
                      </div>
                    ) : null}

                    {localizedAnalysis?.metrics?.recovery_opportunities_count ? (
                      <AnalysisReveal active={isAnalysisOpen} className="analysis-detail-card analysis-recovery-card">
                        <AnalysisCardHeading
                          title={t("result.recoveryTitle")}
                          description={t("result.recoveryDescription")}
                        />
                        <div className="analysis-recovery-stats">
                          <div className="analysis-fact-pill">
                            <span className="analysis-fact-label">{t("result.correctedInsideWord")}</span>
                            <strong>{getScoreLabel(localizedAnalysis?.metrics?.self_correction_ratio_percent)}</strong>
                          </div>
                          <div className="analysis-fact-pill">
                            <span className="analysis-fact-label">{t("result.stableNextWord")}</span>
                            <strong>{getScoreLabel(localizedAnalysis?.metrics?.stable_follow_up_ratio_percent)}</strong>
                          </div>
                          <div className="analysis-fact-pill">
                            <span className="analysis-fact-label">{t("result.averageSpeedDrop")}</span>
                            <strong>{localizedAnalysis?.metrics?.recovery_examples?.average_speed_drop || 0} WPM</strong>
                          </div>
                        </div>

                        {recoveryExamples.weak_examples?.length ? (
                          <div className="analysis-recovery-note">
                            {t("result.weakExamplePrefix")} <strong>{recoveryExamples.weak_examples[0].after}</strong>
                            {recoveryExamples.weak_examples[0].next
                              ? <> {t("result.weakExampleMiddle")} <strong>{recoveryExamples.weak_examples[0].next}</strong> {t("result.weakExampleSuffix")}</>
                              : <> {t("result.weakExampleNone")}</>}
                          </div>
                        ) : recoveryExamples.good_examples?.length ? (
                          <div className="analysis-recovery-note">
                            {t("result.goodExamplePrefix")} <strong>{recoveryExamples.good_examples[0].after}</strong>
                            {recoveryExamples.good_examples[0].corrected_inside_word
                              ? <> {t("result.goodExampleCorrected")}</>
                              : <> {t("result.goodExampleRecovered")}</>}
                          </div>
                        ) : null}
                      </AnalysisReveal>
                    ) : null}

                    {(segments.length || lengthBreakdown.length) ? (
                      <AnalysisReveal active={isAnalysisOpen} className="analysis-detail-card">
                        <AnalysisCardHeading
                          title={t("result.typingProfile")}
                          description={t("result.typingProfileDescription")}
                        />
                        <AnalysisProfileChart
                          segments={segments}
                          lengthBreakdown={lengthBreakdown}
                        />
                      </AnalysisReveal>
                    ) : null}
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
