import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ButtonId, MacroRepeatType, browserKeyToHid, mouseButtons } from '@/protocol/mouse';
import { keyboardEventToMacroAction, MacroAction, MacroDirection, useMacroStore } from '@/stores/macro-store';
import { useMouseStore } from '@/stores/mouse-store';
import { TranslationKey, useI18n } from '@/i18n/use-i18n';
import { Button } from '@/shared/ui/button';

const macroSchema = z.object({
  name: z.string().min(1).max(40),
  repeatType: z.number(),
  loopTimes: z.number().min(1).max(255),
});

type MacroForm = z.infer<typeof macroSchema>;

export function MacroPanel() {
  const { t, locale } = useI18n();
  const macros = useMacroStore((state) => state.macros);
  const saveMacro = useMacroStore((state) => state.saveMacro);
  const deleteMacro = useMacroStore((state) => state.deleteMacro);
  const bindMacroToButton = useMouseStore((state) => state.bindMacroToButton);
  const bindComboToButton = useMouseStore((state) => state.bindComboToButton);
  const [recording, setRecording] = useState(false);
  const [comboRecording, setComboRecording] = useState(false);
  const [actions, setActions] = useState<MacroAction[]>([]);
  const [comboKeys, setComboKeys] = useState<Array<{ name: string; value: number }>>([]);
  const [targetButton, setTargetButton] = useState<ButtonId>(ButtonId.Forward);
  const startedAt = useRef(0);
  const pressed = useRef(new Set<string>());
  const form = useForm<MacroForm>({
    resolver: zodResolver(macroSchema),
    defaultValues: { name: 'Macro 1', repeatType: MacroRepeatType.LoopTimes, loopTimes: 1 },
  });

  useEffect(() => {
    if (!recording) return undefined;
    startedAt.current = Date.now();
    pressed.current.clear();
    const onDown = (event: KeyboardEvent) => {
      event.preventDefault();
      if (pressed.current.has(event.code)) return;
      pressed.current.add(event.code);
      const action = keyboardEventToMacroAction(event, MacroDirection.Down, startedAt.current);
      if (action) setActions((items) => [...items, action]);
    };
    const onUp = (event: KeyboardEvent) => {
      event.preventDefault();
      pressed.current.delete(event.code);
      const action = keyboardEventToMacroAction(event, MacroDirection.Up, startedAt.current);
      if (action) setActions((items) => [...items, action]);
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      pressed.current.clear();
    };
  }, [recording]);

  useEffect(() => {
    if (!comboRecording) return undefined;
    const onDown = (event: KeyboardEvent) => {
      event.preventDefault();
      const code = browserKeyToHid[event.key] ?? browserKeyToHid[event.key.toLowerCase()] ?? browserKeyToHid[event.code];
      if (!code) return;
      setComboKeys((items) => {
        if (items.some((item) => item.value === code[0])) return items;
        return [...items, { name: keyName(event), value: code[0] }].slice(0, 4);
      });
    };
    window.addEventListener('keydown', onDown);
    return () => window.removeEventListener('keydown', onDown);
  }, [comboRecording]);

  const actionSummary = useMemo(() => actions.slice(-6), [actions]);

  function submit(values: MacroForm) {
    if (!actions.length) return;
    saveMacro({
      name: values.name,
      loopTimes: values.loopTimes,
      repeatType: values.repeatType as MacroRepeatType,
      actions,
    });
    setActions([]);
    setRecording(false);
    form.reset({ name: `Macro ${macros.length + 2}`, repeatType: MacroRepeatType.LoopTimes, loopTimes: 1 });
  }

  function bindCombo() {
    if (!comboKeys.length) return;
    void bindComboToButton(targetButton, comboKeys.map((item) => item.value));
    setComboRecording(false);
  }

  return (
    <div className="min-h-full bg-white text-[#101114]">
      <div className="flex items-center justify-between border-b border-[#eef0f2] px-6 py-4">
        <div>
          <h1 className="text-lg font-black">{t('nav.shortcuts')}</h1>
          <p className="mt-1 text-xs text-[#7a808a]">{t('mouse.bindWorkflow')}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-[#7a808a]">{t('mouse.targetButton')}</span>
          <TargetButtonSelect locale={locale} value={targetButton} onChange={setTargetButton} />
        </div>
      </div>

      <div className="grid gap-4 bg-[#f6f7f9] p-6 xl:grid-cols-[360px_420px_1fr]">
        <section className="rounded-lg bg-white p-4 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
          <div className="mb-4 text-sm font-bold">{t('mouse.selectedTarget')}</div>
          <div className="grid grid-cols-2 gap-2">
            {mouseButtons.map((button) => {
              const active = button.id === targetButton;
              return (
                <button
                  key={button.id}
                  className={`h-12 rounded-md px-3 text-left text-sm font-semibold transition ${
                    active ? 'bg-black text-white' : 'bg-[#f1f2f4] text-[#1d2129] hover:bg-[#e5e7eb]'
                  }`}
                  onClick={() => setTargetButton(button.id)}
                >
                  {locale === 'zh-CN' ? button.labelZh : button.label}
                </button>
              );
            })}
          </div>
          <div className="mt-4 rounded-lg bg-[#f6f7f9] p-3 text-xs leading-6 text-[#69717d]">
            {t('mouse.recordStatus')}: <span className="font-semibold text-[#101114]">{recording || comboRecording ? t('mouse.recordingNow') : t('mouse.waitingInput')}</span>
          </div>
        </section>

        <section className="rounded-lg bg-white p-5 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="font-bold">{t('mouse.macroRecord')}</div>
              <div className="mt-1 text-xs text-[#7a808a]">{t('mouse.macroRecordHint')}</div>
            </div>
            <span className={`h-3 w-3 rounded-full ${recording ? 'bg-[#ff4d2e]' : 'bg-[#aeb4bd]'}`} />
          </div>

          <form className="grid gap-4" onSubmit={form.handleSubmit(submit)}>
            <label className="grid gap-2 text-sm">
              <span className="text-[#7a808a]">{t('mouse.macroName')}</span>
              <input className="h-10 rounded-md border border-[#d7dbe2] bg-white px-3 outline-none focus:border-[#ff6b00]" {...form.register('name')} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-2 text-sm">
                <span className="text-[#7a808a]">{t('mouse.repeatMode')}</span>
                <select className="h-10 rounded-md border border-[#d7dbe2] bg-white px-3 outline-none" {...form.register('repeatType', { valueAsNumber: true })}>
                  <option value={MacroRepeatType.LoopTimes}>{t('mouse.repeatLoopTimes')}</option>
                  <option value={MacroRepeatType.Hold}>{t('mouse.repeatHold')}</option>
                  <option value={MacroRepeatType.UntilAssignedKey}>{t('mouse.repeatAssigned')}</option>
                  <option value={MacroRepeatType.UntilAnyKey}>{t('mouse.repeatAny')}</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm">
                <span className="text-[#7a808a]">{t('mouse.loopTimes')}</span>
                <input type="number" className="h-10 rounded-md border border-[#d7dbe2] bg-white px-3 outline-none" {...form.register('loopTimes', { valueAsNumber: true })} />
              </label>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant={recording ? 'danger' : 'primary'} onClick={() => setRecording((value) => !value)}>
                {recording ? t('mouse.stopRecord') : t('mouse.startRecord')}
              </Button>
              <Button type="button" className="bg-[#e5e7eb] text-[#1d2129] hover:bg-[#dfe2e7]" onClick={() => setActions([])}>
                {t('mouse.clear')}
              </Button>
              <Button type="submit" disabled={!actions.length}>{t('mouse.save')}</Button>
            </div>
          </form>

          <div className="mt-5 rounded-lg bg-white p-3">
            <div className="mb-2 text-xs text-[#7a808a]">{t('mouse.actions')}: {actions.length}</div>
            <div className="min-h-28 space-y-1 text-xs text-[#515861]">
              {actionSummary.map((action, index) => (
                <div key={`${action.keyName}-${action.timestamp}-${index}`}>
                  {action.direction === MacroDirection.Down ? '↓' : '↑'} {action.keyName} · {action.timestamp}ms
                </div>
              ))}
              {!actions.length && <div className="py-8 text-center text-[#9aa0a9]">{t('mouse.emptyActions')}</div>}
            </div>
          </div>
        </section>

        <section className="grid gap-4">
          <div className="rounded-lg bg-white p-5 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <div className="font-bold">{t('mouse.comboRecord')}</div>
                <div className="mt-1 text-xs text-[#7a808a]">{t('mouse.comboRecordHint')}</div>
              </div>
              <Button
                type="button"
                variant={comboRecording ? 'danger' : 'primary'}
                onClick={() => {
                  setComboRecording((value) => !value);
                  if (!comboRecording) setComboKeys([]);
                }}
              >
                {comboRecording ? t('mouse.stopRecord') : t('mouse.startRecord')}
              </Button>
            </div>
            <div className="mb-4 flex min-h-12 flex-wrap items-center gap-2 rounded-lg bg-white p-3">
              {comboKeys.map((item) => (
                <span key={`${item.name}-${item.value}`} className="rounded-md bg-black px-3 py-2 text-sm font-semibold text-white">{item.name}</span>
              ))}
              {!comboKeys.length && <span className="text-sm text-[#9aa0a9]">{t('mouse.pressShortcut')}</span>}
            </div>
            <div className="flex gap-2">
              <Button type="button" onClick={bindCombo} disabled={!comboKeys.length}>{t('mouse.bindShortcut')}</Button>
              <Button type="button" className="bg-[#e5e7eb] text-[#1d2129] hover:bg-[#dfe2e7]" onClick={() => setComboKeys([])}>{t('mouse.clear')}</Button>
            </div>
          </div>

          <div className="rounded-lg bg-white p-5 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
            <div className="mb-4 font-bold">{t('mouse.macroLibrary')}</div>
            <div className="grid gap-3">
              {macros.length === 0 && <div className="rounded-lg border border-dashed border-[#d7dbe2] p-6 text-center text-sm text-[#7a808a]">{t('mouse.emptyMacros')}</div>}
              {macros.map((macro, index) => (
                <div key={macro.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white p-4">
                  <div>
                    <div className="font-semibold">{macro.name}</div>
                    <div className="mt-1 text-xs text-[#7a808a]">
                      {macro.actions.length} {t('mouse.actions')} · {repeatLabel(macro.repeatType, macro.loopTimes, t)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="primary" onClick={() => void bindMacroToButton(targetButton, index, macro)}>{t('mouse.bindMacro')}</Button>
                    <Button variant="danger" onClick={() => deleteMacro(macro.id)}>{t('mouse.delete')}</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function TargetButtonSelect({
  locale,
  value,
  onChange,
}: {
  locale: 'zh-CN' | 'en';
  value: ButtonId;
  onChange: (value: ButtonId) => void;
}) {
  return (
    <select
      className="h-10 rounded-md border border-[#d7dbe2] bg-[#f1f2f4] px-3 text-sm font-semibold outline-none"
      value={value}
      onChange={(event) => onChange(Number(event.target.value) as ButtonId)}
    >
      {mouseButtons.map((button) => (
        <option key={button.id} value={button.id}>{locale === 'zh-CN' ? button.labelZh : button.label}</option>
      ))}
    </select>
  );
}

function keyName(event: KeyboardEvent) {
  if (event.key === ' ') return 'Space';
  if (event.key === 'Control') return 'Ctrl';
  if (event.key === 'Meta') return 'Win';
  return event.key.length === 1 ? event.key.toUpperCase() : event.key;
}

function repeatLabel(repeatType: MacroRepeatType, loopTimes: number, t: (key: TranslationKey) => string) {
  if (repeatType === MacroRepeatType.Hold) return t('mouse.repeatHold');
  if (repeatType === MacroRepeatType.UntilAssignedKey) return t('mouse.repeatAssigned');
  if (repeatType === MacroRepeatType.UntilAnyKey) return t('mouse.repeatAny');
  return `${loopTimes}x`;
}
