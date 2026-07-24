"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useGame } from "@/context/GameContext";
import type { CharacterId } from "@/lib/game";

const characters: Array<{
  id: CharacterId;
  number: number;
  label: string;
  image: string;
}> = [
  {
    id: "hani",
    number: 1,
    label: "여자 캐릭터",
    image: "/assets/characters/girl-profile.png",
  },
  {
    id: "hajun",
    number: 2,
    label: "남자 캐릭터",
    image: "/assets/characters/boy-profile.png",
  },
];

type NicknameResponse = {
  ok: boolean;
  member_id?: string;
  member_name?: string;
  nickname?: string | null;
  nickname_required?: boolean;
  message?: string;
};

export default function OnboardingPage() {
  const { game, patchGame } = useGame();
  const router = useRouter();

  const [characterId, setCharacterId] = useState<CharacterId>(
    game.characterId === "hajun" ? "hajun" : "hani"
  );

  const [memberId, setMemberId] = useState("");
  const [memberName, setMemberName] = useState("");
  const [nickname, setNickname] = useState("");
  const [savedNickname, setSavedNickname] = useState("");

  const [nicknameLoading, setNicknameLoading] = useState(true);
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const [nicknameRequired, setNicknameRequired] = useState(false);
  const [nicknameError, setNicknameError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const id = params.get("member_id")?.trim() ?? "";
    const name = params.get("member_name")?.trim() ?? "";

    setMemberId(id);
    setMemberName(name);

    if (!id) {
      setNicknameError("로그인 회원정보를 확인할 수 없습니다.");
      setNicknameLoading(false);
      return;
    }

    const loadNickname = async () => {
      try {
        const response = await fetch(
          `/api/online/nickname?member_id=${encodeURIComponent(id)}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const result = (await response.json()) as NicknameResponse;

        if (!response.ok || !result.ok) {
          throw new Error(
            result.message || "닉네임 정보를 불러오지 못했습니다."
          );
        }

        const currentNickname = result.nickname?.trim() ?? "";

        setSavedNickname(currentNickname);
        setNickname(currentNickname || name);
        setNicknameRequired(!currentNickname);
      } catch (error) {
        setNicknameError(
          error instanceof Error
            ? error.message
            : "닉네임 정보를 불러오지 못했습니다."
        );
      } finally {
        setNicknameLoading(false);
      }
    };

    void loadNickname();
  }, []);

  const saveNickname = async () => {
    const trimmedNickname = nickname.trim();

    setNicknameError("");

    if (!memberId) {
      setNicknameError("로그인 회원정보를 확인할 수 없습니다.");
      return;
    }

    if (trimmedNickname.length < 2 || trimmedNickname.length > 12) {
      setNicknameError("닉네임은 2자 이상 12자 이하로 입력해주세요.");
      return;
    }

    setNicknameSaving(true);

    try {
      const response = await fetch("/api/online/nickname", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          member_id: memberId,
          nickname: trimmedNickname,
        }),
      });

      const result = (await response.json()) as NicknameResponse;

      if (!response.ok || !result.ok) {
        throw new Error(result.message || "닉네임 저장에 실패했습니다.");
      }

      setSavedNickname(trimmedNickname);
      setNicknameRequired(false);
    } catch (error) {
      setNicknameError(
        error instanceof Error
          ? error.message
          : "닉네임 저장에 실패했습니다."
      );
    } finally {
      setNicknameSaving(false);
    }
  };

  const startGame = () => {
    patchGame({
      characterId,
      onboardingComplete: true,
    });

    router.push("/home");
  };

  if (nicknameLoading) {
    return (
      <main className="start-v4" aria-label="TTOK LIFE 회원정보 확인">
        <div className="start-v4-phone">
          <section className="v4-panel">
            <h1>회원정보를 확인하고 있어요</h1>
            <p>잠시만 기다려주세요.</p>
          </section>
        </div>
      </main>
    );
  }

  if (nicknameRequired) {
    return (
      <main className="start-v4" aria-label="TTOK LIFE 닉네임 설정">
        <div className="start-v4-phone">
          <div className="start-v4-sky" aria-hidden="true">
            <i className="v4-cloud c1" />
            <i className="v4-cloud c2" />
            <i className="v4-cloud c3" />
            <div className="v4-city city-left" />
            <div className="v4-city city-right" />
            <div className="v4-bridge">
              <i />
              <i />
              <i />
            </div>
          </div>

          <header className="v4-header">
            <div className="v4-logo">
              <b>TTOK</b>
              <strong>LIFE</strong>
              <em>◆</em>
            </div>
            <p>
              걷기만 해도
              <br />
              실제 상품을 받는 게임!
            </p>
          </header>

          <section className="v4-hero" aria-label="달리는 캐릭터">
            <img
              className="v4-runner girl"
              src="/assets/characters/girl-running.png"
              alt="달리는 여자 캐릭터"
            />
            <img
              className="v4-runner boy"
              src="/assets/characters/boy-running.png"
              alt="달리는 남자 캐릭터"
            />
            <div className="v4-bubble">
              건강도 챙기고
              <br />
              상품도 받자!
            </div>
          </section>

          <section className="v4-panel">
            <h1>게임에서 사용할 닉네임을 정해주세요</h1>

            <p>{memberName ? `${memberName}님, 반가워요!` : "반가워요!"}</p>

            <input
              type="text"
              value={nickname}
              maxLength={12}
              placeholder="닉네임 2~12자"
              onChange={(event) => {
                setNickname(event.target.value);
                setNicknameError("");
              }}
              style={{
                width: "100%",
                height: "48px",
                marginTop: "16px",
                padding: "0 14px",
                border: "2px solid #d9e7f3",
                borderRadius: "14px",
                fontSize: "16px",
                textAlign: "center",
                outline: "none",
              }}
            />

            <small
              style={{
                display: "block",
                minHeight: "22px",
                marginTop: "8px",
                color: nicknameError ? "#e53935" : "#64748b",
              }}
            >
              {nicknameError || "닉네임은 나중에 변경할 수 있습니다."}
            </small>

            <button
              type="button"
              className="v4-start"
              disabled={nicknameSaving}
              onClick={saveNickname}
            >
              {nicknameSaving ? "저장 중..." : "닉네임 저장하기"}
            </button>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="start-v4" aria-label="TTOK LIFE 시작화면">
      <div className="start-v4-phone">
        <div className="start-v4-sky" aria-hidden="true">
          <i className="v4-cloud c1" />
          <i className="v4-cloud c2" />
          <i className="v4-cloud c3" />
          <div className="v4-city city-left" />
          <div className="v4-city city-right" />
          <div className="v4-bridge">
            <i />
            <i />
            <i />
          </div>
        </div>

        <header className="v4-header">
          <div className="v4-logo">
            <b>TTOK</b>
            <strong>LIFE</strong>
            <em>◆</em>
          </div>
          <p>
            걷기만 해도
            <br />
            실제 상품을 받는 게임!
          </p>
        </header>

        <section className="v4-hero" aria-label="달리는 캐릭터">
          <img
            className="v4-runner girl"
            src="/assets/characters/girl-running.png"
            alt="달리는 여자 캐릭터"
          />
          <img
            className="v4-runner boy"
            src="/assets/characters/boy-running.png"
            alt="달리는 남자 캐릭터"
          />
          <div className="v4-bubble">
            건강도 챙기고
            <br />
            상품도 받자!
          </div>
          <span className="v4-flower f1">✿</span>
          <span className="v4-flower f2">✿</span>
          <span className="v4-flower f3">✿</span>
        </section>

        <section className="v4-panel">
          {savedNickname && (
            <p>{savedNickname}님, 캐릭터를 선택해주세요!</p>
          )}

          <h1>캐릭터를 선택해주세요</h1>

          <div className="v4-options">
            {characters.map((character) => {
              const selected = character.id === characterId;

              return (
                <button
                  key={character.id}
                  type="button"
                  className={`v4-option ${selected ? "selected" : ""}`}
                  onClick={() => setCharacterId(character.id)}
                  aria-pressed={selected}
                >
                  <span className="v4-num">{character.number}</span>
                  {selected && <span className="v4-check">✓</span>}
                  <span className="v4-portrait">
                    <img src={character.image} alt="" />
                  </span>
                  <b>{character.label}</b>
                </button>
              );
            })}
          </div>

          <button type="button" className="v4-start" onClick={startGame}>
            시작하기
          </button>

          <small className="v4-build">START V4</small>
        </section>
      </div>
    </main>
  );
}