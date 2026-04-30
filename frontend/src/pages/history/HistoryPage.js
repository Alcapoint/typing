import { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import api from "../../api";
import TrainingMiniChart from "../../components/charts/TrainingMiniChart";
import LoadingHint from "../../components/feedback/LoadingHint";
import { useI18n } from "../../i18n";
import {
  addComparisonTrainingId,
  getComparisonTrainingIds,
  saveComparisonTrainingIds,
} from "../../utils/comparison";
import { formatDateTime } from "../../utils/date";

function HistoryPage({ currentUser }) {
  const { locale, t } = useI18n();
  const speedLabel = t("result.focusLabels.speed");
  const accuracyLabel = t("comparison.metrics.accuracy");
  const timeLabel = t("comparison.metrics.time");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [comparisonIds, setComparisonIds] = useState([]);
  const [deletingId, setDeletingId] = useState(null);
  const [pendingDeleteItem, setPendingDeleteItem] = useState(null);
  const history = useHistory();

  useEffect(() => {
    setComparisonIds(getComparisonTrainingIds());

    if (!currentUser) {
      setLoading(false);
      return;
    }

    api
      .getTrainingHistory()
      .then((data) => {
        setItems(data);
      })
      .catch(() => {
        setError(t("history.errorLoad"));
      })
      .finally(() => setLoading(false));
  }, [currentUser, t]);

  const handleAddToComparison = (item) => {
    const result = addComparisonTrainingId(item.id);
    setComparisonIds(result.ids);
  };

  if (!currentUser) {
    return (
      <div className="page-card">
        <h2>{t("history.title")}</h2>
        <p className="page-muted">
          {t("history.loginRequired")}
        </p>
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

  if (!items.length) {
    return (
      <div className="page-card">
        <h2>{t("history.title")}</h2>
        <p className="page-muted">
          {t("history.empty")}
        </p>
      </div>
    );
  }

  return (
    <div className="history-page">
      <div className="page-card">
        <h2>{t("history.title")}</h2>
        <p className="page-muted">
          {t("history.intro")}
        </p>
      </div>

      <div className="history-list">
        {items.map((item) => (
          <div
            key={item.id}
            className="history-card"
            onClick={() => history.push(`/history/${item.id}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                history.push(`/history/${item.id}`);
              }
            }}
          >
            <div className="history-card-top">
              <div>
                <h3 className="history-card-date">{formatDateTime(item.created_at, locale)}</h3>
                <p className="history-text-preview">{item.training_text}</p>
              </div>
              <div className="history-card-actions">
                {item.is_personal_text ? (
                  <span className="history-personal-badge" title={t("history.ownTextTitle")}>
                    {t("history.ownTextBadge")}
                  </span>
                ) : null}
                {!comparisonIds.includes(item.id) ? (
                  <button
                    className="history-delete-btn"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleAddToComparison(item);
                    }}
                  >
                    {t("history.compare")}
                  </button>
                ) : null}
                <button
                  className="history-delete-btn"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setPendingDeleteItem(item);
                  }}
                  disabled={deletingId === item.id}
                >
                  {deletingId === item.id ? <LoadingHint variant="button" /> : t("history.delete")}
                </button>
              </div>
            </div>

            <div className="history-stats">
              {item.analysis ? (
                <div className="stat-badge stat-badge-accent">
                  <span className="stat-badge-label">Score</span>
                  <div className="stat-badge-value-row">
                    <strong className="stat-badge-value">{item.analysis.overall_score}</strong>
                    <span className="stat-badge-suffix">/100</span>
                  </div>
                </div>
              ) : null}
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
            <div className="history-chart">
              <TrainingMiniChart words={item.words} compact />
            </div>
          </div>
        ))}
      </div>

      {pendingDeleteItem ? (
        <div className="confirm-modal-backdrop" onClick={() => setPendingDeleteItem(null)}>
          <div className="confirm-modal" onClick={(event) => event.stopPropagation()}>
            <div className="panel-heading">
              <h3>{t("history.deleteTitle")}</h3>
              <p>{t("history.deleteBody")}</p>
            </div>

            <div className="result-actions confirm-actions">
              <button
                className="result-btn result-btn-secondary"
                type="button"
                onClick={() => setPendingDeleteItem(null)}
              >
                {t("history.cancel")}
              </button>
              <button
                className="result-btn result-btn-primary"
                type="button"
                onClick={() => {
                  setDeletingId(pendingDeleteItem.id);
                  setError("");
                  api
                    .deleteTraining(pendingDeleteItem.id)
                    .then(() => {
                      setItems((prev) => prev.filter((entry) => entry.id !== pendingDeleteItem.id));
                      const nextComparisonIds = comparisonIds.map((id) => (
                        id === pendingDeleteItem.id ? null : id
                      ));
                      setComparisonIds(nextComparisonIds);
                      saveComparisonTrainingIds(nextComparisonIds);
                      setPendingDeleteItem(null);
                    })
                    .catch(() => {
                      setError(t("history.errorDelete"));
                    })
                    .finally(() => setDeletingId(null));
                }}
              >
                {deletingId === pendingDeleteItem.id ? <LoadingHint variant="button" /> : t("history.delete")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default HistoryPage;
