import { useMemo, useState } from "react";
import { useI18n } from "../../i18n";
import { getTextSizeLabel } from "../../pages/trainer/trainerHelpers";

const getTextTypeLabel = (training, t) => {
  if (training?.is_personal_text) {
    return t("trainer.textTypes.user");
  }

  if (training?.text_type === "replay") {
    return t("trainingMeta.values.replayTextType");
  }

  const resolvedLabel = t(`trainer.textTypes.${training?.text_type || "custom"}`);
  return resolvedLabel.startsWith("trainer.textTypes.")
    ? (training?.text_type || t("trainer.text"))
    : resolvedLabel;
};

const getModeLabel = (training, t) => {
  const resolvedLabel = t(`trainer.trainingModes.${training?.mode || "standard"}`);
  return resolvedLabel.startsWith("trainer.trainingModes.")
    ? (training?.mode || t("trainer.mode"))
    : resolvedLabel;
};

const getSizeLabel = (training, locale) => {
  const requestedSize = Number(training?.requested_size || 0);
  if (!requestedSize) {
    return "";
  }

  const baseTextType = (
    training?.text_type && training.text_type !== "replay" && training.text_type !== "user"
      ? training.text_type
      : "custom"
  );

  return getTextSizeLabel(baseTextType, requestedSize, locale).replace(/^≈\s*/u, "");
};

export const getTrainingSettingItems = (training, t, locale) => {
  if (!training) {
    return [];
  }

  const items = [];

  if (training.language?.native_name || training.language?.code) {
    items.push({
      label: t("trainingMeta.labels.language"),
      value: `${training.language?.flag_emoji || "🌐"} ${training.language?.native_name || training.language?.code}`,
    });
  }

  items.push({
    label: t("trainingMeta.labels.textType"),
    value: getTextTypeLabel(training, t),
  });

  if (training.mode) {
    items.push({
      label: t("trainingMeta.labels.mode"),
      value: getModeLabel(training, t),
    });
  }

  if (training.requested_size) {
    items.push({
      label: t("trainingMeta.labels.size"),
      value: getSizeLabel(training, locale),
    });
  }

  if (training.is_personal_text && training.user_text_title) {
    items.push({
      label: t("trainingMeta.labels.source"),
      value: training.user_text_title,
    });
  }

  return items.filter((item) => item.value);
};

export function TrainingSettingsSummary({
  training,
  className = "",
  compact = false,
}) {
  const { locale, t } = useI18n();
  const items = useMemo(
    () => getTrainingSettingItems(training, t, locale),
    [locale, t, training]
  );

  if (!items.length) {
    return null;
  }

  return (
    <div
      className={[
        "training-meta",
        compact ? "training-meta-compact" : "",
        className,
      ].join(" ").trim()}
    >
      {items.map((item) => (
        <span
          key={`${item.label}-${item.value}`}
          className="training-meta-chip"
        >
          <span className="training-meta-chip-label">{item.label}</span>
          <span className="training-meta-chip-value">{item.value}</span>
        </span>
      ))}
    </div>
  );
}

export function TrainingTextButton({
  text = "",
  title = "",
  subtitle = "",
  buttonClassName = "",
  onOpen,
}) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  if (!text) {
    return null;
  }

  return (
    <>
      <button
        className={["training-text-button", buttonClassName].join(" ").trim()}
        type="button"
        aria-label={t("trainingMeta.openTextAria")}
        onClick={(event) => {
          event.stopPropagation();
          onOpen?.(event);
          setIsOpen(true);
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M6 6.75h12M6 11.25h12M6 15.75h8.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
        <span>{t("trainingMeta.openText")}</span>
      </button>

      {isOpen ? (
        <div
          className="confirm-modal-backdrop"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="training-text-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panel-heading">
              <h3>{title || t("trainingMeta.fullTextTitle")}</h3>
              {subtitle ? <p>{subtitle}</p> : <p>{t("trainingMeta.fullTextSubtitle")}</p>}
            </div>

            <div className="training-text-modal-content">
              {text}
            </div>

            <div className="result-actions confirm-actions">
              <button
                className="result-btn result-btn-secondary"
                type="button"
                onClick={() => setIsOpen(false)}
              >
                {t("comparison.close")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
