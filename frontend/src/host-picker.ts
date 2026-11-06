import { api, type CloudHost } from './cloud-api';

/** 主机列表内存缓存（24 小时有效），避免每次点 "+" 都重新请求 /api/hosts。 */
let hostCache: { hosts: CloudHost[]; ts: number } | null = null;
const HOST_CACHE_TTL = 24 * 60 * 60 * 1000;

/** 轻量非模态主机选择浮层：点 "+" 弹出，列出 host:port + 备注，选中后回调。不遮挡页面，不阻塞交互。 */
export function openHostPicker(anchor: HTMLElement, onSelect: (host: CloudHost) => void): void {
  // 移除已存在的浮层，避免多次点击堆叠
  const existing = document.querySelector('.host-picker-popover');
  if (existing) existing.remove();

  const popover = document.createElement('div');
  popover.className = 'host-picker-popover';
  popover.setAttribute('role', 'listbox');
  popover.setAttribute('aria-label', '主机列表');
  popover.innerHTML = `<div class="host-picker-list"></div>`;

  // 贴在 "+" 按钮正下方弹出：先在 DOM 中挂载，再按 getBoundingClientRect 设定 left/top，
  // 避免 fixed 定位元素在未挂载时默认落在 (0,0)。
  document.body.appendChild(popover);

  const rect = anchor.getBoundingClientRect();
  popover.style.position = 'fixed';
  popover.style.left = `${Math.round(rect.left)}px`;
  popover.style.top = `${Math.round(rect.bottom + 6)}px`;
  popover.style.transform = 'none';

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
      // 一行显示：host:port 左侧，name · group 右侧，全部一行不换行
      row.innerHTML = `
        <span class="host-picker-address">${host.host}:${host.port}</span>
        <span class="host-picker-note">${host.name} · ${host.group}</span>
      `;
      row.addEventListener('click', (event) => {
        event.stopPropagation();
        popover.remove();
        onSelect(host);
      });
      list.append(row);
    }
  }

  const now = Date.now();
  if (hostCache && now - hostCache.ts < HOST_CACHE_TTL) {
    hosts = hostCache.hosts;
    render(hosts);
  } else {
    api<{ hosts: CloudHost[] }>('/api/hosts').then(({ hosts: h }) => {
      hosts = h;
      hostCache = { hosts: h, ts: now };
      render(h);
    }).catch(() => {
      list.replaceChildren();
      const err = document.createElement('div');
      err.className = 'host-picker-empty';
      err.textContent = '加载服务器列表失败，请先登录';
      list.append(err);
    });
  }

  // 点击浮层内部不冒泡，避免触发文档的关闭逻辑
  popover.addEventListener('click', (event) => event.stopPropagation());

  // 延迟一个宏任务再监听文档点击，避免当前 "+" 的 click 事件冒泡到文档就把刚弹出的浮层关掉
  let closed = false;
  const close = (): void => {
    if (closed) return;
    closed = true;
    popover.remove();
  };
  setTimeout(() => {
    document.addEventListener('click', close, { once: true });
  }, 0);
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });
}
