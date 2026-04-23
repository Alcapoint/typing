import { Link } from "react-router-dom";
import Auth from "../auth/Auth";
import BrandLogo from "./BrandLogo";

function AppHeader({ currentUser, onLogin, onLogout }) {
  return (
    <div className="topbar">
      <div className="brand-block">
        <BrandLogo />
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
