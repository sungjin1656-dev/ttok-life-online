type TTStatCardProps = {
  icon: string;
  value: string;
  label: string;
  tone?: "orange" | "blue" | "purple";
};

export function TTStatCard({ icon, value, label, tone = "blue" }: TTStatCardProps) {
  return (
    <div className={`tt-stat-card tt-stat-${tone}`}>
      <span className="tt-stat-icon" aria-hidden="true">{icon}</span>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
