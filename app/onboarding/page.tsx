"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "./onboarding.module.css";

import { useGame } from "@/context/GameContext";
import type { CharacterId } from "@/lib/game";

const characters: Array<{
  id: CharacterId;
  number: number;
  label: string;
  description: string;
  image: string;
}> = [
  {
    id: "hani",
    number: 1,
    label: "하니",
    description: "밝고 씩씩한 여자 캐릭터",
    image: "/character/hani_idle.png",
  },
  {
    id: "hajun",
    number: 2,
    label: "하준",
    description: "활기차고 든든한 남자 캐릭터",
    image: "/character/hajun_idle.png",
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
  const {
    game,
    patchGame,
    setNickname: setGameNickname,
  } = useGame();

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
    const invite = params.get("invite")?.trim() ?? "";

    if (invite) {
      localStorage.setItem("ttok_invite_code", invite);
    }

    setMemberId(id);
    setMemberName(name);

    if (!id) {
      const localNickname = game.nickname?.trim() ?? "";

      setSavedNickname(localNickname);
      setNickname(localNickname || "똑똑이");
      setNicknameRequired(!localNickname);
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

        const fallbackNickname =
          game.nickname?.trim() || name || "똑똑이";

        setNickname(fallbackNickname);
        setSavedNickname(game.nickname?.trim() ?? "");
        setNicknameRequired(!game.nickname?.trim());
      } finally {
        setNicknameLoading(false);
      }
    };

    void loadNickname();
  }, [game.nickname]);

  const saveNickname = async () => {
    const trimmedNickname = nickname.trim();

    setNicknameError("");

    if (trimmedNickname.length < 2 || trimmedNickname.length > 12) {
      setNicknameError("닉네임은 2자 이상 12자 이하로 입력해주세요.");
      return;
    }

    setNicknameSaving(true);

    try {
      if (memberId) {
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
          throw new Error(
            result.message || "닉네임 저장에 실패했습니다."
          );
        }
      }

      setSavedNickname(trimmedNickname);
      setGameNickname(trimmedNickname);
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
    const finalNickname =
      savedNickname.trim() ||
      nickname.trim() ||
      game.nickname.trim() ||
      "똑똑이";

    const inviteCode =
      localStorage.getItem("ttok_invite_code") ?? "";

    patchGame({
      characterId,
      nickname: finalNickname,
      onboardingComplete: true,
      invitedBy: inviteCode,
    });

    router.push("/home");
  };

  if (nicknameLoading) {
    return (
      <main
        className={styles.root}
        aria-label="TTOK LIFE 회원정보 확인"
      >
        <section className={styles.phone}>
          <div className={styles.loadingCard}>
            <div className={styles.loadingLogo}>
              <span>TTOK</span>
              <strong>LIFE</strong>
            </div>

            <div className={styles.loadingDots} aria-hidden="true">
              <i />
              <i />
              <i />
            </div>

            <h1>회원정보를 확인하고 있어요</h1>
            <p>잠시만 기다려주세요.</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main
      className={styles.root}
      aria-label={
        nicknameRequired
          ? "TTOK LIFE 닉네임 설정"
          : "TTOK LIFE 시작화면"
      }
    >
      <section className={styles.phone}>
        <div className={styles.background} aria-hidden="true" />
        <div className={styles.backgroundShade} aria-hidden="true" />

        <header className={styles.header}>
          <img
            className={styles.logoImage}
            src="/assets/logo/ttok-life-logo.png"
            alt="TTOK LIFE"
          />
        </header>

        <div className={styles.gardenSpace} aria-hidden="true" />

        {nicknameRequired ? (
          <section className={styles.panel}>
            <div className={styles.stepBadge}>STEP 1</div>

            <h1>게임에서 사용할 닉네임을 정해주세요</h1>

            <p className={styles.welcomeText}>
              {memberName
                ? `${memberName}님, 반가워요!`
                : "반가워요!"}
            </p>

            <label className={styles.nicknameField}>
              <span>닉네임</span>

              <input
                type="text"
                value={nickname}
                maxLength={12}
                placeholder="닉네임 2~12자"
                onChange={(event) => {
                  setNickname(event.target.value);
                  setNicknameError("");
                }}
              />

              <b>{nickname.trim().length}/12</b>
            </label>

            <small
              className={
                nicknameError
                  ? styles.errorText
                  : styles.helpText
              }
            >
              {nicknameError ||
                "닉네임은 나중에 마이페이지에서 변경할 수 있습니다."}
            </small>

            <button
              type="button"
              className={styles.primaryButton}
              disabled={nicknameSaving}
              onClick={saveNickname}
            >
              {nicknameSaving
                ? "저장 중..."
                : "닉네임 저장하기"}
            </button>
          </section>
        ) : (
          <section className={styles.panel}>
            <div className={styles.stepBadge}>STEP 2</div>

            <p className={styles.greeting}>
              <strong>{savedNickname || nickname || "똑똑이"}</strong>님,
              함께할 캐릭터를 선택해주세요.
            </p>

            <h1>나의 캐릭터 선택</h1>

            <div className={styles.options}>
              {characters.map((character) => {
                const selected = character.id === characterId;

                return (
                  <button
                    key={character.id}
                    type="button"
                    className={`${styles.option} ${
                      selected ? styles.selected : ""
                    }`}
                    onClick={() => setCharacterId(character.id)}
                    aria-pressed={selected}
                  >
                    <span className={styles.number}>
                      {character.number}
                    </span>

                    {selected && (
                      <span className={styles.check}>✓</span>
                    )}

                    <span className={styles.portrait}>
                      <img
                        src={character.image}
                        alt={character.label}
                      />
                    </span>

                    <strong>{character.label}</strong>
                    <small>{character.description}</small>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              className={styles.primaryButton}
              onClick={startGame}
            >
              TTOK LIFE 시작하기
            </button>

            <small className={styles.build}>
              캐릭터는 나중에 마이페이지에서 변경할 수 있어요.
            </small>
          </section>
        )}
      </section>
    </main>
  );
}
