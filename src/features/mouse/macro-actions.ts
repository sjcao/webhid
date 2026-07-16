import type { MacroAction } from '@/stores/macro-store';

export function reorderMacroActions(actions: MacroAction[], fromIndex: number, toIndex: number) {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= actions.length ||
    toIndex >= actions.length
  ) {
    return actions;
  }

  const delays = actions.map((action, index) => (
    Math.max(0, index === 0 ? action.timestamp : action.timestamp - actions[index - 1].timestamp)
  ));
  const reorderedActions = [...actions];
  const reorderedDelays = [...delays];
  const [action] = reorderedActions.splice(fromIndex, 1);
  const [delay] = reorderedDelays.splice(fromIndex, 1);
  reorderedActions.splice(toIndex, 0, action);
  reorderedDelays.splice(toIndex, 0, delay);

  let timestamp = 0;
  return reorderedActions.map((item, index) => {
    timestamp += reorderedDelays[index];
    return { ...item, timestamp };
  });
}
