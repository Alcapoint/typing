import { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import api from "../../api";
import TrainingMiniChart from "../../components/charts/TrainingMiniChart";
import LoadingHint from "../../components/feedback/LoadingHint";
import { formatDateTime } from "../../utils/date";

function HistoryPage({ currentUser }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [pendingDeleteItem, setPendingDeleteItem] = useState(null);
  const history = useHistory();

  useEffect(() => {
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
        setError("Не удалось загрузить историю тренировок.");
      })
      .finally(() => setLoading(false));
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="page-card">
        <h2>История тренировок</h2>
        <p className="page-muted">
          История доступна после входа в аккаунт.
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
        <h2>История тренировок</h2>
        <p className="page-muted">
          Пока тренировок нет. Завершите хотя бы одну, и она появится здесь.
        </p>
      </div>
    );
  }

  return (
    <div className="history-page">
      <div className="page-card">
        <h2>История тренировок</h2>
        <p className="page-muted">
          Нажмите на тренировку, чтобы открыть полный результат и повторить текст.
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
                <h3 className="history-card-date">{formatDateTime(item.created_at)}</h3>
                <p className="history-text-preview">{item.training_text}</p>
              </div>
              <div className="history-card-actions">
                {item.is_personal_text ? (
                  <span className="history-personal-badge" title="Тренировка на своём тексте">
                    ✦ Свой текст
                  </span>
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
                  {deletingId === item.id ? <LoadingHint variant="button" /> : "Удалить"}
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
                <span className="stat-badge-label">Speed</span>
                <div className="stat-badge-value-row">
                  <strong className="stat-badge-value">{item.speed}</strong>
                  <span className="stat-badge-suffix">WPM</span>
                </div>
              </div>
              <div className="stat-badge">
                <span className="stat-badge-label">Accuracy</span>
                <div className="stat-badge-value-row">
                  <strong className="stat-badge-value">{item.accuracy}</strong>
                  <span className="stat-badge-suffix">%</span>
                </div>
              </div>
              <div className="stat-badge">
                <span className="stat-badge-label">Time</span>
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
              <h3>Удалить тренировку?</h3>
              <p>Запись из истории будет удалена без возможности восстановления.</p>
            </div>

            <div className="result-actions confirm-actions">
              <button
                className="result-btn result-btn-secondary"
                type="button"
                onClick={() => setPendingDeleteItem(null)}
              >
                Отмена
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
                      setPendingDeleteItem(null);
                    })
                    .catch(() => {
                      setError("Не удалось удалить тренировку.");
                    })
                    .finally(() => setDeletingId(null));
                }}
              >
                {deletingId === pendingDeleteItem.id ? <LoadingHint variant="button" /> : "Удалить"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default HistoryPage;
