import { useEffect, useRef, useState } from "react";
import { useI18n } from "../../i18n";

function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const switcherRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleOutsideClick = (event) => {
      if (!switcherRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handleOutsideClick);
    return () => document.removeEventListener("pointerdown", handleOutsideClick);
  }, [isOpen]);

  return (
    <div ref={switcherRef} className="language-switcher">
      <button
        className={`language-switcher-trigger ${isOpen ? "open" : ""}`}
        type="button"
        aria-label={t("header.languageMenuAria")}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 2.8a9.2 9.2 0 1 0 0 18.4 9.2 9.2 0 0 0 0-18.4Zm6.7 8.2h-3.2a15.6 15.6 0 0 0-1.4-5 7.52 7.52 0 0 1 4.6 5Zm-6.7-6c.9 1 1.8 3 2.1 6H9.9c.3-3 1.2-5 2.1-6ZM5.9 6a15.6 15.6 0 0 0-1.4 5H1.3a7.52 7.52 0 0 1 4.6-5Zm-1.4 7a15.6 15.6 0 0 0 1.4 5 7.52 7.52 0 0 1-4.6-5h3.2Zm5.4 6c-.9-1-1.8-3-2.1-6h4.2c-.3 3-1.2 5-2.1 6Zm4.2-6c-.3 3-1.2 5-2.1 6 .9-1 1.8-3 2.1-6h4.6a7.52 7.52 0 0 1-4.6 5Z"
            fill="currentColor"
          />
        </svg>
      </button>

      <div className={`language-switcher-popover ${isOpen ? "open" : ""}`}>
        <span className="language-switcher-title">{t("header.languageMenuTitle")}</span>
        {["ru", "en"].map((languageCode) => (
          <button
            key={languageCode}
            className={`language-switcher-option ${locale === languageCode ? "active" : ""}`}
            type="button"
            onClick={() => {
              setLocale(languageCode);
              setIsOpen(false);
            }}
          >
            {t(`languageNames.${languageCode}`)}
          </button>
        ))}
      </div>
    </div>
  );
}

export default LanguageSwitcher;
