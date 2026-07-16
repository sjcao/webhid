import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Play, Square, Copy, RotateCcw, Save, Trash2, Plus, Menu, Keyboard, Mouse } from 'lucide-react';
import { useMacroStore, MacroAction, MacroActionKind, MacroDirection } from '@/stores/macro-store';
import { useUiStore } from '@/stores/ui-store';
import { browserKeyToHid, MacroRepeatType } from '@/protocol/mouse';
import { useI18n } from '@/i18n/use-i18n';
import { Button } from '@/shared/ui/button';
import { ConfirmDialog } from '@/shared/ui/dialog';
import { reorderMacroActions } from './macro-actions';

export function MacroPanel() {
  const { locale, t } = useI18n();

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
  const [tempActions, setTempActions] = useState<MacroAction[]>([]);
  const [tempName, setTempName] = useState('');
  const [repeatType, setRepeatType] = useState<MacroRepeatType>(MacroRepeatType.LoopTimes);
  const [loopTimes, setLoopTimes] = useState(1);

  // 录制相关状态
  const [recording, setRecording] = useState(false);
  const startedAt = useRef(0);
  const pressedKeys = useRef(new Set<string>());

  // 捕获与编辑动作相关的局部状态
  const [editingActionIndex, setEditingActionIndex] = useState<number | null>(null);
  const [isInsertingKey, setIsInsertingKey] = useState(false);
  const [insertMouseMenuOpen, setInsertMouseMenuOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: 'select'; id: string } | { type: 'create' } | null>(null);
  const [deleteMacroId, setDeleteMacroId] = useState<string | null>(null);

  // HTML5 Drag & Drop 拖拽状态
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const dirty = useMemo(() => {
    if (!currentMacro) return false;
    return (
      tempName !== currentMacro.name ||
      repeatType !== currentMacro.repeatType ||
      loopTimes !== currentMacro.loopTimes ||
      JSON.stringify(tempActions) !== JSON.stringify(currentMacro.actions)
    );
  }, [currentMacro, loopTimes, repeatType, tempActions, tempName]);

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
      setTempActions(currentMacro.actions.map((act) => ({ ...act })));
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
    setEditingActionIndex(null);
    setIsInsertingKey(false);
    setInsertMouseMenuOpen(false);
  }, [currentMacro]);

  useEffect(() => {
    setMacroEditorDirty(dirty);
  }, [dirty, setMacroEditorDirty]);

  useEffect(() => () => setMacroEditorDirty(false), [setMacroEditorDirty]);

  useEffect(() => {
    if (!dirty) return undefined;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirty]);

  // 3. 全局键盘录制逻辑
  useEffect(() => {
    if (!recording) return undefined;
    
    startedAt.current = Date.now();
    pressedKeys.current.clear();

    const handleKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      if (pressedKeys.current.has(event.code)) return;
      pressedKeys.current.add(event.code);

      const hidCode = browserKeyToHid[event.key] ?? browserKeyToHid[event.key.toLowerCase()] ?? browserKeyToHid[event.code];
      if (!hidCode) return;

      const newAction: MacroAction = {
        keyName: event.key === ' ' ? 'Space' : event.key,
        kind: MacroActionKind.Keyboard,
        direction: MacroDirection.Down,
        keyCode: hidCode,
        timestamp: Date.now() - startedAt.current,
      };
      setTempActions((prev) => [...prev, newAction]);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      event.preventDefault();
      pressedKeys.current.delete(event.code);

      const hidCode = browserKeyToHid[event.key] ?? browserKeyToHid[event.key.toLowerCase()] ?? browserKeyToHid[event.code];
      if (!hidCode) return;

      const newAction: MacroAction = {
        keyName: event.key === ' ' ? 'Space' : event.key,
        kind: MacroActionKind.Keyboard,
        direction: MacroDirection.Up,
        keyCode: hidCode,
        timestamp: Date.now() - startedAt.current,
      };
      setTempActions((prev) => [...prev, newAction]);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      pressedKeys.current.clear();
    };
  }, [recording]);

  // 4. 按键单个动作捕获修改逻辑
  useEffect(() => {
    if (editingActionIndex === null) return undefined;

    const handleSingleCapture = (event: KeyboardEvent) => {
      event.preventDefault();
      const code = browserKeyToHid[event.key] ?? browserKeyToHid[event.key.toLowerCase()] ?? browserKeyToHid[event.code];
      if (!code) return;

      // 更新该行的按键和 HID 代码
      setTempActions((prev) =>
        prev.map((act, idx) => {
          if (idx === editingActionIndex) {
            return {
              ...act,
              keyName: event.key === ' ' ? 'Space' : event.key,
              keyCode: code,
            };
          }
          return act;
        })
      );
      setEditingActionIndex(null);
    };

    window.addEventListener('keydown', handleSingleCapture);
    return () => window.removeEventListener('keydown', handleSingleCapture);
  }, [editingActionIndex]);

  // 5. 底部手动插入键盘按键监听
  useEffect(() => {
    if (!isInsertingKey) return undefined;

    const handleInsertCapture = (event: KeyboardEvent) => {
      event.preventDefault();
      const code = browserKeyToHid[event.key] ?? browserKeyToHid[event.key.toLowerCase()] ?? browserKeyToHid[event.code];
      if (!code) return;

      // 自动追加 Down 和 Up 两条指令，中间延迟 100ms
      const lastTimestamp = tempActions.length > 0 ? tempActions[tempActions.length - 1].timestamp : 0;
      const downAction: MacroAction = {
        keyName: event.key === ' ' ? 'Space' : event.key,
        kind: MacroActionKind.Keyboard,
        direction: MacroDirection.Down,
        keyCode: code,
        timestamp: lastTimestamp + 100,
      };
      const upAction: MacroAction = {
        keyName: event.key === ' ' ? 'Space' : event.key,
        kind: MacroActionKind.Keyboard,
        direction: MacroDirection.Up,
        keyCode: code,
        timestamp: lastTimestamp + 200,
      };

      setTempActions((prev) => [...prev, downAction, upAction]);
      setIsInsertingKey(false);
    };

    window.addEventListener('keydown', handleInsertCapture);
    return () => window.removeEventListener('keydown', handleInsertCapture);
  }, [isInsertingKey, tempActions]);

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
      actions: tempActions,
    });
  }

  // 复制克隆宏
  function handleDuplicate() {
    if (!selectedMacroId) return;
    duplicateMacro(selectedMacroId, locale === 'zh-CN' ? '副本' : 'Clone');
  }

  function resetDraft() {
    if (!currentMacro) return;
    setTempName(currentMacro.name);
    setRepeatType(currentMacro.repeatType);
    setLoopTimes(currentMacro.loopTimes);
    setTempActions(currentMacro.actions.map((action) => ({ ...action })));
  }

  // 删除宏
  function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
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
  function handleDelayChange(idx: number, newVal: number) {
    const prevTimestamp = idx === 0 ? 0 : tempActions[idx - 1].timestamp;
    const currentDelay = tempActions[idx].timestamp - prevTimestamp;
    const diff = newVal - currentDelay;

    const nextActions = tempActions.map((act, i) => {
      if (i >= idx) {
        return { ...act, timestamp: act.timestamp + diff };
      }
      return act;
    });
    setTempActions(nextActions);
  }

  // 切换按下/抬起方向
  function toggleDirection(idx: number, dir: MacroDirection) {
    setTempActions((prev) =>
      prev.map((act, i) => (i === idx ? { ...act, direction: dir } : act))
    );
  }

  // 删除单个动作
  function removeAction(idx: number) {
    const delayOfRemoved = idx === 0 ? tempActions[idx].timestamp : tempActions[idx].timestamp - tempActions[idx - 1].timestamp;
    
    // 删除该项后，将后续的各项绝对时间戳向前平移以消除这一动作的相对延迟
    const nextActions = tempActions
      .filter((_, i) => i !== idx)
      .map((act, i) => {
        if (i >= idx) {
          return { ...act, timestamp: act.timestamp - delayOfRemoved };
        }
        return act;
      });
    setTempActions(nextActions);
  }

  // 手动追加或修改替换鼠标动作
  function insertMouseAction(btnName: string, btnValue: number, direction: MacroDirection) {
    if (editingActionIndex !== null) {
      // 替换修改当前选中的动作
      setTempActions((prev) =>
        prev.map((act, idx) => {
          if (idx === editingActionIndex) {
            return {
              ...act,
              keyName: btnName,
              kind: MacroActionKind.Mouse,
              direction,
              keyCode: [btnValue],
            };
          }
          return act;
        })
      );
      setEditingActionIndex(null);
    } else {
      // 追加到末尾
      const lastTimestamp = tempActions.length > 0 ? tempActions[tempActions.length - 1].timestamp : 0;
      const newAction: MacroAction = {
        keyName: btnName,
        kind: MacroActionKind.Mouse,
        direction,
        keyCode: [btnValue],
        timestamp: lastTimestamp + 100,
      };
      setTempActions((prev) => [...prev, newAction]);
    }
    setInsertMouseMenuOpen(false);
  }

  // HTML5 拖拽事件处理 (基于保留相对间隔的重排算法)
  function onDragStart(index: number) {
    setDraggedIndex(index);
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function onDrop(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    setTempActions(reorderMacroActions(tempActions, draggedIndex, index));
    setDraggedIndex(null);
  }

  function moveAction(index: number, offset: -1 | 1) {
    setTempActions((actions) => reorderMacroActions(actions, index, index + offset));
  }

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-driver-bg text-driver-text">

      {/* 左侧侧边栏：已创建的宏列表 */}
      <div className="relative flex h-full w-[220px] shrink-0 flex-col border-r border-driver-line bg-driver-panel p-4 min-[1200px]:w-[240px]">
        {recording && <div className="absolute inset-0 z-20 bg-driver-panel/75 backdrop-blur-[2px]" aria-hidden="true" />}
        <h2 className="mb-3 text-sm font-black uppercase tracking-wider text-driver-muted">
          {locale === 'zh-CN' ? '快捷指令库' : 'Shortcuts Library'}
        </h2>
        
        {/* 新建按钮 */}
        <Button
          variant="black"
          onClick={handleCreateNew}
          className="mb-4 flex h-10 w-full items-center justify-center gap-2 rounded-md text-xs font-bold shadow-sm"
        >
          <Plus size={15} />
          {locale === 'zh-CN' ? '新建快捷指令' : 'New Shortcut'}
        </Button>

        {/* 宏项列表 */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          {macros.map((macro) => {
            const active = selectedMacroId === macro.id;
            return (
              <div
                key={macro.id}
                className={`group flex min-h-11 items-center justify-between rounded-md border transition duration-200 ${
                  active
                    ? 'border-warn bg-warn/5 text-warn'
                    : 'border-driver-line bg-driver-panel hover:bg-driver-hover'
                }`}
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-warn"
                  aria-pressed={active}
                  onClick={() => selectMacro(macro.id)}
                >
                  <span className="block truncate text-xs font-bold">{macro.name}</span>
                  <span className="mt-0.5 block text-[9px] font-semibold text-driver-muted">
                    {macro.actions.length} {locale === 'zh-CN' ? '动作' : 'acts'}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`${t('mouse.delete')} ${macro.name}`}
                  title={t('mouse.delete')}
                  onClick={(e) => handleDelete(macro.id, e)}
                  className="mr-2 rounded p-1 text-driver-muted opacity-60 transition hover:bg-driver-raised hover:text-danger focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger group-hover:opacity-100"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}

          {macros.length === 0 && (
            <div className="py-12 text-center text-xs font-medium leading-relaxed text-driver-muted">
              {locale === 'zh-CN' ? '暂无配置，请点击上方按钮新建' : 'No shortcuts yet. Click above to create one.'}
            </div>
          )}
        </div>
      </div>

      {/* 右侧主详情面板：可视化动作流编辑器 */}
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col bg-driver-bg">
        
        {currentMacro ? (
          <div className="flex h-full min-h-0 flex-1 flex-col">
            {/* 顶部工具控制栏 */}
            <div className="flex min-h-14 shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-driver-line bg-driver-panel px-6 py-2.5 shadow-sm">
              <div className="flex shrink-0 items-center gap-2">
                <span className="whitespace-nowrap text-xs font-bold text-driver-muted">{locale === 'zh-CN' ? '指令名称' : 'Name'}:</span>
                <input
                  type="text"
                  maxLength={20}
                  disabled={recording}
                  aria-label={locale === 'zh-CN' ? '指令名称' : 'Shortcut name'}
                  className="h-8 w-36 rounded border border-driver-line bg-driver-raised px-2.5 text-xs font-bold text-driver-text outline-none focus:border-warn disabled:opacity-50 min-[1200px]:w-40"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                />
                <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${dirty ? 'bg-warn/10 text-warn' : 'bg-success/10 text-success'}`}>
                  {dirty ? t('mouse.unsaved') : t('mouse.saved')}
                </span>
              </div>

              {/* 循环参数设置 */}
              <div className="flex shrink-0 items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="whitespace-nowrap text-xs font-bold text-driver-muted">{locale === 'zh-CN' ? '循环方式' : 'Loop Mode'}:</span>
                  <select
                    disabled={recording}
                    aria-label={locale === 'zh-CN' ? '循环方式' : 'Loop mode'}
                    className="h-8 rounded border border-driver-line bg-driver-raised px-2 text-xs font-bold text-driver-text outline-none focus:border-warn disabled:opacity-50"
                    value={repeatType}
                    onChange={(e) => setRepeatType(Number(e.target.value) as MacroRepeatType)}
                  >
                    <option value={MacroRepeatType.LoopTimes}>{locale === 'zh-CN' ? '循环指定次数' : 'Loop Times'}</option>
                    <option value={MacroRepeatType.Hold}>{locale === 'zh-CN' ? '按住循环' : 'Hold Loop'}</option>
                    <option value={MacroRepeatType.UntilAssignedKey}>{locale === 'zh-CN' ? '循环至松开' : 'Until Assigned Key'}</option>
                    <option value={MacroRepeatType.UntilAnyKey}>{locale === 'zh-CN' ? '循环至按任意键' : 'Until Any Key'}</option>
                  </select>
                </div>

                {repeatType === MacroRepeatType.LoopTimes && (
                  <div className="flex items-center gap-2">
                    <span className="whitespace-nowrap text-xs font-bold text-driver-muted">{locale === 'zh-CN' ? '循环次数' : 'Count'}:</span>
                    <input
                      type="number"
                      min={1}
                      max={255}
                      disabled={recording}
                      aria-label={locale === 'zh-CN' ? '循环次数' : 'Loop count'}
                      className="h-8 w-16 rounded border border-driver-line bg-driver-raised px-2 text-xs font-bold text-driver-text outline-none focus:border-warn disabled:opacity-50"
                      value={loopTimes}
                      onChange={(e) => setLoopTimes(Math.min(255, Math.max(1, Number(e.target.value))))}
                    />
                  </div>
                )}
              </div>

              {/* 控制按钮组 */}
              <div className="flex shrink-0 items-center gap-1.5 ml-auto">
                <Button
                  variant={recording ? 'danger' : 'black'}
                  onClick={() => setRecording((prev) => !prev)}
                  className={`flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap text-xs font-bold transition-all duration-200 ${
                    recording ? 'z-50 relative shadow-[0_0_15px_rgba(239,68,68,0.45)] ring-2 ring-red-500' : ''
                  }`}
                >
                  {recording ? (
                    <>
                      <Square size={13} fill="white" className="shrink-0" />
                      <span className="whitespace-nowrap">{locale === 'zh-CN' ? '停止录制' : 'Stop Record'}</span>
                    </>
                  ) : (
                    <>
                      <Play size={13} fill="white" className="shrink-0" />
                      <span className="whitespace-nowrap">{locale === 'zh-CN' ? '开始录制' : 'Start Record'}</span>
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={handleDuplicate}
                  disabled={recording}
                  className="flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap border border-driver-line bg-driver-panel text-xs font-bold text-driver-text shadow-sm hover:bg-driver-hover"
                >
                  <Copy size={13} className="shrink-0" />
                  <span className="whitespace-nowrap">{locale === 'zh-CN' ? '复制' : 'Clone'}</span>
                </Button>

                <Button
                  onClick={resetDraft}
                  disabled={recording}
                  className="flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap border border-driver-line bg-driver-panel text-xs font-bold text-driver-text shadow-sm hover:bg-driver-hover"
                >
                  <RotateCcw size={13} className="shrink-0" />
                  <span className="whitespace-nowrap">{locale === 'zh-CN' ? '重置' : 'Reset'}</span>
                </Button>

                <Button
                  onClick={handleSave}
                  disabled={recording || !tempName.trim() || !dirty}
                  className="flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap bg-driver-text text-xs font-bold text-driver-panel shadow-sm hover:opacity-90"
                >
                  <Save size={13} className="shrink-0" />
                  <span className="whitespace-nowrap">{locale === 'zh-CN' ? '保存' : 'Save'}</span>
                </Button>
              </div>
            </div>

            {/* 动作序列列表 */}
            <div className="flex-1 space-y-2 overflow-y-auto p-4 min-[1200px]:p-6">
              
              {tempActions.map((action, idx) => {
                const prevTimestamp = idx === 0 ? 0 : tempActions[idx - 1].timestamp;
                const delay = action.timestamp - prevTimestamp;
                const isDown = action.direction === MacroDirection.Down;
                const isCapturing = editingActionIndex === idx;

                return (
                  <div
                    key={`${action.keyName}-${action.timestamp}-${idx}`}
                    draggable={!recording}
                    onDragStart={() => onDragStart(idx)}
                    onDragOver={(e) => onDragOver(e)}
                    onDrop={(e) => onDrop(e, idx)}
                    className={`flex min-h-14 items-center justify-between gap-3 rounded-lg border border-driver-line bg-driver-panel px-3 py-2 shadow-sm transition duration-150 min-[1200px]:px-4 ${
                      draggedIndex === idx ? 'scale-95 border-dashed border-warn opacity-40' : 'hover:bg-driver-hover'
                    }`}
                  >
                    {/* 左侧：手柄和动作名 */}
                      <div className="flex min-w-0 items-center gap-2 min-[1200px]:gap-4">
                      {!recording && (
                        <div className="cursor-grab text-driver-muted hover:text-driver-text" title={locale === 'zh-CN' ? '拖拽排序' : 'Drag to sort'}>
                          <Menu size={16} />
                        </div>
                      )}
                      
                      {/* 按键名胶囊徽标 */}
                      <div className="relative group/btn">
                        <button
                          type="button"
                          disabled={recording}
                          onClick={() => setEditingActionIndex(isCapturing ? null : idx)}
                          className={`flex h-9 items-center justify-center rounded px-4 text-xs font-black min-w-16 transition ${
                            isCapturing
                              ? 'animate-pulse border border-warn bg-warn text-white'
                              : 'border border-driver-line bg-driver-raised text-driver-text hover:bg-driver-hover'
                          }`}
                        >
                          {isCapturing
                            ? (locale === 'zh-CN' ? '按键...' : 'Key...')
                            : (function() {
                                const map: Record<string, { zh: string; en: string }> = {
                                  '左键按下': { zh: '左键按下', en: 'Left Down' },
                                  '左键抬起': { zh: '左键抬起', en: 'Left Up' },
                                  '右键按下': { zh: '右键按下', en: 'Right Down' },
                                  '右键抬起': { zh: '右键抬起', en: 'Right Up' },
                                  '中键按下': { zh: '中键按下', en: 'Middle Down' },
                                  '中键抬起': { zh: '中键抬起', en: 'Middle Up' },
                                };
                                return map[action.keyName]
                                  ? (locale === 'zh-CN' ? map[action.keyName].zh : map[action.keyName].en)
                                  : action.keyName;
                              })()}
                        </button>
                        
                        {/* 悬浮提示气泡卡片 */}
                        {!recording && !isCapturing && (
                          <div className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-50 -translate-x-1/2 scale-0 whitespace-nowrap rounded bg-driver-text px-2.5 py-1 text-[10px] font-bold text-driver-panel shadow-lg transition duration-150 group-hover/btn:scale-100 group-focus-within/btn:scale-100">
                            {locale === 'zh-CN' ? '按任意键修改绑定' : 'Press key to modify'}
                            <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-driver-text" />
                          </div>
                        )}
                      </div>

                      {/* 动作类型说明 */}
                      <span className="text-[10px] font-black uppercase text-driver-muted">
                        {action.kind === MacroActionKind.Mouse ? (locale === 'zh-CN' ? '鼠标' : 'Mouse') : (locale === 'zh-CN' ? '键盘' : 'Keyboard')}
                      </span>
                    </div>

                    {/* 右侧：方向按钮、延迟输入框和删除 */}
                    <div className="flex shrink-0 items-center gap-2 min-[1200px]:gap-3">
                      <div className="flex items-center rounded bg-driver-raised p-0.5">
                        <button
                          type="button"
                          disabled={recording || idx === 0}
                          onClick={() => moveAction(idx, -1)}
                          aria-label={t('mouse.moveUp')}
                          title={t('mouse.moveUp')}
                          className="rounded p-1.5 text-driver-muted transition hover:bg-driver-hover hover:text-driver-text disabled:opacity-30"
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button
                          type="button"
                          disabled={recording || idx === tempActions.length - 1}
                          onClick={() => moveAction(idx, 1)}
                          aria-label={t('mouse.moveDown')}
                          title={t('mouse.moveDown')}
                          className="rounded p-1.5 text-driver-muted transition hover:bg-driver-hover hover:text-driver-text disabled:opacity-30"
                        >
                          <ArrowDown size={13} />
                        </button>
                      </div>
                      {/* 方向单选按钮 */}
                      <div className="flex rounded bg-driver-raised p-0.5">
                        <button
                          type="button"
                          disabled={recording}
                          onClick={() => toggleDirection(idx, MacroDirection.Down)}
                          className={`rounded px-3 py-1.5 text-[10px] font-black transition flex items-center gap-1 ${
                            isDown
                              ? 'bg-driver-text text-driver-panel shadow-sm'
                              : 'text-driver-muted hover:bg-driver-hover'
                          }`}
                        >
                          ↓ {locale === 'zh-CN' ? '按下' : 'Down'}
                        </button>
                        <button
                          type="button"
                          disabled={recording}
                          onClick={() => toggleDirection(idx, MacroDirection.Up)}
                          className={`rounded px-3 py-1.5 text-[10px] font-black transition flex items-center gap-1 ${
                            !isDown
                              ? 'bg-driver-text text-driver-panel shadow-sm'
                              : 'text-driver-muted hover:bg-driver-hover'
                          }`}
                        >
                          ↑ {locale === 'zh-CN' ? '抬起' : 'Up'}
                        </button>
                      </div>

                      {/* 延迟时间修改 */}
                      <DelayInput
                        value={delay}
                        disabled={recording}
                        onChange={(newVal) => handleDelayChange(idx, newVal)}
                      />

                      {/* 删除单个动作 */}
                      <button
                        type="button"
                        disabled={recording}
                        onClick={() => removeAction(idx)}
                        aria-label={t('mouse.delete')}
                        title={t('mouse.delete')}
                        className="rounded p-1.5 text-driver-muted transition hover:bg-driver-hover hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {tempActions.length === 0 && !recording && (
                <div className="rounded-lg border border-dashed border-driver-line bg-driver-panel py-20 text-center">
                  <div className="mb-2 text-sm font-bold text-driver-text">
                    {locale === 'zh-CN' ? '动作列表空空如也' : 'Action Sequence is Empty'}
                  </div>
                  <div className="text-xs leading-relaxed text-driver-muted">
                    {locale === 'zh-CN' ? '请点击上方“开始录制”记录按键，或使用下方按钮手动添加动作。' : 'Click "Start Record" to record keyboard, or use buttons below to insert.'}
                  </div>
                </div>
              )}

              {recording && tempActions.length === 0 && (
                <div className="animate-pulse rounded-lg border border-dashed border-warn/30 bg-warn/5 py-20 text-center">
                  <div className="mb-2 text-sm font-bold text-warn">
                    {locale === 'zh-CN' ? '正在录制动作...' : 'Recording keyboard input...'}
                  </div>
                  <div className="text-xs font-semibold text-warn/70">
                    {locale === 'zh-CN' ? '请在键盘上按下组合按键，实时捕获序列流。' : 'Please press keys on your keyboard.'}
                  </div>
                </div>
              )}
            </div>

            {/* 底部手动插入控制栏 */}
            <div className="flex h-16 shrink-0 items-center gap-3 border-t border-driver-line bg-driver-panel px-6">
              
              {/* 插入键盘按键 */}
              <button
                type="button"
                disabled={recording}
                onClick={() => setIsInsertingKey((prev) => !prev)}
                className={`flex h-10 items-center gap-2 rounded-md border px-5 text-xs font-bold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  isInsertingKey
                    ? 'animate-pulse border-warn bg-warn/5 text-warn'
                    : 'border-driver-line bg-driver-panel text-driver-text hover:bg-driver-hover'
                }`}
              >
                <Keyboard size={15} />
                {isInsertingKey
                  ? (locale === 'zh-CN' ? '按下目标按键...' : 'Press target key...')
                  : (locale === 'zh-CN' ? '插入键盘按键' : 'Insert Keyboard Key')}
              </button>

              {/* 插入鼠标按键 (Dropdown 模拟) */}
              <div className="relative">
                <button
                  type="button"
                  disabled={recording}
                  onClick={() => setInsertMouseMenuOpen((prev) => !prev)}
                  className="flex h-10 items-center gap-2 rounded-md border border-driver-line bg-driver-panel px-5 text-xs font-bold text-driver-text shadow-sm hover:bg-driver-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Mouse size={15} />
                  {locale === 'zh-CN' ? '插入鼠标按键' : 'Insert Mouse Key'}
                </button>

                {insertMouseMenuOpen && (
                  <>
                    {/* 关闭层 */}
                    <div className="fixed inset-0 z-40" onClick={() => setInsertMouseMenuOpen(false)} />
                    
                    {/* 下拉菜单菜单项 */}
                    <div className="absolute bottom-[calc(100%+8px)] left-0 z-50 w-44 rounded-md border border-driver-line bg-driver-panel py-1 shadow-lg">
                      {(
                        [
                          { nameZh: '左键按下', nameEn: 'Left Down', value: 1, dir: MacroDirection.Down },
                          { nameZh: '左键抬起', nameEn: 'Left Up', value: 1, dir: MacroDirection.Up },
                          { nameZh: '右键按下', nameEn: 'Right Down', value: 2, dir: MacroDirection.Down },
                          { nameZh: '右键抬起', nameEn: 'Right Up', value: 2, dir: MacroDirection.Up },
                          { nameZh: '中键按下', nameEn: 'Middle Down', value: 3, dir: MacroDirection.Down },
                          { nameZh: '中键抬起', nameEn: 'Middle Up', value: 3, dir: MacroDirection.Up },
                        ]
                      ).map((item) => {
                        const displayName = locale === 'zh-CN' ? item.nameZh : item.nameEn;
                        return (
                          <button
                            key={`${item.nameZh}-${item.dir}`}
                            type="button"
                            onClick={() => insertMouseAction(item.nameZh, item.value, item.dir)}
                            className="flex h-8 w-full items-center px-4 text-left text-xs font-semibold text-driver-text hover:bg-driver-hover"
                          >
                            {item.dir === MacroDirection.Down ? '↓' : '↑'} {displayName}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>

          </div>
        ) : (
          /* 空白配置占位页 */
          <div className="m-6 flex flex-1 flex-col items-center justify-center rounded-lg border border-driver-line bg-driver-panel p-8 shadow-sm">
            <div className="mb-4 rounded-full bg-driver-raised p-5 text-driver-muted">
              <Plus size={42} />
            </div>
            <h3 className="mb-1 text-sm font-black text-driver-text">
              {locale === 'zh-CN' ? '暂无快捷指令配置' : 'No Shortcut Selected'}
            </h3>
            <p className="mb-5 max-w-sm text-center text-xs leading-normal text-driver-muted">
              {locale === 'zh-CN'
                ? '您可以新建配置来录制、编辑宏。之后在改键页签中将其绑定到鼠标按键上。'
                : 'Create a shortcut config to record macros. Then assign it to any mouse button in Key Settings.'}
            </p>
            <Button
              variant="black"
              onClick={handleCreateNew}
              className="h-10 rounded-md px-6 text-xs font-bold shadow-sm"
            >
              {locale === 'zh-CN' ? '新建快捷指令' : 'New Shortcut'}
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

function DelayInput({
  value,
  disabled,
  onChange,
}: {
  value: number;
  disabled?: boolean;
  onChange: (val: number) => void;
}) {
  const [localVal, setLocalVal] = useState(String(value));

  useEffect(() => {
    setLocalVal(String(value));
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    setLocalVal(raw);
    if (raw !== '') {
      const num = Math.min(65535, Math.max(0, Number(raw)));
      if (!isNaN(num)) {
        onChange(num);
      }
    } else {
      onChange(0);
    }
  }

  function handleBlur() {
    if (localVal === '' || isNaN(Number(localVal))) {
      setLocalVal('0');
      onChange(0);
    } else {
      const num = Math.min(65535, Math.max(0, Number(localVal)));
      setLocalVal(String(num));
      onChange(num);
    }
  }

  function handleDecrease() {
    const current = localVal === '' ? 0 : Number(localVal);
    const next = Math.max(0, current - 10);
    setLocalVal(String(next));
    onChange(next);
  }

  function handleIncrease() {
    const current = localVal === '' ? 0 : Number(localVal);
    const next = Math.min(65535, current + 10);
    setLocalVal(String(next));
    onChange(next);
  }

  return (
    <div className="flex h-8 w-[116px] shrink-0 items-center overflow-hidden rounded border border-driver-line bg-driver-raised">
      <button
        type="button"
        disabled={disabled}
        onClick={handleDecrease}
        aria-label="Decrease delay"
        className="h-full select-none border-r border-driver-line px-2 text-xs font-bold text-driver-muted transition hover:bg-driver-hover disabled:opacity-50"
      >
        -
      </button>
      <div className="flex-1 flex items-center px-1 min-w-0">
        <input
          type="number"
          min={0}
          max={65535}
          disabled={disabled}
          className="w-full bg-transparent text-xs font-bold outline-none text-right pr-0.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none min-w-0"
          value={localVal}
          onChange={handleChange}
          onBlur={handleBlur}
        />
        <span className="shrink-0 select-none text-[10px] font-bold text-driver-muted">ms</span>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={handleIncrease}
        aria-label="Increase delay"
        className="h-full select-none border-l border-driver-line px-2 text-xs font-bold text-driver-muted transition hover:bg-driver-hover disabled:opacity-50"
      >
        +
      </button>
    </div>
  );
}
