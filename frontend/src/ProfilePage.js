import { useEffect, useMemo, useState } from "react";
import api from "./api";

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
  });
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

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    setForm({
      first_name: currentUser.first_name || "",
      last_name: currentUser.last_name || "",
      age: currentUser.age ?? "",
    });
  }, [currentUser]);

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

  const avatarFallback = useMemo(() => {
    const source = currentUser?.first_name || currentUser?.username || "?";
    return source.slice(0, 1).toUpperCase();
  }, [currentUser]);

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
  };

  const handleSubmit = (event) => {
    event.preventDefault();
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
        <div className="profile-avatar-large">
          {currentUser.avatar ? (
            <img src={currentUser.avatar} alt={currentUser.username} />
          ) : (
            <span>{avatarFallback}</span>
          )}
        </div>

        <div className="profile-hero-copy">
          <p className="page-muted">Профиль пользователя</p>
          <h2>{currentUser.username}</h2>
          <span className="profile-email">{currentUser.email}</span>
        </div>
      </div>

      <form className="page-card profile-form" onSubmit={handleSubmit}>
        <div className="panel-heading">
          <h3>Личные данные</h3>
          <p>Обновите имя, фамилию, возраст и аватар.</p>
        </div>

        <div className="profile-grid">
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
        </div>

        <div className="profile-avatar-actions">
          <label className="result-btn result-btn-secondary profile-upload-btn">
            <input type="file" accept="image/*" onChange={handleAvatarUpload} />
            {isUploadingAvatar ? "Загрузка..." : "Загрузить аватар"}
          </label>

          {currentUser.avatar ? (
            <button
              className="result-btn result-btn-secondary"
              type="button"
              onClick={handleAvatarDelete}
              disabled={isUploadingAvatar}
            >
              Удалить аватар
            </button>
          ) : null}
        </div>

        {error ? <p className="auth-message auth-error">{error}</p> : null}
        {message ? <p className="auth-message auth-success">{message}</p> : null}

        <button className="result-btn result-btn-primary" type="submit" disabled={isSaving}>
          {isSaving ? "Сохраняем..." : "Сохранить профиль"}
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
              {isSavingText ? "Сохраняем..." : editingTextId ? "Сохранить текст" : "Добавить текст"}
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
