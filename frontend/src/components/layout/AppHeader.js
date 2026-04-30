import { Link } from "react-router-dom";
import { useI18n } from "../../i18n";
import Auth from "../auth/Auth";
import BrandLogo from "./BrandLogo";
import LanguageSwitcher from "./LanguageSwitcher";

function AppHeader({ currentUser, onLogin, onLogout }) {
  const { t } = useI18n();

  return (
    <div className="topbar">
      <div className="brand-block">
        <BrandLogo />
      </div>

      <div className="topbar-actions">
        <Link className="history-link" to="/leaderboard">
          {t("header.leaderboard")}
        </Link>

        <Auth
          currentUser={currentUser}
          onLogin={onLogin}
          onLogout={onLogout}
        />

        <LanguageSwitcher />
      </div>
    </div>
  );
}

export default AppHeader;
