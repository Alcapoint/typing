import { useEffect, useMemo, useRef, useState } from "react";
import api from "../../api";
import LoadingHint from "../../components/feedback/LoadingHint";

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Не удалось прочитать файл."));
    reader.readAsDataURL(file);
  });
}

function ProfilePage({ currentUser, onProfileUpdate }) {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    age: "",
    country: "",
  });
  const [countries, setCountries] = useState([]);
  const [isCountrySuggestionsOpen, setIsCountrySuggestionsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [userTexts, setUserTexts] = useState([]);
  const [textForm, setTextForm] = useState({
    title: "",
    content: "",
  });
  const [editingTextId, setEditingTextId] = useState(null);
  const [textMessage, setTextMessage] = useState("");
  const [textError, setTextError] = useState("");
  const [isSavingText, setIsSavingText] = useState(false);
  const [isAvatarHintVisible, setIsAvatarHintVisible] = useState(false);
  const countryFieldRef = useRef(null);
  const avatarInputRef = useRef(null);
  const avatarHintTimerRef = useRef(null);

  const getAvatarHintStorageKey = (user) => {
    if (!user) {
      return "profile-avatar-hint-dismissed";
    }
    return `profile-avatar-hint-dismissed:${user.id || user.username || "user"}`;
  };

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    setForm({
      first_name: currentUser.first_name || "",
      last_name: currentUser.last_name || "",
      age: currentUser.age ?? "",
      country: currentUser.country || "",
    });
  }, [currentUser]);

  useEffect(() => {
    api
      .getCountries()
      .then((data) => {
        setCountries(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setCountries([]);
      });
  }, []);

  useEffect(() => {
    if (!isCountrySuggestionsOpen) {
      return undefined;
    }

    const handleOutsideClick = (event) => {
      if (!countryFieldRef.current?.contains(event.target)) {
        setIsCountrySuggestionsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handleOutsideClick);
    return () => document.removeEventListener("pointerdown", handleOutsideClick);
  }, [isCountrySuggestionsOpen]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    api
      .getUserTexts()
      .then((data) => {
        setUserTexts(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setTextError("Не удалось загрузить ваши тексты.");
      });
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || currentUser.avatar) {
      setIsAvatarHintVisible(false);
      return;
    }

    if (typeof window === "undefined") {
      setIsAvatarHintVisible(true);
      return;
    }

    const isDismissed = window.localStorage.getItem(getAvatarHintStorageKey(currentUser)) === "1";
    setIsAvatarHintVisible(!isDismissed);
  }, [currentUser]);

  useEffect(() => () => {
    if (avatarHintTimerRef.current) {
      window.clearTimeout(avatarHintTimerRef.current);
    }
  }, []);

  const avatarFallback = useMemo(() => {
    const source = currentUser?.first_name || currentUser?.username || "?";
    return source.slice(0, 1).toUpperCase();
  }, [currentUser]);

  const filteredCountries = useMemo(() => {
    const query = form.country.trim().toLowerCase();
    if (!query) {
      return [];
    }

    return countries
      .filter((country) => country.toLowerCase().startsWith(query))
      .slice(0, 8);
  }, [countries, form.country]);

  if (!currentUser) {
    return (
      <div className="page-card">
        <h2>Профиль</h2>
        <p className="page-muted">Профиль доступен после входа в аккаунт.</p>
      </div>
    );
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "country") {
      setError("");
      setIsCountrySuggestionsOpen(Boolean(value.trim()));
    }
  };

  const handleCountrySelect = (country) => {
    setForm((prev) => ({
      ...prev,
      country,
    }));
    setError("");
    setIsCountrySuggestionsOpen(false);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (form.country && !countries.includes(form.country)) {
      setError("Выберите страну из списка.");
      return;
    }

    setIsSaving(true);
    setMessage("");
    setError("");

    api
      .updateProfile(form)
      .then((user) => {
        onProfileUpdate(user);
        setMessage("Профиль сохранён.");
      })
      .catch(() => {
        setError("Не удалось сохранить профиль.");
      })
      .finally(() => setIsSaving(false));
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsUploadingAvatar(true);
    setMessage("");
    setError("");

    try {
      const avatar = await fileToBase64(file);
      await api.changeAvatar({ file: avatar });
      const user = await api.getUserData();
      onProfileUpdate(user);
      setMessage("Аватар обновлён.");
    } catch (uploadError) {
      setError("Не удалось обновить аватар.");
    } finally {
      event.target.value = "";
      setIsUploadingAvatar(false);
    }
  };

  const handleAvatarDelete = () => {
    setIsUploadingAvatar(true);
    setMessage("");
    setError("");

    api
      .deleteAvatar()
      .then(() => api.getUserData())
      .then((user) => {
        onProfileUpdate(user);
        setMessage("Аватар удалён.");
      })
      .catch(() => {
        setError("Не удалось удалить аватар.");
      })
      .finally(() => setIsUploadingAvatar(false));
  };

  const openAvatarPicker = () => {
    if (isUploadingAvatar) {
      return;
    }
    avatarInputRef.current?.click();
  };

  const dismissAvatarHint = () => {
    if (!currentUser) {
      return;
    }

    if (avatarHintTimerRef.current) {
      window.clearTimeout(avatarHintTimerRef.current);
      avatarHintTimerRef.current = null;
    }

    setIsAvatarHintVisible(false);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(getAvatarHintStorageKey(currentUser), "1");
    }
  };

  const startAvatarHintTimer = () => {
    if (!isAvatarHintVisible || avatarHintTimerRef.current) {
      return;
    }

    avatarHintTimerRef.current = window.setTimeout(() => {
      dismissAvatarHint();
    }, 4000);
  };

  const stopAvatarHintTimer = () => {
    if (!avatarHintTimerRef.current) {
      return;
    }

    window.clearTimeout(avatarHintTimerRef.current);
    avatarHintTimerRef.current = null;
  };

  const resetTextForm = () => {
    setTextForm({ title: "", content: "" });
    setEditingTextId(null);
  };

  const handleTextSubmit = (event) => {
    event.preventDefault();
    setIsSavingText(true);
    setTextMessage("");
    setTextError("");

    const action = editingTextId
      ? api.updateUserText(editingTextId, textForm)
      : api.createUserText(textForm);

    action
      .then((savedText) => {
        setUserTexts((prev) => (
          editingTextId
            ? prev.map((item) => (item.id === savedText.id ? savedText : item))
            : [savedText, ...prev]
        ));
        setTextMessage(editingTextId ? "Текст обновлён." : "Текст добавлен.");
        resetTextForm();
      })
      .catch(() => {
        setTextError("Не удалось сохранить текст.");
      })
      .finally(() => setIsSavingText(false));
  };

  const handleTextDelete = (id) => {
    setTextError("");
    setTextMessage("");
    api
      .deleteUserText(id)
      .then(() => {
        setUserTexts((prev) => prev.filter((item) => item.id !== id));
        if (editingTextId === id) {
          resetTextForm();
        }
      })
      .catch(() => {
        setTextError("Не удалось удалить текст.");
      });
  };

  return (
    <div className="profile-page">
      <div className="page-card profile-hero">
        <div className="profile-avatar-shell">
          <div className="profile-avatar-large">
            {currentUser.avatar ? (
              <img src={currentUser.avatar} alt={currentUser.username} />
            ) : (
              <span>{avatarFallback}</span>
            )}

            <div className="profile-avatar-overlay">
              {currentUser.avatar ? (
                <div className="profile-avatar-overlay-actions">
                  <button
                    className="profile-avatar-action"
                    type="button"
                    onClick={handleAvatarDelete}
                    disabled={isUploadingAvatar}
                    aria-label="Удалить аватар"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M9 3h6m-9 4h12m-9 0v11m6-11v11M8 7l.6 11.2a1 1 0 0 0 1 .8h4.8a1 1 0 0 0 1-.8L16 7"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  <button
                    className="profile-avatar-action"
                    type="button"
                    onClick={openAvatarPicker}
                    disabled={isUploadingAvatar}
                    aria-label="Обновить аватар"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M12 16V7m0 0-3 3m3-3 3 3M5 16.5v1a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5v-1"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  className="profile-avatar-action profile-avatar-action-primary"
                  type="button"
                  onClick={openAvatarPicker}
                  disabled={isUploadingAvatar}
                  aria-label="Загрузить аватар"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M12 16V7m0 0-3 3m3-3 3 3M5 16.5v1a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5v-1"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              )}
            </div>

            {isUploadingAvatar ? (
              <div className="profile-avatar-loading">
                <LoadingHint variant="button" />
              </div>
            ) : null}
          </div>

          {isAvatarHintVisible ? (
            <div
              className={`profile-avatar-hint ${currentUser.avatar ? "hidden" : ""}`}
              onPointerEnter={startAvatarHintTimer}
              onPointerLeave={stopAvatarHintTimer}
              onFocus={startAvatarHintTimer}
              onBlur={stopAvatarHintTimer}
            >
              <button
                className="profile-avatar-hint-trigger"
                type="button"
                aria-label="Как добавить аватар"
              >
                ?
              </button>
              <div className="profile-avatar-hint-tooltip">
                Добавьте аватар через наведение на иконку профиля и нажатие на значок загрузки.
              </div>
            </div>
          ) : null}

          <input
            ref={avatarInputRef}
            className="profile-avatar-input"
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
          />
        </div>

        <div className="profile-hero-copy">
          <p className="page-muted">Профиль пользователя</p>
          <h2>{currentUser.username}</h2>
          <span className="profile-email">{currentUser.country || "Страна не указана"}</span>
        </div>
      </div>

      <form className="page-card profile-form" onSubmit={handleSubmit}>
        <div className="panel-heading">
          <h3>Личные данные</h3>
          <p>Обновите имя, фамилию, возраст, страну и аватар.</p>
        </div>

        <div className="profile-grid">
          <input
            className="auth-input"
            name="first_name"
            placeholder="Имя"
            value={form.first_name}
            onChange={handleChange}
          />
          <input
            className="auth-input"
            name="last_name"
            placeholder="Фамилия"
            value={form.last_name}
            onChange={handleChange}
          />
          <input
            className="auth-input"
            name="age"
            placeholder="Возраст"
            type="number"
            min="1"
            max="120"
            value={form.age}
            onChange={handleChange}
          />
          <div className="profile-country-field" ref={countryFieldRef}>
            <input
              className="auth-input"
              name="country"
              placeholder="Страна проживания"
              autoComplete="off"
              value={form.country}
              onChange={handleChange}
              onFocus={() => setIsCountrySuggestionsOpen(Boolean(form.country.trim()))}
            />

            {isCountrySuggestionsOpen && filteredCountries.length ? (
              <div className="profile-country-suggestions" role="listbox">
                {filteredCountries.map((country) => (
                  <button
                    key={country}
                    className="profile-country-option"
                    type="button"
                    onClick={() => handleCountrySelect(country)}
                  >
                    {country}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {error ? <p className="auth-message auth-error">{error}</p> : null}
        {message ? <p className="auth-message auth-success">{message}</p> : null}

        <button className="result-btn result-btn-primary" type="submit" disabled={isSaving}>
          {isSaving ? <LoadingHint variant="button" /> : "Сохранить профиль"}
        </button>
      </form>

      <div className="page-card profile-form">
        <div className="panel-heading">
          <h3>Свои тексты</h3>
          <p>Добавляйте свои тексты и проходите тренировки в любом режиме только для себя.</p>
        </div>

        <form className="profile-user-text-form" onSubmit={handleTextSubmit}>
          <input
            className="auth-input"
            placeholder="Название текста"
            value={textForm.title}
            onChange={(event) => setTextForm((prev) => ({ ...prev, title: event.target.value }))}
            required
          />
          <textarea
            className="auth-input profile-user-textarea"
            placeholder="Введите свой текст"
            value={textForm.content}
            onChange={(event) => setTextForm((prev) => ({ ...prev, content: event.target.value }))}
            required
          />

          {textError ? <p className="auth-message auth-error">{textError}</p> : null}
          {textMessage ? <p className="auth-message auth-success">{textMessage}</p> : null}

          <div className="result-actions">
            <button className="result-btn result-btn-primary" type="submit" disabled={isSavingText}>
              {isSavingText ? <LoadingHint variant="button" /> : editingTextId ? "Сохранить текст" : "Добавить текст"}
            </button>
            {editingTextId ? (
              <button className="result-btn result-btn-secondary" type="button" onClick={resetTextForm}>
                Отмена
              </button>
            ) : null}
          </div>
        </form>

        <div className="profile-user-text-list">
          {userTexts.length ? userTexts.map((item) => (
            <div key={item.id} className="profile-user-text-card">
              <div className="profile-user-text-header">
                <strong>{item.title}</strong>
                <div className="profile-user-text-actions">
                  <button
                    className="result-btn result-btn-secondary"
                    type="button"
                    onClick={() => {
                      setEditingTextId(item.id);
                      setTextForm({
                        title: item.title,
                        content: item.content,
                      });
                      setTextMessage("");
                      setTextError("");
                    }}
                  >
                    Изменить
                  </button>
                  <button
                    className="result-btn result-btn-secondary"
                    type="button"
                    onClick={() => handleTextDelete(item.id)}
                  >
                    Удалить
                  </button>
                </div>
              </div>
              <p className="history-text-preview">{item.content}</p>
            </div>
          )) : (
            <p className="page-muted">У вас пока нет своих текстов.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
