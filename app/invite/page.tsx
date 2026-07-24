"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Guard } from "@/components/ui/Guard";
import { TTAppShell, TTBottomNav } from "@/components/ttok";
import { useGame } from "@/context/GameContext";

type InviteStatus = "READY" | "SHARED" | "JOINED" | "REWARDED";

function profileAsset(characterId: string) {
  const isBoy = characterId === "hajun" || characterId === "minjun";
  return isBoy ? "/assets/characters/boy-profile-clean.png" : "/assets/characters/girl-profile-clean.png";
}

export default function InvitePage() {
  const { game, patchGame } = useGame();
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<InviteStatus>("READY");
  const [rewarded, setRewarded] = useState(false);

  const inviteCode = useMemo(() => {
    const base = (game.nickname || "TTOK").charCodeAt(0) + 1234;
    return `TTOK${String(base).slice(-4)}`;
  }, [game.nickname]);

  const inviteUrl = `https://game.ttoktok.kr/join?ref=${inviteCode}`;

  function toast(text: string) {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 2200);
  }

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(`${game.nickname}님이 TTOK LIFE 우리 동네로 초대했어요! ${inviteUrl}`);
      setStatus("SHARED");
      toast("초대 링크를 복사했어요. 친구가 가입하면 500 물방울이 지급돼요!");
    } catch {
      toast("링크 복사에 실패했어요.");
    }
  }

  async function shareInvite() {
    const shareData = {
      title: "TTOK LIFE 주민 초대",
      text: `${game.nickname}님과 함께 걷고 농장도 키워요! 가입하면 함께 보상을 받아요.`,
      url: inviteUrl,
    };
    try {
      if (navigator.share) await navigator.share(shareData);
      else await navigator.clipboard.writeText(`${shareData.text} ${inviteUrl}`);
      setStatus("SHARED");
      toast("초대 링크를 보냈어요! 친구가 회원가입을 완료하면 지급돼요.");
    } catch {
      // 사용자가 공유창을 닫은 경우에는 보상이나 상태를 변경하지 않습니다.
    }
  }

  function simulateJoinedMember() {
    if (rewarded) {
      toast("이미 지급된 초대 보상이에요.");
      return;
    }
    setStatus("JOINED");
    window.setTimeout(() => {
      patchGame({
        water: game.water + 500,
        invitedResidents: (game.invitedResidents || 0) + 1,
      });
      setRewarded(true);
      setStatus("REWARDED");
      toast("새 주민이 가입했어요! 500 물방울 지급 완료");
    }, 500);
  }

  const statusCopy = {
    READY: ["초대 전", "카카오톡으로 링크를 보내주세요"],
    SHARED: ["가입 대기", "친구가 회원가입을 완료하면 자동 지급돼요"],
    JOINED: ["가입 확인", "신규 회원 여부를 확인하고 있어요"],
    REWARDED: ["지급 완료", "500 물방울이 내 지갑에 들어왔어요"],
  } as const;

  return (
    <Guard>
      <TTAppShell>
        <main className="invite-v14">
          <header className="invite-v14-header">
            <div>
              <span>초대한 주민이 가입하면</span>
              <h1>500 물방울 받기</h1>
            </div>
            <div className="invite-v14-wallet">
              <Image src="/assets/icons/droplet.png" alt="" width={18} height={18} />
              {game.water.toLocaleString()}
            </div>
          </header>

          <section className="invite-v14-hero">
            <div className="invite-v14-badge">초대 성공 보상</div>
            <div className="invite-v14-reward-number">
              <Image src="/assets/icons/droplet.png" alt="물방울" width={58} height={58} />
              <strong>+500</strong>
            </div>
            <h2>주민 초대하고<br />500 물방울 받기</h2>
            <p>공유만으로는 지급되지 않아요.<br /><b>초대한 친구가 회원가입을 완료하면</b> 자동 지급됩니다.</p>
            <div className="invite-v14-people">
              <div><span className="invite-v14-face"><Image src={profileAsset(game.characterId)} alt="내 캐릭터" fill sizes="48px" /></span><b>나</b><small>+500</small></div>
              <i>→</i>
              <div><span className="invite-v14-face invite-v14-friend">?</span><b>친구</b><small>신규 가입</small></div>
            </div>
          </section>

          <section className={`invite-v14-status ${status.toLowerCase()}`}>
            <div className="invite-v14-status-icon">{status === "REWARDED" ? "✓" : status === "SHARED" ? "⏳" : status === "JOINED" ? "🔎" : "1"}</div>
            <div><span>{statusCopy[status][0]}</span><strong>{statusCopy[status][1]}</strong></div>
          </section>

          <section className="invite-v14-code-card">
            <div><span>내 추천 코드</span><strong>{inviteCode}</strong></div>
            <button type="button" onClick={copyInvite}>복사</button>
          </section>

          <button className="invite-v14-kakao" type="button" onClick={shareInvite}>
            <span>💬</span>
            <div><strong>카카오톡으로 초대하기</strong><small>가입 완료 시 물방울 500개 지급</small></div>
            <b>›</b>
          </button>

          <button className="invite-v14-link" type="button" onClick={copyInvite}>🔗 초대 링크 복사</button>

          <section className="invite-v14-steps">
            <h3>보상 지급 과정</h3>
            <ol>
              <li><i>1</i><div><strong>초대 링크 공유</strong><span>카카오톡으로 친구에게 링크를 보내요.</span></div></li>
              <li><i>2</i><div><strong>친구가 신규 회원가입 완료</strong><span>초대 코드가 가입 정보에 자동으로 연결돼요.</span></div></li>
              <li><i>3</i><div><strong>500 물방울 자동 지급</strong><span>신규 가입 확인 후 내 지갑에 한 번만 지급돼요.</span></div></li>
            </ol>
          </section>

          <section className="invite-v14-summary">
            <div><span>가입 대기</span><strong>{status === "SHARED" ? 1 : 0}명</strong></div>
            <i />
            <div><span>가입 완료</span><strong>{game.invitedResidents || 0}명</strong></div>
            <i />
            <div><span>받은 보상</span><strong>{((game.invitedResidents || 0) * 500).toLocaleString()}💧</strong></div>
          </section>

          <section className="invite-v14-dev">
            <span>개발 테스트</span>
            <button type="button" onClick={simulateJoinedMember} disabled={rewarded}>친구 가입 완료 테스트</button>
            <small>실서비스에서는 회원가입 서버가 이 동작을 자동 처리합니다.</small>
          </section>

          {message && <div className="invite-v13-toast" role="status">{message}</div>}
        </main>
        <TTBottomNav />
      </TTAppShell>
    </Guard>
  );
}
