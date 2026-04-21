import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "./api";

const initialForm = {
  email: "",
  password: "",
  username: "",
  first_name: "",
  last_name: "",
};

function Auth({ currentUser, onLogin, onLogout }) {
  const [mode, setMode] = useState("login");
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  const isRegister = mode === "register";

  const openPanel = (nextMode) => {
    setMode(nextMode);
    setIsOpen(true);
    setError("");
    setSuccess("");
  };

  const closePanel = () => {
    setIsOpen(false);
    setError("");
  };

  useEffect(() => {
    if (!isUserMenuOpen) {
      return undefined;
    }

    const handleOutsideClick = (event) => {
      if (!userMenuRef.current?.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isUserMenuOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const extractError = (data) => {
    if (!data) {
      return "Не удалось выполнить запрос.";
    }

    if (typeof data === "string") {
      return data;
    }

    if (Array.isArray(data)) {
      return data.join(", ");
    }

    const firstKey = Object.keys(data)[0];
    const value = data[firstKey];

    if (Array.isArray(value)) {
      return value.join(", ");
    }

    if (typeof value === "string") {
      return value;
    }

    return "Проверьте заполнение формы.";
  };

  const handleLogin = () => {
    setIsSubmitting(true);
    setError("");
    setSuccess("");

    api
      .signin({
        email: form.email,
        password: form.password,
      })
      .then((data) => {
        localStorage.setItem("token", data.auth_token);
        return onLogin();
      })
      .then(() => {
        setIsOpen(false);
      })
      .catch((err) => {
        setError(extractError(err));
      })
      .finally(() => setIsSubmitting(false));
  };

  const handleRegister = () => {
    setIsSubmitting(true);
    setError("");
    setSuccess("");

    api
      .signup({
        email: form.email,
        password: form.password,
        username: form.username,
        first_name: form.first_name,
        last_name: form.last_name,
      })
      .then(() => {
        setSuccess("Регистрация прошла успешно. Теперь можно войти.");
        setMode("login");
        setForm((prev) => ({
          ...prev,
          password: "",
        }));
      })
      .catch((err) => {
        setError(extractError(err));
      })
      .finally(() => setIsSubmitting(false));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (isRegister) {
      handleRegister();
      return;
    }

    handleLogin();
  };

  const handleLogout = () => {
    api
      .signout()
      .catch(() => null)
      .finally(() => {
        localStorage.removeItem("token");
        setIsOpen(false);
        onLogout();
      });
  };

  if (currentUser) {
    return (
      <div
        ref={userMenuRef}
        className="user-menu"
      >
        <button
          className="user-menu-trigger"
          type="button"
          onClick={() => setIsUserMenuOpen((prev) => !prev)}
          aria-expanded={isUserMenuOpen}
        >
          <span className="auth-status">{currentUser.username}</span>
          <span className={`user-menu-caret ${isUserMenuOpen ? "open" : ""}`}>⌄</span>
        </button>

        <div className={`user-menu-popover ${isUserMenuOpen ? "open" : ""}`}>
          <Link className="user-menu-link" to="/profile" onClick={() => setIsUserMenuOpen(false)}>
            Профиль
          </Link>
          <Link className="user-menu-link" to="/history" onClick={() => setIsUserMenuOpen(false)}>
            История тренировок
          </Link>
          <button className="user-menu-link user-menu-link-button" onClick={handleLogout} type="button">
            Выйти
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-anchor">
      <div className="auth-toolbar">
        <button
          className="auth-toolbar-btn"
          onClick={() => openPanel("login")}
        >
          Войти
        </button>
        <button
          className="auth-toolbar-btn auth-primary"
          onClick={() => openPanel("register")}
        >
          Регистрация
        </button>
      </div>

      {isOpen && (
        <form className="auth-popover" onSubmit={handleSubmit}>
          <div className="auth-popover-header">
            <div>
              <p className="auth-kicker">Typing Trainer</p>
              <h2 className="auth-title">
                {isRegister ? "Регистрация" : "Вход"}
              </h2>
            </div>
            <button
              className="auth-close"
              type="button"
              onClick={closePanel}
            >
              ×
            </button>
          </div>

          <div className="auth-switcher">
            <button
              className={!isRegister ? "active" : ""}
              type="button"
              onClick={() => setMode("login")}
            >
              Вход
            </button>
            <button
              className={isRegister ? "active" : ""}
              type="button"
              onClick={() => setMode("register")}
            >
              Регистрация
            </button>
          </div>

          {isRegister && (
            <>
              <input
                className="auth-input"
                name="username"
                placeholder="Username"
                value={form.username}
                onChange={handleChange}
                required
              />
              <div className="auth-grid">
                <input
                  className="auth-input"
                  name="first_name"
                  placeholder="Имя"
                  value={form.first_name}
                  onChange={handleChange}
                  required
                />
                <input
                  className="auth-input"
                  name="last_name"
                  placeholder="Фамилия"
                  value={form.last_name}
                  onChange={handleChange}
                  required
                />
              </div>
            </>
          )}

          <input
            className="auth-input"
            name="email"
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
          />

          <input
            className="auth-input"
            name="password"
            placeholder="Пароль"
            type="password"
            value={form.password}
            onChange={handleChange}
            required
          />

          {error && <p className="auth-message auth-error">{error}</p>}
          {success && <p className="auth-message auth-success">{success}</p>}

          <button className="auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? "Подождите..."
              : isRegister
                ? "Зарегистрироваться"
                : "Войти"}
          </button>
        </form>
      )}
    </div>
  );
}

export default Auth;
