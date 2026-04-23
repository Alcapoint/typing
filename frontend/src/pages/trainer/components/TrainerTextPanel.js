function TrainerTextPanel({
  isLocked,
  isTextLoading,
  textError,
  trainerTextRef,
  renderText,
}) {
  return (
    <div className={`trainer-text-shell ${isLocked ? "trainer-text-shell-locked" : ""}`}>
      <div className="text text-scroll text-scroll-trainer" ref={trainerTextRef}>
        {isTextLoading
          ? ""
          : textError
            ? textError
            : renderText()}
      </div>

      {isLocked ? (
        <div className="trainer-lock-overlay" aria-hidden="true">
          <div className="trainer-lock-badge">
            <div className="trainer-lock-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M7 10V7a5 5 0 0 1 10 0v3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <rect
                  x="5"
                  y="10"
                  width="14"
                  height="10"
                  rx="3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <circle cx="12" cy="15" r="1.2" fill="currentColor" />
              </svg>
            </div>
            <strong className="trainer-lock-title">Тренажер доступен только с ПК</strong>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default TrainerTextPanel;
