import { useEffect, useState } from "react";
import { useHistory, useParams } from "react-router-dom";
import api from "../../api";
import LoadingHint from "../../components/feedback/LoadingHint";
import { useI18n } from "../../i18n";
import ResultScreen from "../../components/result/ResultScreen";
import { formatDateTime } from "../../utils/date";

function TrainingDetailPage({ currentUser }) {
  const { locale, t } = useI18n();
  const { id } = useParams();
  const history = useHistory();
  const [training, setTraining] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    api
      .getTrainingDetail(id)
      .then((data) => {
        setTraining(data);
      })
      .catch(() => {
        setError(t("trainingDetail.loadError"));
      })
      .finally(() => setLoading(false));
  }, [currentUser, id, t]);

  const handleRepeat = () => {
    history.push("/", {
      replayTraining: training,
    });
  };

  if (!currentUser) {
    return (
      <div className="page-card">
        <h2>{t("trainingDetail.title")}</h2>
        <p className="page-muted">
          {t("trainingDetail.loginRequired")}
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

  if (error || !training) {
    return <div className="page-card">{error || t("trainingDetail.notFound")}</div>;
  }

  return (
    <ResultScreen
      title={training.is_personal_text ? t("trainingDetail.historyOwnText") : t("trainingDetail.history")}
      subtitle={formatDateTime(training.created_at, locale)}
      words={training.words}
      totalTime={Number(training.total_time || 0)}
      wpm={training.speed}
      accuracy={training.accuracy}
      analysis={training.analysis}
      fixedScreen
      replayMaxLines={5}
      replayClassName="history-detail-replay"
      primaryActionLabel={t("trainingDetail.repeat")}
      onPrimaryAction={handleRepeat}
      secondaryActionLabel={t("trainingDetail.backToHistory")}
      onSecondaryAction={() => history.push("/history")}
    />
  );
}

export default TrainingDetailPage;
