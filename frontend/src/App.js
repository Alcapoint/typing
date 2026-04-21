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
    if (!localStorage.getItem("token")) {
      return;
    }

    loadCurrentUser().catch(() => null);
  }, []);

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
