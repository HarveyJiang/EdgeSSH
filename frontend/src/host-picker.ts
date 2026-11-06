import { api, type CloudHost } from './cloud-api';

/** 弹出服务器选择对话框，列出所有已保存主机（IP:端口 + 备注），选中后返回该主机。 */
export async function openHostPicker(): Promise<CloudHost | null> {
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog');
    dialog.className = 'host-picker-dialog host-dialog';
    dialog.setAttribute('aria-labelledby', 'host-picker-title');
    dialog.innerHTML = `
      <form autocomplete="off">
        <div class="dialog-heading">
          <h2 id="host-picker-title">选择服务器</h2>
          <button type="button" class="home-button" data-close aria-label="关闭" title="关闭"></button>
        </div>
        <div class="host-picker-list"></div>
        <div class="dialog-actions">
          <button type="button" class="home-button" data-cancel>取消</button>
        </div>
      </form>
    `;
    document.body.append(dialog);

    const list = dialog.querySelector('.host-picker-list')!;

    api<{ hosts: CloudHost[] }>('/api/hosts').then(({ hosts }) => {
      list.replaceChildren();
      if (hosts.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'home-empty';
        empty.textContent = '暂无服务器';
        list.append(empty);
        return;
      }
      for (const host of hosts) {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'host-picker-row';
        row.dataset.hostId = host.id;
        row.style.cssText =
          'display:flex;flex-direction:column;gap:2px;padding:10px 14px;border:1px solid var(--term-border);border-radius:8px;background:var(--term-chrome);color:inherit;cursor:pointer;text-align:left;';
        row.innerHTML = `
          <div style="font-weight:600;">${host.host}:${host.port}</div>
          <div style="font-size:11px;opacity:0.7;">${host.name} · ${host.group}</div>
        `;
        row.addEventListener('click', () => { dialog.close(); resolve(host); });
        list.append(row);
      }
    }).catch(() => {
      list.replaceChildren();
      const empty = document.createElement('p');
      empty.className = 'home-empty';
      empty.textContent = '加载服务器列表失败';
      list.append(empty);
    });

    const reject = () => { dialog.close(); resolve(null); };
    dialog.querySelector('[data-close]')!.addEventListener('click', reject);
    dialog.querySelector('[data-cancel]')!.addEventListener('click', reject);
    dialog.addEventListener('cancel', (event) => { event.preventDefault(); reject(); });
    dialog.addEventListener('close', () => dialog.remove());

    dialog.showModal();
  });
}
