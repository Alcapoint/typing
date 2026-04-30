import { useEffect, useMemo, useState } from "react";
import api from "../../api";
import TrainingInteractiveChart from "../../components/charts/TrainingInteractiveChart";
import LoadingHint from "../../components/feedback/LoadingHint";
import { useI18n } from "../../i18n";
import { formatDateTime } from "../../utils/date";

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

function LeaderboardMetaBadge({ label, value, accent = false }) {
  return (
    <div className={`stat-badge ${accent ? "stat-badge-accent" : ""}`}>
      <span className="stat-badge-label">{label}</span>
      <div className="stat-badge-value-row">
        <strong className="stat-badge-value leaderboard-meta-value">{value}</strong>
      </div>
    </div>
  );
}

function TrainingSnapshotCard({ item, index, locale, t }) {
  const speedLabel = t("result.focusLabels.speed");
  const accuracyLabel = t("comparison.metrics.accuracy");
  const timeLabel = t("comparison.metrics.time");
  return (
    <div className="mini-training-card">
      <div className="mini-training-header">
        <span className="mini-training-rank">#{index + 1}</span>
        <span className="mini-training-date">{formatDateTime(item.created_at, locale)}</span>
      </div>

      <div className="mini-training-stats">
        <StatBadge label={speedLabel} value={item.speed} suffix="WPM" accent={index === 0} />
        <StatBadge label={accuracyLabel} value={item.accuracy} suffix="%" />
        <StatBadge label={timeLabel} value={Number(item.total_time || 0).toFixed(1)} suffix="s" />
      </div>

      <div className="mini-training-meta">
        <span>{item.language?.flag_emoji || "🌐"} {item.language?.native_name || t("leaderboard.languageMissing")}</span>
      </div>
    </div>
  );
}

function LeaderboardProfileModal({ detail, loading, onClose }) {
  const { locale, t } = useI18n();
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
          aria-label={t("leaderboard.closeProfileAria")}
        >
          ×
        </button>

        {loading ? (
          <div className="page-card">
            <LoadingHint variant="page" />
          </div>
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
                <p className="profile-kicker">{t("leaderboard.profileTitle")}</p>
                <h2>{getDisplayName(user || {})}</h2>
                <span className="leaderboard-username">@{user?.username}</span>
              </div>
            </div>

            <div className="stat-showcase">
              <div className="stat-card stat-card-accent">
                <span className="stat-label">{t("leaderboard.trainings")}</span>
                <strong className="stat-value">{detail.total_trainings}</strong>
                <span className="stat-suffix">{t("leaderboard.total")}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">{t("leaderboard.favoriteLanguage")}</span>
                <strong className="stat-value stat-value-small">
                  {favoriteLanguage ? `${favoriteLanguage.flag_emoji} ${favoriteLanguage.native_name}` : "—"}
                </strong>
                <span className="stat-suffix">
                  {favoriteLanguage ? t("leaderboard.trainingsCount", { count: favoriteLanguage.training_count }) : t("leaderboard.noData")}
                </span>
              </div>
              <div className="stat-card">
                <span className="stat-label">{t("leaderboard.bestResult")}</span>
                <strong className="stat-value">{bestTraining?.speed || "—"}</strong>
                <span className="stat-suffix">WPM</span>
              </div>
            </div>

            <div className="leaderboard-modal-grid">
              <div className="leaderboard-panel">
                <div className="panel-heading">
                  <h3>{t("leaderboard.topTrainings")}</h3>
                  <p>{t("leaderboard.topTrainingsBody")}</p>
                </div>
                <div className="mini-training-list">
                  {topTrainings.map((item, index) => (
                    <TrainingSnapshotCard key={item.id} item={item} index={index} locale={locale} t={t} />
                  ))}
                </div>
              </div>

              <div className="leaderboard-panel">
                <div className="panel-heading">
                  <h3>{t("leaderboard.bestTraining")}</h3>
                  <p>{t("leaderboard.bestTrainingBody")}</p>
                </div>

                {bestTraining ? (
                  <>
                    <div className="leaderboard-best-meta">
                      <span>{bestTraining.language?.flag_emoji || "🌐"} {bestTraining.language?.native_name || t("leaderboard.languageMissing")}</span>
                      <span>{formatDateTime(bestTraining.created_at, locale)}</span>
                    </div>
                    <TrainingInteractiveChart
                      words={bestTraining.words || []}
                      className="leaderboard-chart"
                    />
                  </>
                ) : (
                  <div className="page-card">{t("leaderboard.noSavedTrainings")}</div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="page-card">{t("leaderboard.loadCardError")}</div>
        )}
      </div>
    </div>
  );
}

function LeaderboardPage() {
  const { locale, t } = useI18n();
  const speedLabel = t("result.focusLabels.speed");
  const accuracyLabel = t("comparison.metrics.accuracy");
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
        setError(t("leaderboard.loadLeaderboardError"));
      })
      .finally(() => setLoading(false));
  }, [t]);

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
    return (
      <div className="page-card">
        <LoadingHint variant="page" />
      </div>
    );
  }

  if (error) {
    return <div className="page-card">{error}</div>;
  }

  return (
    <>
      <div className="leaderboard-page">
        <div className="page-card">
          <h2>{t("leaderboard.title")}</h2>
          <p className="page-muted">
            {t("leaderboard.intro")}
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
                <div className="leaderboard-main">
                  <div className="leaderboard-card-header">
                    <div className="leaderboard-card-avatar" aria-hidden="true">
                      {item.avatar ? (
                        <img src={item.avatar} alt="" />
                      ) : (
                        <span>{(item.username || "?").slice(0, 1).toUpperCase()}</span>
                      )}
                    </div>

                    <p className="leaderboard-username-display">@{item.username}</p>
                  </div>

                  <div className="leaderboard-stats">
                    <LeaderboardMetaBadge label={t("leaderboard.place")} value={`#${index + 1}`} />
                    <StatBadge label={speedLabel} value={item.speed} suffix="WPM" accent />
                    <StatBadge label={accuracyLabel} value={item.accuracy} suffix="%" />
                  </div>

                  <div className="leaderboard-name-row">
                    <span className="leaderboard-date-chip">{formatDateTime(item.date, locale)}</span>
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="page-card">
              {t("leaderboard.noResults")}
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
