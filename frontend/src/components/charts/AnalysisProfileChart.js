import { useEffect, useState } from "react";
import { useI18n } from "../../i18n";

const getArray = (value) => (Array.isArray(value) ? value : []);

function useAnimatedValue(target, duration = 820) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let frameId = 0;
    let startedAt = 0;
    const numericTarget = Number(target || 0);

    const tick = (timestamp) => {
      if (!startedAt) {
        startedAt = timestamp;
      }

      const progress = Math.min((timestamp - startedAt) / duration, 1);
      const eased = 1 - ((1 - progress) ** 3);
      setValue(numericTarget * eased);

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    setValue(0);
    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [duration, target]);

  return value;
}

function MetricColumn({ label, value, accentClass, suffix = "" }) {
  const animatedValue = useAnimatedValue(value);
  const safeHeight = Math.max(8, Math.min(100, animatedValue));

  return (
    <div className="analysis-profile-metric-column">
      <span className="analysis-profile-metric-value">
        {Math.round(animatedValue)}
        {suffix}
      </span>
      <div className="analysis-profile-metric-track">
        <div
          className={`analysis-profile-metric-fill ${accentClass}`}
          style={{ height: `${safeHeight}%` }}
        />
      </div>
      <span className="analysis-profile-metric-label">{label}</span>
    </div>
  );
}

function ProfileRow({ row, maxSpeed }) {
  const speedPercent = maxSpeed ? (row.speed / maxSpeed) * 100 : 0;

  return (
    <div className="analysis-profile-row-card">
      <strong className="analysis-profile-row-name">{row.label}</strong>
      <div className="analysis-profile-columns">
        <MetricColumn
          label="WPM"
          value={speedPercent}
          accentClass="analysis-profile-metric-fill-speed"
        />
        <MetricColumn
          label="ACC"
          value={row.accuracy}
          accentClass="analysis-profile-metric-fill-accuracy"
        />
        <MetricColumn
          label="CLEAN"
          value={row.clean}
          accentClass="analysis-profile-metric-fill-clean"
        />
      </div>
    </div>
  );
}

function ProfileSection({ title, rows, maxSpeed }) {
  if (!rows.length) {
    return null;
  }

  return (
    <section className="analysis-profile-section-card">
      <div className="analysis-profile-section-head">
        <span className="analysis-metric-kicker">{title}</span>
      </div>

      <div className="analysis-profile-section-body">
        {rows.map((row) => (
          <ProfileRow
            key={row.key}
            row={row}
            maxSpeed={maxSpeed}
          />
        ))}
      </div>
    </section>
  );
}

function AnalysisProfileChart({ segments = [], lengthBreakdown = [] }) {
  const { t } = useI18n();
  const distanceRows = getArray(segments).map((segment) => ({
    key: `segment-${segment.label}`,
    label: ({
      start: t("result.profileSections.start"),
      middle: t("result.profileSections.middle"),
      finish: t("result.profileSections.finish"),
    }[segment.label] || segment.label),
    speed: Number(segment.avg_wpm || 0),
    accuracy: Number(segment.avg_accuracy || 0),
    clean: Number(segment.error_free_ratio_percent || 0),
  }));

  const lengthRows = getArray(lengthBreakdown).map((bucket) => ({
    key: `length-${bucket.id}`,
    label: ({
      short: t("result.profileSections.short"),
      medium: t("result.profileSections.medium"),
      long: t("result.profileSections.long"),
    }[bucket.id] || bucket.label),
    speed: Number(bucket.avg_wpm || 0),
    accuracy: Number(bucket.avg_accuracy || 0),
    clean: Number(bucket.error_free_ratio_percent || 0),
  }));

  const allRows = [...distanceRows, ...lengthRows];
  const maxSpeed = Math.max(...allRows.map((row) => row.speed), 1);

  if (!allRows.length) {
    return null;
  }

  return (
    <div className="analysis-profile-chart">
      <ProfileSection
        title={t("result.profileSections.byDistance")}
        rows={distanceRows}
        maxSpeed={maxSpeed}
      />

      <ProfileSection
        title={t("result.profileSections.byWordLength")}
        rows={lengthRows}
        maxSpeed={maxSpeed}
      />
    </div>
  );
}

export default AnalysisProfileChart;
