export type TerminalModifierState = Readonly<{ ctrl: boolean; alt: boolean }>;

const KEY_SEQUENCES: Readonly<Record<string, string>> = Object.freeze({
  esc: '\x1b',
  tab: '\x09',
  up: '\x1b[A',
  down: '\x1b[B',
  left: '\x1b[D',
  right: '\x1b[C',
  'ctrl-c': '\x03',
  'ctrl-d': '\x04',
  'ctrl-z': '\x1a',
  'ctrl-l': '\x0c',
});

const ARROW_SEQUENCE = /^\x1b\[([ABCD])$/;

export function applyTerminalModifiers(data: string, modifiers: TerminalModifierState): string {
  if (!modifiers.ctrl && !modifiers.alt) return data;

  const arrow = data.match(ARROW_SEQUENCE);
  if (arrow) {
    const parameter = modifiers.ctrl && modifiers.alt ? 7 : modifiers.ctrl ? 5 : 3;
    return `\x1b[1;${parameter}${arrow[1]}`;
  }

  let output = data;
  if (modifiers.ctrl && output) {
    const first = output[0];
    const upperCode = first.toUpperCase().charCodeAt(0);
    if (upperCode >= 64 && upperCode <= 95) {
      output = String.fromCharCode(upperCode & 31) + output.slice(1);
    } else if (first === '?') {
      output = `\x7f${output.slice(1)}`;
    }
  }
  return modifiers.alt ? `\x1b${output}` : output;
}

interface TerminalToolsOptions {
  send(data: string): void;
  focusTerminal(): void;
  refitTerminal(): void;
  localize(zh: string, en: string): string;
}

export interface TerminalToolsController {
  handleTerminalData(data: string): void;
  setConnected(connected: boolean): void;
  refreshLanguage(): void;
}

function byId<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing terminal tools element #${id}`);
  return node as T;
}

export function createTerminalTools(options: TerminalToolsOptions): TerminalToolsController {
  const root = byId<HTMLElement>('terminal-tools');
  const keyScroll = root.querySelector<HTMLElement>('.terminal-key-scroll')!;
  const modifierButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-terminal-modifier]')];
  const keyButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-terminal-key]')];
  let connected = false;
  let modifiers = { ctrl: false, alt: false };

  const refreshModifierButtons = () => {
    for (const button of modifierButtons) {
      const modifier = button.dataset.terminalModifier as keyof typeof modifiers;
      button.setAttribute('aria-pressed', String(modifiers[modifier]));
    }
  };

  const resetModifiers = () => {
    modifiers = { ctrl: false, alt: false };
    refreshModifierButtons();
  };

  const handleTerminalData = (data: string) => {
    if (!connected) return;
    options.send(applyTerminalModifiers(data, modifiers));
    resetModifiers();
  };

  const updateActions = () => {
    for (const button of keyButtons) button.disabled = !connected;
    for (const button of modifierButtons) button.disabled = !connected;
  };

  keyScroll.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!button || button.disabled) return;
    const modifier = button.dataset.terminalModifier as keyof typeof modifiers | undefined;
    if (modifier) {
      modifiers = { ...modifiers, [modifier]: !modifiers[modifier] };
      refreshModifierButtons();
      options.focusTerminal();
      return;
    }
    const sequence = KEY_SEQUENCES[button.dataset.terminalKey ?? ''];
    if (sequence !== undefined) handleTerminalData(sequence);
    options.focusTerminal();
  });

  updateActions();
  refreshModifierButtons();

  return {
    handleTerminalData,
    setConnected(nextConnected) {
      connected = nextConnected;
      if (!connected) resetModifiers();
      updateActions();
    },
    refreshLanguage() {
      // 命令编辑器已移除，语言切换无需再处理编辑器显隐。
    },
  };
}
