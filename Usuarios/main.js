const ROLE_MAP = {
  1: "Administrador",
  2: "Mantenimiento",
  3: "Recepcionista"
};

let currentUsers = [];

async function fetchUsers() {
  try {
    const response = await fetch('/api/handleUser', { method: 'GET' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const result = await response.json();
    const arr = Array.isArray(result.usuarios) ? result.usuarios
              : Array.isArray(result.data) ? result.data
              : Array.isArray(result) ? result
              : [];
    return arr;
  } catch (err) {
    console.error('Error al obtener usuarios:', err);
    throw err;
  }
}

function ensurePopupStyles() {
  if (document.getElementById('user-popup-styles')) return;
  const style = document.createElement('style');
  style.id = 'user-popup-styles';
  style.textContent = `
    .user-table tr { transition: background .12s; }
    .user-table tr:hover { background: #f5f5f5; }
    .user-table tr.clickable { cursor: pointer; }
    .user-popup {
      position: fixed;
      min-width: 160px;
      background: #fff;
      border: 1px solid rgba(0,0,0,.12);
      box-shadow: 0 6px 18px rgba(0,0,0,.12);
      border-radius: 6px;
      z-index: 9999;
      padding: 6px 0;
      font-family: system-ui, sans-serif;
    }
    .user-popup .item {
      padding: 8px 12px;
      cursor: pointer;
      user-select: none;
    }
    .user-popup .item:hover { background: #f0f0f0; }
    .user-popup .item {color: #333; }
    .user-popup .item.danger { color: #b00020; }

    /* Modal edit styles */
    .edit-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    }
    .edit-modal {
      background: #fff;
      border-radius: 8px;
      padding: 16px;
      width: 360px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      font-family: system-ui, sans-serif;
    }
    .edit-modal h3 { margin: 0 0 8px 0; }
    .edit-modal label { display:block; font-size: 13px; margin-top:8px; }
    .edit-modal input, .edit-modal select {
      width:100%; padding:8px; margin-top:4px; box-sizing:border-box;
      border:1px solid #ccc; border-radius:4px;
    }
    .edit-modal .actions { display:flex; gap:8px; justify-content:flex-end; margin-top:12px; }
    .btn { padding:8px 12px; border-radius:4px; cursor:pointer; border: none; }
    .btn.primary { background:#0b5cff; color:#fff; }
    .btn.secondary { background:#eee; }
    .btn.danger { background:#b00020; color:#fff; }
  `;
  document.head.appendChild(style);
}

function removeExistingPopup() {
  const existing = document.querySelector('.user-popup');
  if (existing) existing.remove();
  document.removeEventListener('click', handleOutsideClick);
  document.removeEventListener('keydown', handleEsc);
}

function handleOutsideClick(e) {
  const popup = document.querySelector('.user-popup');
  if (!popup) return;
  if (!popup.contains(e.target)) removeExistingPopup();
}

function handleEsc(e) {
  if (e.key === 'Escape') removeExistingPopup();
}

function showEditModal(user) {
  removeEditModal();
  ensurePopupStyles();

  const backdrop = document.createElement('div');
  backdrop.className = 'edit-modal-backdrop';

  const modal = document.createElement('div');
  modal.className = 'edit-modal';

  modal.innerHTML = `
    <h3>Editar usuario</h3>
    <label>Nombre
      <input type="text" id="edit-username" value="${escapeHtml(user.username ?? '')}">
    </label>
    <label>Rol
      <select id="edit-rol">
        <option value="">-- seleccionar --</option>
        <option value="1">Administrador</option>
        <option value="2">Mantenimiento</option>
        <option value="3">Recepcionista</option>
      </select>
    </label>
    <label>Contraseña (dejar en blanco para no cambiar)
      <input type="password" id="edit-password" placeholder="Nueva contraseña opcional">
    </label>
    <div class="actions">
      <button class="btn secondary" id="edit-cancel">Cancelar</button>
      <button class="btn primary" id="edit-save">Guardar</button>
    </div>
  `;

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  // preselect rol
  const sel = modal.querySelector('#edit-rol');
  const rawRol = user.rol ?? user.idrol ?? '';
  if (rawRol !== '') sel.value = String(rawRol);

  modal.querySelector('#edit-cancel').addEventListener('click', () => removeEditModal());
  modal.querySelector('#edit-save').addEventListener('click', async () => {
    const newName = modal.querySelector('#edit-username').value.trim();
    const newRol = modal.querySelector('#edit-rol').value;
    const newPass = modal.querySelector('#edit-password').value;

    if (!newName) {
      alert('El nombre no puede estar vacío.');
      return;
    }

    const payload = {
      idusuario: user.idusuario ?? user.id ?? null,
      username: newName,
      rol: newRol ? Number(newRol) : null
    };
    if (newPass) payload.password = newPass;

    try {
      const res = await fetch('/api/handleUser', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }
      const data = await res.json();
      // actualizar currentUsers y re-renderizar
      currentUsers = currentUsers.map(u => {
        if ((u.idusuario ?? u.id) === (payload.idusuario)) {
          return { ...u, username: payload.username, rol: payload.rol ?? u.rol ?? u.idrol };
        }
        return u;
      });
      renderUserList(currentUsers);
      removeEditModal();
      alert('Usuario actualizado correctamente.');
    } catch (err) {
      console.error('Error actualizando usuario:', err);
      alert('Error al actualizar usuario. Revisa la consola.');
    }
  });

  // close modal on backdrop click or ESC
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) removeEditModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') removeEditModal();
  }, { once: true });
}

function removeEditModal() {
  const bd = document.querySelector('.edit-modal-backdrop');
  if (bd) bd.remove();
}

// simple escape to avoid injection into value attr
function escapeHtml(str) {
  return String(str).replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function showPopupMenu(user, x, y) {
  removeExistingPopup();
  ensurePopupStyles();

  const menu = document.createElement('div');
  menu.className = 'user-popup';
  const padding = 8;
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  const width = 200;
  const height = 140;
  let left = x;
  let top = y;
  if (left + width + padding > viewportW) left = viewportW - width - padding;
  if (top + height + padding > viewportH) top = viewportH - height - padding;
  menu.style.left = `${Math.max(padding, left)}px`;
  menu.style.top = `${Math.max(padding, top)}px`;

  function makeItem(text, cls, onClick) {
    const it = document.createElement('div');
    it.className = 'item' + (cls ? ' ' + cls : '');
    it.textContent = text;
    it.addEventListener('click', (ev) => {
      ev.stopPropagation();
      onClick(user);
      removeExistingPopup();
    });
    return it;
  }

  // <-- Aquí se implementa el popup de edición solicitado en la línea 107 -->
  menu.appendChild(makeItem('Editar usuario', '', (u) => {
    // abrir un modal de edición que permite cambiar: contraseña, nombre y rol
    showEditModal(u);
  }));

  menu.appendChild(makeItem('Eliminar usuario', 'danger', async (u) => {
    if (!confirm(`Eliminar usuario ${u.username || u.email || u.idusuario}?`)) return;
    try {
      const res = await fetch('/api/handleUser', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idusuario: u.idusuario ?? u.id })
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }
      currentUsers = currentUsers.filter(x => (x.idusuario ?? x.id) !== (u.idusuario ?? u.id));
      renderUserList(currentUsers);
    } catch (err) {
      console.error('Error eliminando usuario:', err);
      alert('Error eliminando usuario. Revisa la consola.');
    }
  }));

  document.body.appendChild(menu);
  setTimeout(() => {
    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('keydown', handleEsc);
  }, 0);
}

function renderUserList(users) {
  const messageDiv = document.getElementById('user-list-message');
  const container = document.getElementById('user-list-container');

  messageDiv.style.display = 'none';
  container.innerHTML = '';

  if (!users || users.length === 0) {
    const p = document.createElement('p');
    p.textContent = 'No hay usuarios registrados.';
    container.appendChild(p);
    return;
  }

  const table = document.createElement('table');
  table.className = 'user-table';
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  ['ID', 'Username', 'Email', 'Rol', 'Activo', 'Creado'].forEach(h => {
    const th = document.createElement('th');
    th.textContent = h;
    th.style.textAlign = 'left';
    th.style.padding = '8px';
    th.style.borderBottom = '1px solid #ddd';
    th.style.textAlign = 'center';
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  users.forEach((user, idx) => {
    const tr = document.createElement('tr');
    tr.classList.add('clickable');

    const idTd = document.createElement('td');
    idTd.textContent = user.idusuario ?? '';
    idTd.style.padding = '8px';
    tr.appendChild(idTd);

    const nameTd = document.createElement('td');
    nameTd.textContent = user.username ?? '';
    nameTd.style.padding = '8px';
    tr.appendChild(nameTd);

    const emailTd = document.createElement('td');
    emailTd.textContent = user.email ?? '';
    emailTd.style.padding = '8px';
    tr.appendChild(emailTd);

    const rolTd = document.createElement('td');
    const rawRol = user.rol ?? user.idrol ?? '';
    const rolNum = Number(rawRol);
    rolTd.textContent = ROLE_MAP[rolNum] ?? rawRol ?? '';
    rolTd.style.padding = '8px';
    tr.appendChild(rolTd);

    const activoTd = document.createElement('td');
    activoTd.textContent = user.activo === true || user.activo === 't' ? 'Sí' : 'No';
    activoTd.style.padding = '8px';
    tr.appendChild(activoTd);

    const createdTd = document.createElement('td');
    createdTd.textContent = user.created_ad ? new Date(user.created_ad).toLocaleString() : '';
    createdTd.style.padding = '8px';
    tr.appendChild(createdTd);

    tr.addEventListener('click', (ev) => {
      const x = ev.clientX;
      const y = ev.clientY;
      showPopupMenu(user, x, y);
    });

    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  container.appendChild(table);
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    currentUsers = await fetchUsers();
    renderUserList(currentUsers);
  } catch (err) {
    const messageDiv = document.getElementById('user-list-message');
    messageDiv.textContent = 'Error al cargar la lista de usuarios. Revisa la consola.';
    messageDiv.style.color = 'red';
  }
});