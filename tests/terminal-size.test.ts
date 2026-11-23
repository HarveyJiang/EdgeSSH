import assert from 'node:assert/strict';
import test from 'node:test';
import { MIN_TERMINAL_COLS, terminalColumns } from '../frontend/src/terminal-size.ts';

test('宽屏模式给窄屏终端保底 80 列，超出的部分交给横向滚动', () => {
  assert.equal(MIN_TERMINAL_COLS, 80);
  assert.equal(terminalColumns(45, true), 80);
  assert.equal(terminalColumns(79, true), 80);
});

test('宽屏模式不会压缩宽屏桌面，仍按容器实际列数', () => {
  assert.equal(terminalColumns(80, true), 80);
  assert.equal(terminalColumns(132, true), 132);
});

test('关闭宽屏模式后完全跟随容器列数（内容折行）', () => {
  assert.equal(terminalColumns(45, false), 45);
  assert.equal(terminalColumns(132, false), 132);
});

test('非法列数按 1 处理，宽屏模式仍然保底 80', () => {
  assert.equal(terminalColumns(0, false), 1);
  assert.equal(terminalColumns(-3, false), 1);
  assert.equal(terminalColumns(0, true), 80);
});
