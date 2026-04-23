import { useEffect, useState } from "react";
import { useHistory, useParams } from "react-router-dom";
import api from "../../api";
import LoadingHint from "../../components/feedback/LoadingHint";
import ResultScreen from "../../components/result/ResultScreen";

function TrainingDetailPage({ currentUser }) {
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
        setError("Не удалось загрузить тренировку.");
      })
      .finally(() => setLoading(false));
  }, [currentUser, id]);

  const handleRepeat = () => {
    history.push("/", {
      replayTraining: training,
    });
  };

  if (!currentUser) {
    return (
      <div className="page-card">
        <h2>Тренировка</h2>
        <p className="page-muted">
          Детали тренировки доступны только после входа в аккаунт.
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
    return <div className="page-card">{error || "Тренировка не найдена."}</div>;
  }

  return (
    <ResultScreen
      title={training.is_personal_text ? "История тренировки • Свой текст" : "История тренировки"}
      words={training.words}
      replayText={training.training_text}
      totalTime={Number(training.total_time || 0)}
      wpm={training.speed}
      accuracy={training.accuracy}
      replayMaxLines={5}
      replayClassName="history-detail-replay"
      primaryActionLabel="Повторить тренировку"
      onPrimaryAction={handleRepeat}
      secondaryActionLabel="К истории"
      onSecondaryAction={() => history.push("/history")}
    />
  );
}

export default TrainingDetailPage;
