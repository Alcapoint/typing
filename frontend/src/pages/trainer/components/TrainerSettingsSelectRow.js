function TrainerSettingsSelectRow({
  field,
  label,
  valueLabel,
  options,
  selectedValue,
  openField,
  onToggle,
  onSelect,
}) {
  return (
    <div className="settings-row">
      <span className="settings-label">{label}</span>
      <div className="settings-field">
        <button
          className="settings-select-button"
          type="button"
          onClick={() => onToggle(field)}
        >
          <span>{valueLabel}</span>
          <span className={`settings-select-caret ${openField === field ? "open" : ""}`}>⌄</span>
        </button>

        <div className={`settings-options ${openField === field ? "open" : ""}`}>
          {options.map((option) => (
            <button
              key={String(option.value)}
              className={`settings-option ${selectedValue === option.value ? "active" : ""}`}
              type="button"
              onClick={() => onSelect(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TrainerSettingsSelectRow;
