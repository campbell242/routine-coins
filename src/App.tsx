import { useEffect } from 'react';
import { store, useAppState } from './store/hooks';
import { Toasts } from './ui/components/chrome';
import { Award } from './ui/screens/Award';
import { Home } from './ui/screens/Home';
import { Me } from './ui/screens/Me';
import { ParentArea } from './ui/screens/parent/ParentArea';
import { PinScreen } from './ui/screens/parent/Pin';
import { RoutineScreen } from './ui/screens/Routine';
import { TimerScreen } from './ui/screens/TimerScreen';

export function App() {
  const state = useAppState();

  useEffect(() => {
    void store.init();
  }, []);

  if (!state.ready) {
    return (
      <div className="app-frame" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <img src="assets/coin.png" alt="" style={{ width: 48, height: 48 }} />
      </div>
    );
  }

  let screen: JSX.Element;
  switch (state.route.name) {
    case 'home':
      screen = <Home />;
      break;
    case 'routine':
      screen = <RoutineScreen planId={state.route.planId} />;
      break;
    case 'timer':
      screen = <TimerScreen />;
      break;
    case 'me':
      screen = <Me />;
      break;
    case 'pin':
      screen = <PinScreen />;
      break;
    case 'parent':
      screen = <ParentArea view={state.route.view} reviewOccId={state.route.reviewOccId} />;
      break;
    case 'award':
      screen = <Award />;
      break;
  }

  return (
    <div className="app-frame">
      {screen}
      <Toasts />
    </div>
  );
}
