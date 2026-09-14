import { useState } from 'react';
import type { ScreenType } from './data/mock';
import { CategoriesScreen } from './screens/CategoriesScreen';
import { GameplayScreen } from './screens/GameplayScreen';
import { VictoryScreen } from './screens/VictoryScreen';
import { GameOverScreen } from './screens/GameOverScreen';
import { DuelScreen } from './screens/DuelScreen';

const SCREEN_MAP: Record<ScreenType, React.FC<{ onNavigate: (s: ScreenType) => void }>> = {
  categories: CategoriesScreen,
  gameplay: GameplayScreen,
  victory: VictoryScreen,
  gameover: GameOverScreen,
  duel: DuelScreen,
};

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('categories');

  const Screen = SCREEN_MAP[currentScreen];

  return (
    <div className="w-full max-w-97.5 min-h-dvh relative overflow-hidden bg-bg">
      <Screen onNavigate={setCurrentScreen} />
    </div>
  );
}
