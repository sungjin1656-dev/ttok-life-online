export default function FarmLoading() {
  return (
    <main className="farm-loading-page">
      <div className="farm-loading-plant">
        <span className="farm-loading-pot">🪴</span>
        <span className="farm-loading-drop">💧</span>
      </div>

      <strong>농장을 준비하고 있어요</strong>
      <span>식물과 화분을 불러오는 중입니다</span>

      <div className="farm-loading-track">
        <i />
      </div>
    </main>
  );
}