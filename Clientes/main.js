let currentClients = [];

async function fetchClients() {
  try {
    const response = await fetch("/api/getClients");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const arr = Array.isArray(data.clientes) ? data.clientes :
                Array.isArray(data.data) ? data.data :
                Array.isArray(data) ? data : [];
    return arr;
  } catch (err) {
    console.error("Error al obtener clientes:", err);
    throw err;
  }
}

function ensurePopupStyles() {
  if (document.getElementById("client-popup-styles")) return;
  const style = document.createElement("style");
  style.id = "client-popup-styles";
  style.textContent = `
    .client-table tr { transition: background .12s; }
    .client-table tr:hover { background: #f5f5f5; }
    .client-table tr.clickable { cursor: pointer; }

    .client-popup {
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
    .client-popup .item {
      padding: 8px 12px;
      cursor: pointer;
      user-select: none;
    }
    .client-popup .item:hover { background: #f0f0f0; }
    .client-popup .item.danger { color: #b00020; }

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
      width: 400px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      font-family: system-ui, sans-serif;
    }
    .edit-modal h3 { margin: 0 0 8px 0; }
    .edit-modal label { display:block; font-size: 13px; margin-top:8px; }
    .edit-modal input {
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
  const existing = document.querySelector(".client-popup");
  if (existing) existing.remove();
  document.removeEventListener("click", handleOutsideClick);
  document.removeEventListener("keydown", handleEsc);
}

function handleOutsideClick(e) {
  const popup = document.querySelector(".client-popup");
  if (popup && !popup.contains(e.target)) removeExistingPopup();
}
function handleEsc(e) {
  if (e.key === "Escape") removeExistingPopup();
}

function escapeHtml(str) {
  return String(str).replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function showEditModal(client) {
  removeEditModal();
  ensurePopupStyles();

  const backdrop = document.createElement("div");
  backdrop.className = "edit-modal-backdrop";

  const modal = document.createElement("div");
  modal.className = "edit-modal";
  modal.innerHTML = `
    <h3>Editar cliente</h3>
    <label>Cédula<input type="number" id="edit-cedula" value="${escapeHtml(client.cedula ?? '')}"></label>
    <label>Nombre<input type="text" id="edit-nombre" value="${escapeHtml(client.nombre ?? '')}"></label>
    <label>Apellido<input type="text" id="edit-apellido" value="${escapeHtml(client.apellido ?? '')}"></label>
    <label>Teléfono<input type="text" id="edit-telefono" value="${escapeHtml(client.telefono ?? '')}"></label>
    <label>Email<input type="email" id="edit-email" value="${escapeHtml(client.email ?? '')}"></label>
    <label>Dirección<input type="text" id="edit-direccion" value="${escapeHtml(client.direccion ?? '')}"></label>
    <div class="actions">
      <button class="btn secondary" id="edit-cancel">Cancelar</button>
      <button class="btn primary" id="edit-save">Guardar</button>
    </div>
  `;

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  modal.querySelector("#edit-cancel").addEventListener("click", removeEditModal);

  modal.querySelector("#edit-save").addEventListener("click", async () => {
    const payload = {
      idcliente: client.idcliente,
      cedula: modal.querySelector("#edit-cedula").value.trim(),
      nombre: modal.querySelector("#edit-nombre").value.trim(),
      apellido: modal.querySelector("#edit-apellido").value.trim(),
      telefono: modal.querySelector("#edit-telefono").value.trim(),
      email: modal.querySelector("#edit-email").value.trim(),
      direccion: modal.querySelector("#edit-direccion").value.trim(),
    };

    try {
      const res = await fetch("/api/updateClient", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      alert("Cliente actualizado correctamente.");
      removeEditModal();
      currentClients = currentClients.map(c => c.idcliente === client.idcliente ? { ...c, ...payload } : c);
      renderClientList(currentClients);
    } catch (err) {
      console.error("Error actualizando cliente:", err);
      alert("Error al actualizar el cliente. Revisa la consola.");
    }
  });

  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) removeEditModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") removeEditModal();
  }, { once: true });
}

function removeEditModal() {
  const bd = document.querySelector(".edit-modal-backdrop");
  if (bd) bd.remove();
}

function showPopupMenu(client, x, y) {
  removeExistingPopup();
  ensurePopupStyles();

  const menu = document.createElement("div");
  menu.className = "client-popup";
  const width = 200, height = 120, pad = 8;
  const vw = window.innerWidth, vh = window.innerHeight;
  let left = Math.min(x, vw - width - pad);
  let top = Math.min(y, vh - height - pad);
  menu.style.left = `${Math.max(pad, left)}px`;
  menu.style.top = `${Math.max(pad, top)}px`;

  function makeItem(text, cls, handler) {
    const it = document.createElement("div");
    it.className = "item" + (cls ? " " + cls : "");
    it.textContent = text;
    it.addEventListener("click", (ev) => {
      ev.stopPropagation();
      handler(client);
      removeExistingPopup();
    });
    return it;
  }

  menu.appendChild(makeItem("Editar cliente", "", (c) => showEditModal(c)));
  menu.appendChild(makeItem("Eliminar cliente", "danger", async (c) => {
    if (!confirm(`¿Eliminar cliente ${c.nombre} ${c.apellido}?`)) return;
    try {
      const res = await fetch("/api/deleteClient", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idcliente: c.idcliente }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      currentClients = currentClients.filter(cl => cl.idcliente !== c.idcliente);
      renderClientList(currentClients);
      alert("Cliente eliminado correctamente.");
    } catch (err) {
      console.error("Error eliminando cliente:", err);
      alert("Error eliminando cliente. Revisa la consola.");
    }
  }));

  document.body.appendChild(menu);
  setTimeout(() => {
    document.addEventListener("click", handleOutsideClick);
    document.addEventListener("keydown", handleEsc);
  }, 0);
}

function renderClientList(clients) {
  const tbody = document.getElementById("clientes-body");
  tbody.innerHTML = "";

  if (!clients || clients.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8">No hay clientes registrados</td></tr>`;
    return;
  }

  clients.forEach((c) => {
    const tr = document.createElement("tr");
    tr.classList.add("clickable");
    tr.innerHTML = `
      <td>${c.idcliente ?? ""}</td>
      <td>${c.cedula ?? ""}</td>
      <td>${c.nombre ?? ""}</td>
      <td>${c.apellido ?? ""}</td>
      <td>${c.telefono ?? ""}</td>
      <td>${c.email ?? ""}</td>
      <td>${c.direccion ?? ""}</td>
    `;

    tr.addEventListener("click", (ev) => {
      const x = ev.clientX;
      const y = ev.clientY;
      showPopupMenu(c, x, y);
    });

    tbody.appendChild(tr);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    currentClients = await fetchClients();
    renderClientList(currentClients);
  } catch (err) {
    console.error("Error al cargar los clientes:", err);
  }
});
