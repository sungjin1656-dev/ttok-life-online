type TTMissionCardProps = {
  icon: string;
  title: string;
  status: string;
  done?: boolean;
};

export function TTMissionCard({ icon, title, status, done = false }: TTMissionCardProps) {
  return (
    <div className="tt-mission-row">
      <span className={`tt-mission-check ${done ? "is-done" : ""}`} aria-hidden="true">{done ? "✓" : icon}</span>
      <span className="tt-mission-title">{title}</span>
      <strong className={done ? "is-done" : ""}>{status}</strong>
      <span className="tt-mission-arrow" aria-hidden="true">›</span>
    </div>
  );
}
