import type { MacroAction } from '@/stores/macro-store';

export function reorderMacroActions<T extends MacroAction>(actions: T[], fromIndex: number, toIndex: number): T[] {
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

// 首动作的绝对时间戳不会写入设备（协议只传输动作间隔），统一归零并修复异常的倒序时间戳
export function normalizeMacroTimestamps<T extends MacroAction>(actions: T[]): T[] {
  if (actions.length === 0) return actions;
  const firstTimestamp = Number.isFinite(actions[0].timestamp) ? Math.round(actions[0].timestamp) : 0;
  let previous = 0;
  let changed = false;
  const normalized = actions.map((action, index) => {
    const raw = Number.isFinite(action.timestamp) ? Math.round(action.timestamp) - firstTimestamp : previous;
    const timestamp = index === 0 ? 0 : Math.max(previous, raw, 0);
    previous = timestamp;
    if (timestamp === action.timestamp) return action;
    changed = true;
    return { ...action, timestamp };
  });
  return changed ? normalized : actions;
}
