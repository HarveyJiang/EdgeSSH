import assert from 'node:assert/strict';
import test from 'node:test';
import { fileKind, fileKindPaths, isEditableFile } from '../frontend/src/file-kind.ts';

test('文件夹和链接优先使用协议类型，不受扩展名影响', () => {
  assert.equal(fileKind({ name: 'backup.zip', type: 'directory' }), 'folder');
  assert.equal(fileKind({ name: 'app.sh', type: 'symlink' }), 'link');
  assert.equal(fileKind({ name: 'app.sh', type: 'other' }), 'file');
});

test('常用服务器文件按用途粗分，未知扩展名使用通用图标', () => {
  const cases = {
    'BACKUP.TAR.GZ': 'archive', 'package.deb': 'archive', 'archive.7z': 'archive',
    'README': 'document', 'LICENSE': 'document', 'access.log': 'document',
    'deploy.sh': 'script', 'main.py': 'script', 'Dockerfile.prod': 'script', Makefile: 'script',
    '.env.production': 'config', '.bashrc': 'config', 'sshd_config.conf': 'config',
    'compose.yaml': 'config', 'app.service': 'config', 'icon.svg': 'image',
    'data.bin': 'file', 'notes.docx': 'file', 'no-extension': 'file',
    tar: 'file', constructor: 'file', '__proto__.unknown': 'file',
  };
  for (const [name, kind] of Object.entries(cases)) {
    assert.equal(fileKind({ name, type: 'file' }), kind, name);
  }
});

test('每种类型都提供非空 SVG 路径', () => {
  for (const paths of Object.values(fileKindPaths)) {
    assert.ok(paths.length > 0);
    assert.ok(paths.every((path) => path.startsWith('M') || path.startsWith('m')));
  }
});

test('双击默认在线编辑的选择只覆盖文本类文件', () => {
  for (const name of ['README.md', 'app.log', 'deploy.sh', 'main.py', 'compose.yaml', '.env.production', 'Dockerfile']) {
    assert.equal(isEditableFile({ name, type: 'file' }), true, name);
  }
  for (const name of ['report.pdf', 'icon.png', 'bundle.tar.gz', 'data.bin', 'notes.docx', 'no-extension']) {
    assert.equal(isEditableFile({ name, type: 'file' }), false, name);
  }
  assert.equal(isEditableFile({ name: 'app.sh', type: 'directory' }), false);
  assert.equal(isEditableFile({ name: 'app.sh', type: 'symlink' }), false);
  assert.equal(isEditableFile({ name: 'app.sh', type: 'other' }), false);
});
