import { Dispatch, SetStateAction, useEffect, useRef } from 'react';
import { keyboardEventToMacroAction, MacroDirection } from '@/stores/macro-store';
import { EditorAction } from './helpers';

type UseMacroKeyCaptureOptions = {
  recording: boolean;
  editingActionId: string | null;
  isInsertingKey: boolean;
  setTempActions: Dispatch<SetStateAction<EditorAction[]>>;
  setEditingActionId: Dispatch<SetStateAction<string | null>>;
  setIsInsertingKey: Dispatch<SetStateAction<boolean>>;
};

// 集中管理宏编辑器的全局键盘捕获。录制、单键改绑、手动插入三种模式互斥，
// 保证同一时刻至多只有一组 window 监听器生效，避免叠加导致的重复写入。
export function useMacroKeyCapture({
  recording,
  editingActionId,
  isInsertingKey,
  setTempActions,
  setEditingActionId,
  setIsInsertingKey,
}: UseMacroKeyCaptureOptions) {
  const startedAt = useRef(0);
  const pressedKeys = useRef(new Set<string>());

  // 录制模式：连续记录按下/抬起，带相对时间戳
  useEffect(() => {
    if (!recording) return undefined;

    const pressed = pressedKeys.current;
    startedAt.current = Date.now();
    pressed.clear();

    const handleKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      if (pressed.has(event.code)) return;
      pressed.add(event.code);

      const action = keyboardEventToMacroAction(event, MacroDirection.Down, Date.now() - startedAt.current);
      if (!action) return;
      setTempActions((prev) => [...prev, { ...action, id: crypto.randomUUID() }]);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      event.preventDefault();
      // 忽略从未按下就抬起的按键（如触发“开始录制”按钮的 Enter）
      if (!pressed.delete(event.code)) return;

      const action = keyboardEventToMacroAction(event, MacroDirection.Up, Date.now() - startedAt.current);
      if (!action) return;
      setTempActions((prev) => [...prev, { ...action, id: crypto.randomUUID() }]);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      pressed.clear();
    };
  }, [recording, setTempActions]);

  // 单键改绑 / 手动插入：均为单次 keydown 捕获，录制期间让位；二者也互斥
  useEffect(() => {
    if (recording) return undefined;
    if (editingActionId === null && !isInsertingKey) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      const captured = keyboardEventToMacroAction(event, MacroDirection.Down, 0);
      if (!captured) return;

      if (editingActionId !== null) {
        // 替换当前行的按键与 HID 代码
        const id = editingActionId;
        setTempActions((prev) =>
          prev.map((act) =>
            act.id === id
              ? { ...act, keyName: captured.keyName, kind: captured.kind, keyCode: captured.keyCode }
              : act
          )
        );
        setEditingActionId(null);
      } else {
        // 自动追加 Down 和 Up 两条指令，中间延迟 100ms
        setTempActions((prev) => {
          const base = prev.length > 0 ? prev[prev.length - 1].timestamp + 100 : 0;
          return [
            ...prev,
            { ...captured, timestamp: base, id: crypto.randomUUID() },
            { ...captured, direction: MacroDirection.Up, timestamp: base + 100, id: crypto.randomUUID() },
          ];
        });
        setIsInsertingKey(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [recording, editingActionId, isInsertingKey, setTempActions, setEditingActionId, setIsInsertingKey]);
}
