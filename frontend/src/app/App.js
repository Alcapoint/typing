import { useEffect, useState } from "react";
import { Route, Switch, useLocation } from "react-router-dom";
import "../App.css";
import api from "../api";
import { clearToken, hasToken } from "../api/baseClient";
import AppHeader from "../components/layout/AppHeader";
import { useI18n } from "../i18n";
import ComparisonPage from "../pages/comparison/ComparisonPage";
import HistoryPage from "../pages/history/HistoryPage";
import LeaderboardPage from "../pages/leaderboard/LeaderboardPage";
import ProfilePage from "../pages/profile/ProfilePage";
import TrainerPage from "../pages/trainer/TrainerPage";
import TrainingDetailPage from "../pages/training-detail/TrainingDetailPage";
import { getIsMobileViewport } from "../utils/device";

function App() {
  const { t } = useI18n();
  const [currentUser, setCurrentUser] = useState(null);
  const [isMobileViewport, setIsMobileViewport] = useState(getIsMobileViewport);
  const [isScrollTopVisible, setIsScrollTopVisible] = useState(false);
  const location = useLocation();

  const updateScrollTopVisibility = () => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    const fixedResultScreen = document.querySelector(".result-screen:not(.result-screen-page)");
    const windowOffset = window.scrollY || document.documentElement.scrollTop || 0;
    const resultOffset = fixedResultScreen?.scrollTop || 0;
    setIsScrollTopVisible(Math.max(windowOffset, resultOffset) > 240);
  };

  const loadCurrentUser = () => (
    api
      .getUserData()
      .then((user) => {
        setCurrentUser(user);
        return user;
      })
      .catch((error) => {
        clearToken();
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
    if (!hasToken()) {
      return;
    }

    loadCurrentUser().catch(() => null);
  }, [isMobileViewport]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return undefined;
    }

    let frameId = 0;
    const handleScroll = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(updateScrollTopVisibility);
    };

    updateScrollTopVisibility();
    document.addEventListener("scroll", handleScroll, { passive: true, capture: true });
    window.addEventListener("resize", handleScroll, { passive: true });

    return () => {
      window.cancelAnimationFrame(frameId);
      document.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
    };
  }, [location]);

  const handleScrollTop = () => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const behavior = prefersReducedMotion ? "auto" : "smooth";
    const fixedResultScreen = document.querySelector(".result-screen:not(.result-screen-page)");

    if (fixedResultScreen && fixedResultScreen.scrollTop > 0) {
      fixedResultScreen.scrollTo({
        top: 0,
        behavior,
      });
      return;
    }

    window.scrollTo({
      top: 0,
      behavior,
    });
  };

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

          <Route exact path="/comparison">
            <ComparisonPage currentUser={currentUser} />
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
              isMobileViewport={isMobileViewport}
              replayTraining={location.state?.replayTraining}
            />
          </Route>
        </Switch>
      </div>

      <button
        className={`scroll-top-button ${isScrollTopVisible ? "visible" : ""}`}
        type="button"
        onClick={handleScrollTop}
        aria-label={t("app.scrollTopAria")}
      >
        <span className="scroll-top-icon" aria-hidden="true">
          <span className="scroll-top-chevron scroll-top-chevron-large">^</span>
          <span className="scroll-top-chevron scroll-top-chevron-small">^</span>
        </span>
        <span className="scroll-top-label">{t("app.scrollTopLabel")}</span>
      </button>
    </div>
  );
}

export default App;
