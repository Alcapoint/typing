import { useEffect, useState } from "react";
import { Route, Switch, useLocation } from "react-router-dom";
import "../App.css";
import api from "../api";
import { clearToken, hasToken } from "../api/baseClient";
import AppHeader from "../components/layout/AppHeader";
import HistoryPage from "../pages/history/HistoryPage";
import LeaderboardPage from "../pages/leaderboard/LeaderboardPage";
import ProfilePage from "../pages/profile/ProfilePage";
import TrainerPage from "../pages/trainer/TrainerPage";
import TrainingDetailPage from "../pages/training-detail/TrainingDetailPage";
import { getIsMobileViewport } from "../utils/device";

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
              isMobileViewport={isMobileViewport}
              replayTraining={location.state?.replayTraining}
            />
          </Route>
        </Switch>
      </div>
    </div>
  );
}

export default App;
