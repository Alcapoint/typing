import { useEffect, useMemo, useState } from "react";
import api from "./api";
import TrainingInteractiveChart from "./TrainingInteractiveChart";
import { formatDateTime } from "./utils/date";

function getDisplayName(item) {
  const fullName = [item.first_name, item.last_name].filter(Boolean).join(" ").trim();
  return fullName || item.username;
}

function StatBadge({ label, value, suffix, accent = false }) {
  return (
    <div className={`stat-badge ${accent ? "stat-badge-accent" : ""}`}>
      <span className="stat-badge-label">{label}</span>
      <div className="stat-badge-value-row">
        <strong className="stat-badge-value">{value}</strong>
        {suffix ? <span className="stat-badge-suffix">{suffix}</span> : null}
      </div>
    </div>
  );
}

function TrainingSnapshotCard({ item, index }) {
  return (
    <div className="mini-training-card">
      <div className="mini-training-header">
        <span className="mini-training-rank">#{index + 1}</span>
        <span className="mini-training-date">{formatDateTime(item.created_at)}</span>
      </div>

      <div className="mini-training-stats">
        <StatBadge label="Speed" value={item.speed} suffix="WPM" accent={index === 0} />
        <StatBadge label="Accuracy" value={item.accuracy} suffix="%" />
        <StatBadge label="Time" value={Number(item.total_time || 0).toFixed(1)} suffix="s" />
      </div>

      <div className="mini-training-meta">
        <span>{item.language?.flag_emoji || "🌐"} {item.language?.native_name || "Не указан"}</span>
      </div>
    </div>
  );
}

function LeaderboardProfileModal({ detail, loading, onClose }) {
  const user = detail?.user;
  const favoriteLanguage = detail?.favorite_language;
  const topTrainings = detail?.top_trainings || [];
  const bestTraining = detail?.best_training;

  return (
    <div className="leaderboard-modal-backdrop" onClick={onClose}>
      <div className="leaderboard-modal" onClick={(event) => event.stopPropagation()}>
        <button
          className="leaderboard-modal-close"
          type="button"
          onClick={onClose}
          aria-label="Закрыть карточку пользователя"
        >
          ×
        </button>

        {loading ? (
          <div className="page-card">Загрузка профиля участника...</div>
        ) : detail ? (
          <>
            <div className="leaderboard-profile-hero">
              <div className="leaderboard-avatar">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.username} />
                ) : (
                  <span>{(user?.username || "?").slice(0, 1).toUpperCase()}</span>
                )}
              </div>

              <div className="leaderboard-profile-copy">
                <p className="profile-kicker">Профиль участника</p>
                <h2>{getDisplayName(user || {})}</h2>
                <span className="leaderboard-username">@{user?.username}</span>
              </div>
            </div>

            <div className="stat-showcase">
              <div className="stat-card stat-card-accent">
                <span className="stat-label">Trainings</span>
                <strong className="stat-value">{detail.total_trainings}</strong>
                <span className="stat-suffix">total</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Favorite Language</span>
                <strong className="stat-value stat-value-small">
                  {favoriteLanguage ? `${favoriteLanguage.flag_emoji} ${favoriteLanguage.native_name}` : "—"}
                </strong>
                <span className="stat-suffix">
                  {favoriteLanguage ? `${favoriteLanguage.training_count} trainings` : "no data"}
                </span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Best Result</span>
                <strong className="stat-value">{bestTraining?.speed || "—"}</strong>
                <span className="stat-suffix">WPM</span>
              </div>
            </div>

            <div className="leaderboard-modal-grid">
              <div className="leaderboard-panel">
                <div className="panel-heading">
                  <h3>Топ-3 тренировки</h3>
                  <p>Лучшие результаты из истории пользователя.</p>
                </div>
                <div className="mini-training-list">
                  {topTrainings.map((item, index) => (
                    <TrainingSnapshotCard key={item.id} item={item} index={index} />
                  ))}
                </div>
              </div>

              <div className="leaderboard-panel">
                <div className="panel-heading">
                  <h3>Лучшая тренировка</h3>
                  <p>Интерактивный график лучшего результата.</p>
                </div>

                {bestTraining ? (
                  <>
                    <div className="leaderboard-best-meta">
                      <span>{bestTraining.language?.flag_emoji || "🌐"} {bestTraining.language?.native_name || "Не указан"}</span>
                      <span>{formatDateTime(bestTraining.created_at)}</span>
                    </div>
                    <TrainingInteractiveChart
                      words={bestTraining.words || []}
                      className="leaderboard-chart"
                    />
                  </>
                ) : (
                  <div className="page-card">У пользователя пока нет сохранённых тренировок.</div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="page-card">Не удалось загрузить карточку пользователя.</div>
        )}
      </div>
    </div>
  );
}

function LeaderboardPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    api
      .getLeaderboard()
      .then((data) => {
        setItems(data);
      })
      .catch(() => {
        setError("Не удалось загрузить лидерборд.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedUserId) {
      return;
    }

    setDetailLoading(true);
    setDetail(null);

    api
      .getLeaderboardUserDetail(selectedUserId)
      .then((data) => {
        setDetail(data);
      })
      .catch(() => {
        setDetail(null);
      })
      .finally(() => setDetailLoading(false));
  }, [selectedUserId]);

  const topThreeIds = useMemo(
    () => new Set(items.slice(0, 3).map((item) => item.user_id)),
    [items]
  );

  if (loading) {
    return <div className="page-card">Загрузка лидерборда...</div>;
  }

  if (error) {
    return <div className="page-card">{error}</div>;
  }

  return (
    <>
      <div className="leaderboard-page">
        <div className="page-card">
          <h2>Leaderboard</h2>
          <p className="page-muted">
            Топ участников по лучшему результату WPM. Нажмите на карточку, чтобы открыть профиль игрока.
          </p>
        </div>

        <div className="leaderboard-list">
          {items.length ? (
            items.map((item, index) => (
              <button
                key={item.user_id}
                className={`leaderboard-card leaderboard-card-button ${
                  topThreeIds.has(item.user_id) ? "leaderboard-card-top" : ""
                }`}
                type="button"
                onClick={() => setSelectedUserId(item.user_id)}
              >
                <div className="leaderboard-rank">#{index + 1}</div>

                <div className="leaderboard-main">
                  <div className="leaderboard-name-row">
                    <h3 className="leaderboard-username-display">@{item.username}</h3>
                  </div>

                  <div className="leaderboard-stats">
                    <StatBadge label="Speed" value={item.speed} suffix="WPM" accent />
                    <StatBadge label="Accuracy" value={item.accuracy} suffix="%" />
                    <StatBadge label="Date" value={formatDateTime(item.date)} />
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="page-card">
              Пока в лидерборде нет результатов.
            </div>
          )}
        </div>
      </div>

      {selectedUserId ? (
        <LeaderboardProfileModal
          detail={detail}
          loading={detailLoading}
          onClose={() => setSelectedUserId(null)}
        />
      ) : null}
    </>
  );
}

export default LeaderboardPage;
