"use client";
import { CharacterAvatar } from "@/components/game/CharacterAvatar";
import { BottomNav } from "@/components/ui/BottomNav";
import { Guard } from "@/components/ui/Guard";
import { useGame } from "@/context/GameContext";
import { useRouter } from "next/navigation";
export default function ProfilePage(){const {game,resetGame,patchGame}=useGame();const router=useRouter();return <Guard><section className="screen">
  <h1 className="title">내 정보</h1>
  <div className="game-card" style={{padding:22,marginTop:14,textAlign:"center"}}><CharacterAvatar id={game.characterId} size={160}/><h2 style={{margin:0}}>{game.nickname}</h2><div className="muted">📍 {game.region} · Lv.{game.level}</div></div>
  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginTop:14}}>
    <div className="game-card" style={{padding:13,textAlign:"center"}}>👟<b style={{display:"block"}}>{game.weeklySteps.toLocaleString()}</b><small>누적 걸음</small></div>
    <div className="game-card" style={{padding:13,textAlign:"center"}}>💧<b style={{display:"block"}}>{game.water}</b><small>물방울</small></div>
    <div className="game-card" style={{padding:13,textAlign:"center"}}>🎁<b style={{display:"block"}}>{game.rewards.length}</b><small>수확</small></div>
  </div>
  <button className="game-button secondary" style={{marginTop:16}} onClick={()=>{patchGame({onboardingComplete:false});router.push("/onboarding")}}>캐릭터 다시 선택</button>
  <button className="game-button secondary" style={{marginTop:10,color:"#EB5757"}} onClick={()=>{resetGame();router.replace("/onboarding")}}>게임 데이터 초기화</button>
</section><BottomNav/></Guard>}
