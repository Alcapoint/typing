import { Link } from "react-router-dom";
import Auth from "../auth/Auth";

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

export default AppHeader;
