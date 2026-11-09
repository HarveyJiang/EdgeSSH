import { api, type CloudHost } from './cloud-api';

/** 主机列表内存缓存（24 小时有效），避免每次点 "+" 都重新请求 /api/hosts。 */
let hostCache: { hosts: CloudHost[]; ts: number } | null = null;
const HOST_CACHE_TTL = 24 * 60 * 60 * 1000;

/** 轻量非模态主机选择浮层：点 "+" 弹出，列出 host:port + 备注，选中后回调。
 * 优先贴在 "+" 按钮右下方；若按钮坐标异常（0,0），则 fallback 到页面右上方，绝不跑偏到左上角。 */
export function openHostPicker(anchor: HTMLElement, onSelect: (host: CloudHost) => void): void {
  // 移除已存在的浮层，避免多次点击堆叠
  const existing = document.querySelector('.host-picker-popover');
  if (existing) existing.remove();

  const popover = document.createElement('div');
  popover.className = 'host-picker-popover';
  popover.setAttribute('role', 'listbox');
  popover.setAttribute('aria-label', '主机列表');
  popover.innerHTML = `<div class="host-picker-list"></div>`;

  // 先挂载到 DOM，再获取按钮位置；fixed 定位元素必须在文档中才能可靠计算。
  document.body.appendChild(popover);

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

  // 先按固定右上方兜底，避免闪现到 (0,0)。
  // 初始化样式，避免闪烁。默认固定在右上方，等待 requestAnimationFrame 更新精确位置。
  popover.style.position = 'fixed';
  popover.style.right = '24px';
  popover.style.top = '96px';
  popover.style.transform = 'none';

  // requestAnimationFrame 确保浏览器已完成布局，再读取按钮坐标并跟随。
  // 再次读取 anchor 的位置，以防第一次读取不准确或元素位置发生变化。
  requestAnimationFrame(() => {
    const rect = anchor.getBoundingClientRect();
    // 仅在获取到有效坐标时才调整位置，否则保持右上方兜底。
    if (rect.left > 0 || rect.top > 0) {
      popover.style.left = `${Math.round(rect.left)}px`;
      popover.style.top = `${Math.round(rect.bottom + 6)}px`;
      popover.style.right = ''; // 清除 right 属性，让 left 生效
    }
  });

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
