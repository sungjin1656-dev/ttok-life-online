import { CharacterAvatar } from "@/components/game/CharacterAvatar";
import type { CharacterId } from "@/lib/game";

type TTCharacterProps = {
  id: CharacterId;
  size?: number;
  running?: boolean;
  className?: string;
};

export function TTCharacter({ id, size = 148, running = false, className = "" }: TTCharacterProps) {
  return (
    <div className={`tt-character ${className}`.trim()}>
      <CharacterAvatar id={id} size={size} running={running} />
    </div>
  );
}
