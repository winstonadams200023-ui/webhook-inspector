import '../styles/index.css';

export default function CorrectionSettings({
  autoCorrectionEnabled,
  onAutoCorrectionEnabledChange,
}) {
  return (
    <section className="inspector-correction-settings" aria-labelledby="correction-title">
      <h2 id="correction-title">Free payload tools</h2>
      <p className="inspector-muted">All features are free.</p>
      <label className="inspector-correction-toggle">
        <input
          type="checkbox"
          role="switch"
          checked={autoCorrectionEnabled}
          onChange={(event) => onAutoCorrectionEnabledChange(event.target.checked)}
        />
        <span>Local auto-correction suggestions</span>
      </label>
      <p className="inspector-muted">
        Suggestions are generated in this browser from your schema. Payloads
        are not sent to an AI or correction provider. Review each suggestion;
        nothing is applied or forwarded without your action.
      </p>
    </section>
  );
}
