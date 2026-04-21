import { useEffect, useState } from "react";
import { Link, Route, Switch, useLocation } from "react-router-dom";
import "./App.css";
import Auth from "./Auth";
import HistoryPage from "./HistoryPage";
import LeaderboardPage from "./LeaderboardPage";
import ProfilePage from "./ProfilePage";
import TrainerPage from "./TrainerPage";
import TrainingDetailPage from "./TrainingDetailPage";
import api from "./api";

const MOBILE_NOTICE_LINES = [
  "Мобильная версия недоступна.",
  "Тренажер рассчитан на работу с физической клавиатурой.",
  "Откройте сайт с ноутбука или настольного компьютера.",
];

function getIsMobileViewport() {
  if (typeof window === "undefined") {
    return false;
  }

  const hasTouch = window.matchMedia("(pointer: coarse)").matches;
  const isNarrow = window.matchMedia("(max-width: 900px)").matches;
  const mobileAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    window.navigator.userAgent
  );

  return mobileAgent || (hasTouch && isNarrow);
}

function MobileGate() {
  const [visibleText, setVisibleText] = useState("");

  useEffect(() => {
    const fullText = MOBILE_NOTICE_LINES.join("\n\n");
    let index = 0;
    let timeoutId;

    const printNext = () => {
      if (index >= fullText.length) {
        return;
      }

      const character = fullText[index];
      index += 1;
      setVisibleText((current) => current + character);

      const isPauseChar = /[.,:;]/.test(character);
      const isLineBreak = character === "\n";
      const delay = isLineBreak
        ? 280 + Math.random() * 420
        : isPauseChar
          ? 120 + Math.random() * 250
          : 18 + Math.random() * 95;

      timeoutId = window.setTimeout(printNext, delay);
    };

    timeoutId = window.setTimeout(printNext, 300);

    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <div className="mobile-gate">
      <div className="mobile-gate__panel">
        <div className="mobile-gate__eyebrow">Desktop Only</div>
        <h1 className="mobile-gate__title">
          Сайт доступен только с компьютера
        </h1>
        <div className="mobile-gate__terminal">
          <div className="mobile-gate__terminal-bar">
            <span />
            <span />
            <span />
          </div>
          <pre className="mobile-gate__typing">
            {visibleText}
            <span className="mobile-gate__caret" aria-hidden="true" />
          </pre>
        </div>
      </div>
    </div>
  );
}

function AppHeader({ currentUser, onLogin, onLogout }) {
  return (
    <div className="topbar">
      <div className="brand-block">
        <Link className="brand-link" to="/">
          Typing Trainer
        </Link>
      </div>

      <div className="topbar-actions">
        <Link className="history-link" to="/leaderboard">
          Leaderboard
        </Link>

        <Auth
          currentUser={currentUser}
          onLogin={onLogin}
          onLogout={onLogout}
        />
      </div>
    </div>
  );
}

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isMobileViewport, setIsMobileViewport] = useState(getIsMobileViewport);
  const location = useLocation();

  const loadCurrentUser = () => (
    api
      .getUserData()
      .then((user) => {
        setCurrentUser(user);
        return user;
      })
      .catch((error) => {
        localStorage.removeItem("token");
        setCurrentUser(null);
        throw error;
      })
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleViewportChange = () => {
      setIsMobileViewport(getIsMobileViewport());
    };

    handleViewportChange();
    window.addEventListener("resize", handleViewportChange);

    return () => window.removeEventListener("resize", handleViewportChange);
  }, []);

  useEffect(() => {
    if (isMobileViewport || !localStorage.getItem("token")) {
      return;
    }

    loadCurrentUser().catch(() => null);
  }, [isMobileViewport]);

  if (isMobileViewport) {
    return <MobileGate />;
  }

  return (
    <div className="app-shell">
      <div className="app-frame">
        <AppHeader
          currentUser={currentUser}
          onLogin={loadCurrentUser}
          onLogout={() => setCurrentUser(null)}
        />

        <Switch>
          <Route exact path="/leaderboard">
            <LeaderboardPage />
          </Route>

          <Route exact path="/history">
            <HistoryPage currentUser={currentUser} />
          </Route>

          <Route exact path="/profile">
            <ProfilePage
              currentUser={currentUser}
              onProfileUpdate={setCurrentUser}
            />
          </Route>

          <Route path="/history/:id">
            <TrainingDetailPage currentUser={currentUser} />
          </Route>

          <Route path="/">
            <TrainerPage
              currentUser={currentUser}
              isLoggedIn={Boolean(currentUser)}
              replayTraining={location.state?.replayTraining}
            />
          </Route>
        </Switch>
      </div>
    </div>
  );
}

export default App;
