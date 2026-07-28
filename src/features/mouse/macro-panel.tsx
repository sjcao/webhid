import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { MacroActionKind, MacroDirection, useMacroStore } from '@/stores/macro-store';
import { useUiStore } from '@/stores/ui-store';
import { MacroRepeatType } from '@/protocol/mouse';
import { useI18n } from '@/i18n/use-i18n';
import { Button } from '@/shared/ui/button';
import { ConfirmDialog } from '@/shared/ui/dialog';
import { normalizeMacroTimestamps, reorderMacroActions } from './macro-actions';
import {
  EditorAction,
  MOUSE_BUTTON_VALUES,
  MouseButtonKey,
  stripEditorIds,
  toComparableActions,
  toEditorActions,
} from './macro/helpers';
import { MacroSidebar } from './macro/macro-sidebar';
import { MacroToolbar } from './macro/macro-toolbar';
import { MacroActionRow } from './macro/macro-action-row';
import { InsertBar } from './macro/insert-bar';
import { useMacroKeyCapture } from './macro/use-macro-key-capture';

export function MacroPanel() {
  const { t } = useI18n();

  // Zustand Store
  const macros = useMacroStore((state) => state.macros);
  const saveMacro = useMacroStore((state) => state.saveMacro);
  const deleteMacro = useMacroStore((state) => state.deleteMacro);
  const updateMacro = useMacroStore((state) => state.updateMacro);
  const duplicateMacro = useMacroStore((state) => state.duplicateMacro);
  const setMacroEditorDirty = useUiStore((state) => state.setMacroEditorDirty);

  // 编辑器管理状态
  const [selectedMacroId, setSelectedMacroId] = useState<string | null>(null);

  // 选中的宏对象
  const currentMacro = useMemo(() => {
    return macros.find((m) => m.id === selectedMacroId) || null;
  }, [selectedMacroId, macros]);

  // 临时编辑状态 (用于未保存的修改缓存)
  const [tempActions, setTempActions] = useState<EditorAction[]>([]);
  const [tempName, setTempName] = useState('');
  const [repeatType, setRepeatType] = useState<MacroRepeatType>(MacroRepeatType.LoopTimes);
  const [loopTimes, setLoopTimes] = useState(1);

  // 录制相关状态
  const [recording, setRecording] = useState(false);

  // 捕获与编辑动作相关的局部状态
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [isInsertingKey, setIsInsertingKey] = useState(false);
  const [insertMouseMenuOpen, setInsertMouseMenuOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: 'select'; id: string } | { type: 'create' } | null>(null);
  const [deleteMacroId, setDeleteMacroId] = useState<string | null>(null);

  // HTML5 Drag & Drop 拖拽状态
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const draggedIndexRef = useRef<number | null>(null);

  // 已保存动作的序列化只随选中宏变化，独立缓存以避免每次渲染都重复序列化
  const savedActionsJson = useMemo(
    () => (currentMacro ? JSON.stringify(toComparableActions(currentMacro.actions)) : ''),
    [currentMacro]
  );

  const dirty = useMemo(() => {
    if (!currentMacro) return false;
    return (
      tempName !== currentMacro.name ||
      repeatType !== currentMacro.repeatType ||
      loopTimes !== currentMacro.loopTimes ||
      JSON.stringify(stripEditorIds(tempActions)) !== savedActionsJson
    );
  }, [currentMacro, loopTimes, repeatType, tempActions, tempName, savedActionsJson]);

  // 1. 初始化时默认选中第一个宏
  useEffect(() => {
    if (macros.length > 0 && !selectedMacroId) {
      setSelectedMacroId(macros[0].id);
    } else if (macros.length === 0) {
      setSelectedMacroId(null);
    }
  }, [macros, selectedMacroId]);

  // 2. 当切换选中的宏时，将 store 数据同步到临时编辑状态中
  useEffect(() => {
    if (currentMacro) {
      setTempActions(toEditorActions(currentMacro.actions));
      setTempName(currentMacro.name);
      setRepeatType(currentMacro.repeatType);
      setLoopTimes(currentMacro.loopTimes);
    } else {
      setTempActions([]);
      setTempName('');
      setRepeatType(MacroRepeatType.LoopTimes);
      setLoopTimes(1);
    }
    // 切换宏时关闭所有临时状态
    setEditingActionId(null);
    setIsInsertingKey(false);
    setInsertMouseMenuOpen(false);
  }, [currentMacro]);

  useEffect(() => {
    setMacroEditorDirty(dirty);
  }, [dirty, setMacroEditorDirty]);

  useEffect(() => () => setMacroEditorDirty(false), [setMacroEditorDirty]);

  // beforeunload 只注册一次，通过 ref 读取最新 dirty，避免每次切换都增删监听器
  const dirtyRef = useRef(dirty);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (dirtyRef.current) event.preventDefault();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // 3. 全局键盘捕获（录制 / 单键改绑 / 手动插入）统一由 hook 管理，三种模式互斥
  useMacroKeyCapture({
    recording,
    editingActionId,
    isInsertingKey,
    setTempActions,
    setEditingActionId,
    setIsInsertingKey,
  });

  // 开始/停止录制：开始时关闭改绑与插入模式，停止时把首动作时间戳归零
  function toggleRecording() {
    if (recording) {
      setRecording(false);
      setTempActions((prev) => normalizeMacroTimestamps(prev));
    } else {
      setEditingActionId(null);
      setIsInsertingKey(false);
      setInsertMouseMenuOpen(false);
      setRecording(true);
    }
  }

  // 新建一个宏快捷指令
  function createMacro() {
    const newName = `M${macros.length + 1}`;
    const newMacro = saveMacro({
      name: newName,
      repeatType: MacroRepeatType.LoopTimes,
      loopTimes: 1,
      actions: [],
    });
    setSelectedMacroId(newMacro.id);
  }

  function handleCreateNew() {
    if (dirty) {
      setPendingAction({ type: 'create' });
      return;
    }
    createMacro();
  }

  function selectMacro(id: string) {
    if (id === selectedMacroId) return;
    if (dirty) {
      setPendingAction({ type: 'select', id });
      return;
    }
    setSelectedMacroId(id);
  }

  // 保存当前修改
  function handleSave() {
    if (!selectedMacroId) return;
    updateMacro(selectedMacroId, {
      name: tempName.trim(),
      repeatType,
      loopTimes,
      actions: stripEditorIds(tempActions),
    });
  }

  // 复制克隆宏
  function handleDuplicate() {
    if (!selectedMacroId) return;
    duplicateMacro(selectedMacroId, t('mouse.copySuffix'));
  }

  function resetDraft() {
    if (!currentMacro) return;
    setTempName(currentMacro.name);
    setRepeatType(currentMacro.repeatType);
    setLoopTimes(currentMacro.loopTimes);
    setTempActions(toEditorActions(currentMacro.actions));
  }

  // 删除宏
  function handleDelete(id: string) {
    setDeleteMacroId(id);
  }

  function confirmDelete() {
    if (!deleteMacroId) return;
    const id = deleteMacroId;
    deleteMacro(id);
    if (selectedMacroId === id) {
      setSelectedMacroId(null);
    }
    setDeleteMacroId(null);
  }

  function confirmDiscard() {
    const action = pendingAction;
    setPendingAction(null);
    if (!action) return;
    if (action.type === 'create') createMacro();
    if (action.type === 'select') setSelectedMacroId(action.id);
  }

  // 修改延迟毫秒数 (平移时间轴算法)
  const handleDelayChange = useCallback((idx: number, newVal: number) => {
    setTempActions((prev) => {
      const prevTimestamp = idx === 0 ? 0 : prev[idx - 1].timestamp;
      const currentDelay = prev[idx].timestamp - prevTimestamp;
      const diff = newVal - currentDelay;
      if (diff === 0) return prev;
      return prev.map((act, i) => (i >= idx ? { ...act, timestamp: act.timestamp + diff } : act));
    });
  }, []);

  // 切换按下/抬起方向
  const toggleDirection = useCallback((id: string, direction: MacroDirection) => {
    setTempActions((prev) =>
      prev.map((act) => (act.id === id && act.direction !== direction ? { ...act, direction } : act))
    );
  }, []);

  // 删除单个动作
  const removeAction = useCallback((idx: number) => {
    setTempActions((prev) => {
      const delayOfRemoved = idx === 0 ? prev[idx].timestamp : prev[idx].timestamp - prev[idx - 1].timestamp;

      // 删除该项后，将后续的各项绝对时间戳向前平移以消除这一动作的相对延迟
      const nextActions = prev
        .filter((_, i) => i !== idx)
        .map((act, i) => {
          if (i >= idx) {
            return { ...act, timestamp: act.timestamp - delayOfRemoved };
          }
          return act;
        });
      return normalizeMacroTimestamps(nextActions);
    });
  }, []);

  // 进入改绑捕获时退出插入模式，保证同一时刻只有一个键盘监听器生效
  const handleToggleCapture = useCallback((id: string) => {
    setIsInsertingKey(false);
    setEditingActionId((current) => (current === id ? null : id));
  }, []);

  // 手动追加或修改替换鼠标动作
  function insertMouseAction(button: MouseButtonKey, direction: MacroDirection) {
    const value = MOUSE_BUTTON_VALUES[button];
    if (editingActionId !== null) {
      // 替换修改当前选中的动作
      const id = editingActionId;
      setTempActions((prev) =>
        prev.map((act) =>
          act.id === id
            ? { ...act, keyName: button, kind: MacroActionKind.Mouse, direction, keyCode: [value] }
            : act
        )
      );
      setEditingActionId(null);
    } else {
      // 追加到末尾
      setTempActions((prev) => {
        const base = prev.length > 0 ? prev[prev.length - 1].timestamp + 100 : 0;
        return [
          ...prev,
          {
            keyName: button,
            kind: MacroActionKind.Mouse,
            direction,
            keyCode: [value],
            timestamp: base,
            id: crypto.randomUUID(),
          },
        ];
      });
    }
    setInsertMouseMenuOpen(false);
  }

  // HTML5 拖拽事件处理 (基于保留相对间隔的重排算法)
  const onDragStart = useCallback((index: number) => {
    draggedIndexRef.current = index;
    setDraggedIndex(index);
  }, []);

  const onDrop = useCallback((index: number) => {
    const from = draggedIndexRef.current;
    draggedIndexRef.current = null;
    setDraggedIndex(null);
    if (from === null || from === index) return;
    setTempActions((prev) => normalizeMacroTimestamps(reorderMacroActions(prev, from, index)));
  }, []);

  const onDragEnd = useCallback(() => {
    draggedIndexRef.current = null;
    setDraggedIndex(null);
  }, []);

  const moveAction = useCallback((index: number, offset: -1 | 1) => {
    setTempActions((actions) => normalizeMacroTimestamps(reorderMacroActions(actions, index, index + offset)));
  }, []);

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-driver-bg text-driver-text">

      {/* 左侧侧边栏：已创建的宏列表 */}
      <MacroSidebar
        macros={macros}
        selectedMacroId={selectedMacroId}
        recording={recording}
        onSelect={selectMacro}
        onCreate={handleCreateNew}
        onDelete={handleDelete}
      />

      {/* 右侧主详情面板：可视化动作流编辑器 */}
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col bg-driver-bg">

        {currentMacro ? (
          <div className="flex h-full min-h-0 flex-1 flex-col">
            {/* 顶部工具控制栏 */}
            <MacroToolbar
              name={tempName}
              dirty={dirty}
              recording={recording}
              repeatType={repeatType}
              loopTimes={loopTimes}
              onNameChange={setTempName}
              onRepeatTypeChange={setRepeatType}
              onLoopTimesChange={setLoopTimes}
              onToggleRecording={toggleRecording}
              onDuplicate={handleDuplicate}
              onReset={resetDraft}
              onSave={handleSave}
            />

            {/* 动作序列列表 */}
            <div className="flex-1 space-y-2 overflow-y-auto p-4 min-[1200px]:p-6">

              {tempActions.map((action, idx) => {
                const prevTimestamp = idx === 0 ? 0 : tempActions[idx - 1].timestamp;
                return (
                  <MacroActionRow
                    key={action.id}
                    action={action}
                    index={idx}
                    count={tempActions.length}
                    delay={action.timestamp - prevTimestamp}
                    recording={recording}
                    isCapturing={editingActionId === action.id}
                    isDragged={draggedIndex === idx}
                    onToggleCapture={handleToggleCapture}
                    onMove={moveAction}
                    onToggleDirection={toggleDirection}
                    onDelayChange={handleDelayChange}
                    onRemove={removeAction}
                    onDragStart={onDragStart}
                    onDrop={onDrop}
                    onDragEnd={onDragEnd}
                  />
                );
              })}

              {tempActions.length === 0 && !recording && (
                <div className="rounded-lg border border-dashed border-driver-line bg-driver-panel py-20 text-center">
                  <div className="mb-2 text-sm font-bold text-driver-text">
                    {t('mouse.emptyActionsTitle')}
                  </div>
                  <div className="text-xs leading-relaxed text-driver-muted">
                    {t('mouse.emptyActionsHint')}
                  </div>
                </div>
              )}

              {recording && tempActions.length === 0 && (
                <div className="animate-pulse rounded-lg border border-dashed border-warn/30 bg-warn/5 py-20 text-center">
                  <div className="mb-2 text-sm font-bold text-warn">
                    {t('mouse.recordingActions')}
                  </div>
                  <div className="text-xs font-semibold text-warn/70">
                    {t('mouse.recordingActionsHint')}
                  </div>
                </div>
              )}
            </div>

            {/* 底部手动插入控制栏 */}
            <InsertBar
              recording={recording}
              isInsertingKey={isInsertingKey}
              menuOpen={insertMouseMenuOpen}
              onToggleInsertKey={() => {
                setEditingActionId(null);
                setIsInsertingKey((prev) => !prev);
              }}
              onToggleMenu={() => setInsertMouseMenuOpen((prev) => !prev)}
              onCloseMenu={() => setInsertMouseMenuOpen(false)}
              onInsert={insertMouseAction}
            />

          </div>
        ) : (
          /* 空白配置占位页 */
          <div className="m-6 flex flex-1 flex-col items-center justify-center rounded-lg border border-driver-line bg-driver-panel p-8 shadow-sm">
            <div className="mb-4 rounded-full bg-driver-raised p-5 text-driver-muted">
              <Plus size={42} />
            </div>
            <h3 className="mb-1 text-sm font-black text-driver-text">
              {t('mouse.noShortcutTitle')}
            </h3>
            <p className="mb-5 max-w-sm text-center text-xs leading-normal text-driver-muted">
              {t('mouse.noShortcutHint')}
            </p>
            <Button
              variant="black"
              onClick={handleCreateNew}
              className="h-10 rounded-md px-6 text-xs font-bold shadow-sm"
            >
              {t('mouse.newShortcut')}
            </Button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={pendingAction !== null}
        title={t('mouse.discardChanges')}
        description={t('mouse.discardChangesHint')}
        confirmLabel={t('mouse.discardChanges')}
        cancelLabel={t('mouse.cancel')}
        confirmVariant="danger"
        onOpenChange={(open) => !open && setPendingAction(null)}
        onConfirm={confirmDiscard}
      />
      <ConfirmDialog
        open={deleteMacroId !== null}
        title={t('mouse.deleteMacroTitle')}
        description={t('mouse.deleteMacroHint')}
        confirmLabel={t('mouse.delete')}
        cancelLabel={t('mouse.cancel')}
        confirmVariant="danger"
        onOpenChange={(open) => !open && setDeleteMacroId(null)}
        onConfirm={confirmDelete}
      />

    </div>
  );
}
