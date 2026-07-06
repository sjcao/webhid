import { useEffect, useMemo, useRef, useState } from 'react';
import { Play, Square, Copy, RotateCcw, Save, Trash2, Plus, Menu, Keyboard, Mouse } from 'lucide-react';
import { useMacroStore, MacroAction, MacroActionKind, MacroDirection } from '@/stores/macro-store';
import { browserKeyToHid, MacroRepeatType } from '@/protocol/mouse';
import { useI18n } from '@/i18n/use-i18n';
import { Button } from '@/shared/ui/button';

export function MacroPanel() {
  const { locale } = useI18n();

  // Zustand Store
  const macros = useMacroStore((state) => state.macros);
  const saveMacro = useMacroStore((state) => state.saveMacro);
  const deleteMacro = useMacroStore((state) => state.deleteMacro);
  const updateMacro = useMacroStore((state) => state.updateMacro);
  const duplicateMacro = useMacroStore((state) => state.duplicateMacro);

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

  // HTML5 Drag & Drop 拖拽状态
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

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
  function handleCreateNew() {
    const newName = `M${macros.length + 1}`;
    const newMacro = saveMacro({
      name: newName,
      repeatType: MacroRepeatType.LoopTimes,
      loopTimes: 1,
      actions: [],
    });
    setSelectedMacroId(newMacro.id);
  }

  // 保存当前修改
  function handleSave() {
    if (!selectedMacroId) return;
    updateMacro(selectedMacroId, {
      name: tempName,
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

  // 删除宏
  function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    deleteMacro(id);
    if (selectedMacroId === id) {
      setSelectedMacroId(null);
    }
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
    const delayOfRemoved = idx === 0 ? 0 : tempActions[idx].timestamp - tempActions[idx - 1].timestamp;
    
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

    // 1. 先计算原始顺序下，每个动作相对于前一项的相对延时 (delays)
    const oldDelays = tempActions.map((act, i) =>
      i === 0 ? act.timestamp : act.timestamp - tempActions[i - 1].timestamp
    );

    // 2. 对动作数组及相对延迟数组进行同步调整
    const list = [...tempActions];
    const delayList = [...oldDelays];

    const draggedItem = list[draggedIndex];
    const draggedDelay = delayList[draggedIndex];

    list.splice(draggedIndex, 1);
    delayList.splice(draggedIndex, 1);

    list.splice(index, 0, draggedItem);
    delayList.splice(index, 0, draggedDelay);

    // 3. 根据重排后的相对延时，重新累加出绝对时间戳 (timestamp)
    const nextActions = list.map((act, i) => {
      const ts = i === 0 ? delayList[i] : list[i - 1].timestamp + delayList[i];
      return { ...act, timestamp: ts };
    });

    setTempActions(nextActions);
    setDraggedIndex(null);
  }

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-[#f6f7f9] text-[#101114]">
      
      {/* 录制时的防误触局部毛玻璃遮罩（精准遮盖左侧与顶部，暴露右侧工作区动作流） */}
      {recording && (
        <>
          {/* 左侧遮罩：覆盖外部导航aside (228px) 与 宏指令库列表 (240px) */}
          <div className="fixed left-0 top-0 bottom-0 z-40 bg-slate-950/10 backdrop-blur-[2px] w-[468px] pointer-events-auto" />
          {/* 顶部遮罩：覆盖顶部header (h-12) */}
          <div className="fixed left-0 top-0 right-0 z-40 bg-slate-950/10 backdrop-blur-[2px] h-12 pointer-events-auto" />
        </>
      )}

      {/* 左侧侧边栏：已创建的宏列表 */}
      <div className="flex h-full w-[240px] shrink-0 flex-col border-r border-[#eef0f2] bg-white p-4">
        <h2 className="text-sm font-black text-[#86909c] mb-3 uppercase tracking-wider">
          {locale === 'zh-CN' ? '快捷指令库' : 'Shortcuts Library'}
        </h2>
        
        {/* 新建按钮 */}
        <Button
          onClick={handleCreateNew}
          className="w-full bg-[#101114] text-white hover:bg-slate-800 font-bold text-xs h-10 mb-4 flex items-center justify-center gap-2 shadow-sm rounded-md"
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
                onClick={() => setSelectedMacroId(macro.id)}
                className={`group flex h-11 cursor-pointer items-center justify-between rounded-md px-3 border transition duration-200 ${
                  active
                    ? 'border-[#ff6b00] bg-[#ff6b00]/5 text-[#ff6b00]'
                    : 'border-[#eef0f2] bg-white hover:border-slate-300'
                }`}
              >
                <div className="min-w-0 pr-2">
                  <div className="text-xs font-bold truncate">{macro.name}</div>
                  <div className="mt-0.5 text-[9px] font-semibold text-[#86909c]">
                    {macro.actions.length} {locale === 'zh-CN' ? '动作' : 'acts'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleDelete(macro.id, e)}
                  className="rounded p-1 text-[#86909c] hover:bg-[#f3f4f6] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}

          {macros.length === 0 && (
            <div className="py-12 text-center text-xs text-[#9aa0a9] font-medium leading-relaxed">
              {locale === 'zh-CN' ? '暂无配置，请点击上方按钮新建' : 'No shortcuts yet. Click above to create one.'}
            </div>
          )}
        </div>
      </div>

      {/* 右侧主详情面板：可视化动作流编辑器 */}
      <div className="flex-1 flex flex-col h-full min-h-0 bg-[#f7f8fa]">
        
        {currentMacro ? (
          <div className="flex-1 flex flex-col h-full min-h-0">
            {/* 顶部工具控制栏 */}
            <div className="flex min-h-14 shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-[#eef0f2] bg-white px-6 py-2.5 shadow-sm">
              <div className="flex shrink-0 items-center gap-2">
                <span className="whitespace-nowrap text-xs font-bold text-[#86909c]">{locale === 'zh-CN' ? '指令名称' : 'Name'}:</span>
                <input
                  type="text"
                  maxLength={20}
                  disabled={recording}
                  className="h-8 w-40 rounded border border-[#d7dbe2] bg-[#f7f8fa] px-2.5 text-xs font-bold outline-none focus:border-[#ff6b00] focus:bg-white disabled:opacity-50"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                />
              </div>

              {/* 循环参数设置 */}
              <div className="flex shrink-0 items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="whitespace-nowrap text-xs font-bold text-[#86909c]">{locale === 'zh-CN' ? '循环方式' : 'Loop Mode'}:</span>
                  <select
                    disabled={recording}
                    className="h-8 rounded border border-[#d7dbe2] bg-[#f7f8fa] px-2 text-xs font-bold outline-none disabled:opacity-50"
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
                    <span className="whitespace-nowrap text-xs font-bold text-[#86909c]">{locale === 'zh-CN' ? '循环次数' : 'Count'}:</span>
                    <input
                      type="number"
                      min={1}
                      max={255}
                      disabled={recording}
                      className="h-8 w-16 rounded border border-[#d7dbe2] bg-[#f7f8fa] px-2 text-xs font-bold outline-none disabled:opacity-50"
                      value={loopTimes}
                      onChange={(e) => setLoopTimes(Math.max(1, Number(e.target.value)))}
                    />
                  </div>
                )}
              </div>

              {/* 控制按钮组 */}
              <div className="flex shrink-0 items-center gap-1.5 ml-auto">
                <Button
                  variant={recording ? 'danger' : 'primary'}
                  onClick={() => setRecording((prev) => !prev)}
                  className={`font-bold text-xs h-8 flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all duration-200 ${
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
                  className="border border-[#d7dbe2] bg-white text-[#1d2129] hover:bg-[#eff0f2] font-bold text-xs h-8 flex items-center gap-1.5 shadow-sm whitespace-nowrap shrink-0"
                >
                  <Copy size={13} className="shrink-0" />
                  <span className="whitespace-nowrap">{locale === 'zh-CN' ? '复制' : 'Clone'}</span>
                </Button>

                <Button
                  onClick={() => setTempActions([])}
                  disabled={recording}
                  className="border border-[#d7dbe2] bg-white text-[#1d2129] hover:bg-[#eff0f2] font-bold text-xs h-8 flex items-center gap-1.5 shadow-sm whitespace-nowrap shrink-0"
                >
                  <RotateCcw size={13} className="shrink-0" />
                  <span className="whitespace-nowrap">{locale === 'zh-CN' ? '重置' : 'Reset'}</span>
                </Button>

                <Button
                  onClick={handleSave}
                  disabled={recording || !tempName}
                  className="bg-[#101114] text-white hover:bg-slate-800 font-bold text-xs h-8 flex items-center gap-1.5 shadow-sm whitespace-nowrap shrink-0"
                >
                  <Save size={13} className="shrink-0" />
                  <span className="whitespace-nowrap">{locale === 'zh-CN' ? '保存' : 'Save'}</span>
                </Button>
              </div>
            </div>

            {/* 动作序列列表 */}
            <div className="flex-1 overflow-y-auto p-6 space-y-2">
              
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
                    className={`flex h-14 items-center justify-between rounded-lg bg-white border border-[#eef0f2] px-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition duration-150 ${
                      draggedIndex === idx ? 'opacity-40 scale-95 border-dashed border-warn' : 'hover:border-slate-300'
                    }`}
                  >
                    {/* 左侧：手柄和动作名 */}
                    <div className="flex items-center gap-4">
                      {!recording && (
                        <div className="cursor-grab text-[#a9adb3] hover:text-[#5d6673]" title={locale === 'zh-CN' ? '拖拽排序' : 'Drag to sort'}>
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
                              ? 'bg-[#ff6b00] text-white border border-[#ff6b00] animate-pulse'
                              : 'bg-[#f0f1f3] text-[#1d2129] border border-[#eef0f2] hover:bg-slate-200'
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
                          <div className="absolute left-1/2 bottom-[calc(100%+8px)] -translate-x-1/2 scale-0 group-hover/btn:scale-100 bg-[#101114] text-white text-[10px] font-bold py-1 px-2.5 rounded shadow-lg pointer-events-none transition duration-150 whitespace-nowrap z-50">
                            {locale === 'zh-CN' ? '按任意键修改绑定' : 'Press key to modify'}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#101114]" />
                          </div>
                        )}
                      </div>

                      {/* 动作类型说明 */}
                      <span className="text-[10px] text-[#86909c] font-black uppercase">
                        {action.kind === MacroActionKind.Mouse ? (locale === 'zh-CN' ? '鼠标' : 'Mouse') : (locale === 'zh-CN' ? '键盘' : 'Keyboard')}
                      </span>
                    </div>

                    {/* 右侧：方向按钮、延迟输入框和删除 */}
                    <div className="flex items-center gap-4">
                      {/* 方向单选按钮 */}
                      <div className="flex rounded bg-[#f0f1f3] p-0.5">
                        <button
                          type="button"
                          disabled={recording}
                          onClick={() => toggleDirection(idx, MacroDirection.Down)}
                          className={`rounded px-3 py-1.5 text-[10px] font-black transition flex items-center gap-1 ${
                            isDown
                              ? 'bg-[#101114] text-white shadow-sm'
                              : 'text-[#5d6673] hover:bg-slate-200'
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
                              ? 'bg-[#101114] text-white shadow-sm'
                              : 'text-[#5d6673] hover:bg-slate-200'
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
                        className="rounded p-1.5 text-[#86909c] hover:bg-[#f3f4f6] hover:text-red-500 transition"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {tempActions.length === 0 && !recording && (
                <div className="py-24 text-center rounded-lg border border-dashed border-[#d7dbe2] bg-white">
                  <div className="text-sm font-bold text-[#5d6673] mb-2">
                    {locale === 'zh-CN' ? '动作列表空空如也' : 'Action Sequence is Empty'}
                  </div>
                  <div className="text-xs text-[#86909c] leading-relaxed">
                    {locale === 'zh-CN' ? '请点击上方“开始录制”记录按键，或使用下方按钮手动添加动作。' : 'Click "Start Record" to record keyboard, or use buttons below to insert.'}
                  </div>
                </div>
              )}

              {recording && tempActions.length === 0 && (
                <div className="py-24 text-center rounded-lg border border-dashed border-[#ff6b00]/30 bg-[#ff6b00]/5 animate-pulse">
                  <div className="text-sm font-bold text-[#ff6b00] mb-2">
                    {locale === 'zh-CN' ? '正在录制动作...' : 'Recording keyboard input...'}
                  </div>
                  <div className="text-xs text-[#ff6b00]/70 font-semibold">
                    {locale === 'zh-CN' ? '请在键盘上按下组合按键，实时捕获序列流。' : 'Please press keys on your keyboard.'}
                  </div>
                </div>
              )}
            </div>

            {/* 底部手动插入控制栏 */}
            <div className="h-16 shrink-0 border-t border-[#eef0f2] bg-white px-6 flex items-center gap-3">
              
              {/* 插入键盘按键 */}
              <button
                type="button"
                disabled={recording}
                onClick={() => setIsInsertingKey((prev) => !prev)}
                className={`flex h-10 px-5 rounded-md border text-xs font-bold items-center gap-2 shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-[#86909c] ${
                  isInsertingKey
                    ? 'border-[#ff6b00] bg-[#ff6b00]/5 text-[#ff6b00] animate-pulse'
                    : 'border-[#d7dbe2] bg-white hover:bg-slate-50 text-[#1d2129]'
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
                  className="flex h-10 px-5 rounded-md border border-[#d7dbe2] bg-white hover:bg-slate-50 text-xs font-bold items-center gap-2 shadow-sm text-[#1d2129] disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-[#86909c]"
                >
                  <Mouse size={15} />
                  {locale === 'zh-CN' ? '插入鼠标按键' : 'Insert Mouse Key'}
                </button>

                {insertMouseMenuOpen && (
                  <>
                    {/* 关闭层 */}
                    <div className="fixed inset-0 z-40" onClick={() => setInsertMouseMenuOpen(false)} />
                    
                    {/* 下拉菜单菜单项 */}
                    <div className="absolute bottom-[calc(100%+8px)] left-0 z-50 w-44 rounded-md border border-[#eef0f2] bg-white py-1 shadow-lg">
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
                            className="flex w-full h-8 items-center px-4 text-left text-xs font-semibold text-[#4b5563] hover:bg-[#f3f4f6] hover:text-[#101114]"
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
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white m-6 rounded-lg border border-[#eef0f2] shadow-sm">
            <div className="mb-4 rounded-full bg-[#f6f7f9] p-5 text-[#86909c]">
              <Plus size={42} />
            </div>
            <h3 className="text-sm font-black text-[#1d2129] mb-1">
              {locale === 'zh-CN' ? '暂无快捷指令配置' : 'No Shortcut Selected'}
            </h3>
            <p className="text-xs text-[#86909c] mb-5 text-center leading-normal max-w-sm">
              {locale === 'zh-CN'
                ? '您可以新建配置来录制、编辑宏。之后在改键页签中将其绑定到鼠标按键上。'
                : 'Create a shortcut config to record macros. Then assign it to any mouse button in Key Settings.'}
            </p>
            <Button
              onClick={handleCreateNew}
              className="bg-[#101114] text-white hover:bg-slate-800 font-bold text-xs h-10 px-6 rounded-md shadow-sm"
            >
              {locale === 'zh-CN' ? '新建快捷指令' : 'New Shortcut'}
            </Button>
          </div>
        )}
      </div>

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
    <div className="flex items-center rounded border border-[#d7dbe2] bg-[#f7f8fa] h-8 w-[116px] overflow-hidden shrink-0">
      <button
        type="button"
        disabled={disabled}
        onClick={handleDecrease}
        className="h-full px-2 text-[#5d6673] hover:bg-slate-200 disabled:opacity-50 transition border-r border-[#d7dbe2] select-none font-bold text-xs"
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
        <span className="text-[10px] text-[#86909c] font-bold select-none shrink-0">ms</span>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={handleIncrease}
        className="h-full px-2 text-[#5d6673] hover:bg-slate-200 disabled:opacity-50 transition border-l border-[#d7dbe2] select-none font-bold text-xs"
      >
        +
      </button>
    </div>
  );
}

