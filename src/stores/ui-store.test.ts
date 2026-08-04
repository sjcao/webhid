import { beforeEach, describe, expect, it } from 'vitest';
import { normalizeUiPreferences, useUiStore } from './ui-store';

describe('persisted UI preferences', () => {
  it('keeps valid values and replaces corrupted local data with safe defaults', () => {
    expect(normalizeUiPreferences({ locale: 'en', theme: 'dark', activePanel: 'dpi' })).toEqual({
      locale: 'en',
      theme: 'dark',
      activePanel: 'dpi',
    });
    expect(normalizeUiPreferences({ locale: 'xx', theme: 3, activePanel: 'missing' })).toEqual({
      locale: 'zh-CN',
      theme: 'light',
      activePanel: 'buttons',
    });
  });
});

describe('ui store panel dirty guard', () => {
  beforeEach(() => {
    useUiStore.setState({ activePanel: 'buttons', macroEditorDirty: false, pendingPanel: null });
  });

  it('switches panels directly while the macro editor is clean', () => {
    useUiStore.getState().setActivePanel('shortcuts');

    const state = useUiStore.getState();
    expect(state.activePanel).toBe('shortcuts');
    expect(state.pendingPanel).toBeNull();
  });

  it('blocks leaving shortcuts while the macro editor is dirty', () => {
    useUiStore.setState({ activePanel: 'shortcuts', macroEditorDirty: true });

    useUiStore.getState().setActivePanel('dpi');

    const state = useUiStore.getState();
    expect(state.activePanel).toBe('shortcuts');
    expect(state.pendingPanel).toBe('dpi');
    expect(state.macroEditorDirty).toBe(true);
  });

  it('does not block re-selecting shortcuts while dirty', () => {
    useUiStore.setState({ activePanel: 'shortcuts', macroEditorDirty: true, pendingPanel: 'dpi' });

    useUiStore.getState().setActivePanel('shortcuts');

    const state = useUiStore.getState();
    expect(state.activePanel).toBe('shortcuts');
    expect(state.pendingPanel).toBeNull();
  });

  it('only guards navigation away from the shortcuts panel', () => {
    useUiStore.setState({ activePanel: 'dpi', macroEditorDirty: true });

    useUiStore.getState().setActivePanel('buttons');

    const state = useUiStore.getState();
    expect(state.activePanel).toBe('buttons');
    expect(state.pendingPanel).toBeNull();
  });

  it('confirmPanelChange applies the pending panel and clears the dirty flag', () => {
    useUiStore.setState({ activePanel: 'shortcuts', macroEditorDirty: true });
    useUiStore.getState().setActivePanel('params');

    useUiStore.getState().confirmPanelChange();

    const state = useUiStore.getState();
    expect(state.activePanel).toBe('params');
    expect(state.pendingPanel).toBeNull();
    expect(state.macroEditorDirty).toBe(false);
  });

  it('confirmPanelChange without a pending panel keeps the current panel', () => {
    useUiStore.setState({ activePanel: 'shortcuts', macroEditorDirty: true });

    useUiStore.getState().confirmPanelChange();

    const state = useUiStore.getState();
    expect(state.activePanel).toBe('shortcuts');
    expect(state.macroEditorDirty).toBe(false);
  });

  it('cancelPanelChange keeps the shortcuts panel and the unsaved edits', () => {
    useUiStore.setState({ activePanel: 'shortcuts', macroEditorDirty: true });
    useUiStore.getState().setActivePanel('other');

    useUiStore.getState().cancelPanelChange();

    const state = useUiStore.getState();
    expect(state.activePanel).toBe('shortcuts');
    expect(state.pendingPanel).toBeNull();
    expect(state.macroEditorDirty).toBe(true);
  });
});
