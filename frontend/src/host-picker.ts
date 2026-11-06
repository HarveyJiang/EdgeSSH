import { api, type CloudHost } from './cloud-api';

/** 轻量非模态主机选择浮层：点 "+" 弹出，列出 host:port + 备注，选中后回调。 */
export function openHostPicker(anchor: HTMLElement, onSelect: (host: CloudHost) => void): void {
  // 移除已存在的浮层，避免多次点击堆叠
  const existing = document.querySelector('.host-picker-popover');
  if (existing) existing.remove();

  const popover = document.createElement('div');
  popover.className = 'host-picker-popover';
  popover.innerHTML = `
    <div class="host-picker-header">
      <input type="search" class="host-picker-search" placeholder="搜索主机、IP 或备注" aria-label="搜索主机">
    </div>
    <div class="host-picker-list" role="listbox" aria-label="主机列表"></div>
  `;
  document.body.appendChild(popover);

  // 把浮层贴在 "+" 按钮下方
  const rect = anchor.getBoundingClientRect();
  popover.style.left = `${rect.left}px`;
  popover.style.top = `${rect.bottom + 6}px`;

  const search = popover.querySelector('.host-picker-search') as HTMLInputElement;
  const list = popover.querySelector('.host-picker-list')!;

  let hosts: CloudHost[] = [];

  function render(filtered: CloudHost[]): void {
    list.replaceChildren();
    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'host-picker-empty';
      empty.textContent = '暂无服务器';
      list.append(empty);
      return;
    }
    for (const host of filtered) {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'host-picker-row';
      row.setAttribute('role', 'option');
      row.innerHTML = `
        <div class="host-picker-address">${host.host}:${host.port}</div>
        <div class="host-picker-note">${host.name} · ${host.group}</div>
      `;
      row.addEventListener('click', (event) => {
        event.stopPropagation();
        popover.remove();
        onSelect(host);
      });
      list.append(row);
    }
  }

  api<{ hosts: CloudHost[] }>('/api/hosts').then(({ hosts: h }) => {
    hosts = h;
    render(h);
    search.focus();
  }).catch(() => {
    list.replaceChildren();
    const err = document.createElement('div');
    err.className = 'host-picker-empty';
    err.textContent = '加载服务器列表失败，请先登录';
    list.append(err);
  });

  search.addEventListener('input', () => {
    const q = search.value.toLowerCase();
    render(hosts.filter((host) =>
      host.name.toLowerCase().includes(q)
      || host.host.toLowerCase().includes(q)
      || host.group.toLowerCase().includes(q)
    ));
  });

  const close = (): void => { popover.remove(); };
  // 点击浮层内部不冒泡；点击页面其他地方或按 Esc 关闭
  popover.addEventListener('click', (event) => event.stopPropagation());
  document.addEventListener('click', close, { once: true });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });
}
