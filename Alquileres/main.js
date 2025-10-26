let currentRents = [];
let currentClients = [];
let currentProducts = [];
let currentStates = [];
let currentRates = [];

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Error HTTP ${res.status} al obtener ${url}`);
  return res.json();
}

// 🧠 Cargar todos los datos necesarios
async function loadAllData() {
  const [rents, clients, products, states, rates] = await Promise.all([
    fetchJSON("/api/handleRent"),
    fetchJSON("/api/handleClient"),
    fetchJSON("/api/handleProduct"),
    fetchJSON("/api/getEstados"),
  ]);
  currentRents = rents;
  currentClients = clients;
  currentProducts = products;
  // filtrar solo los estados con id mayor a 10
  currentStates = states.filter(s => s.idestados > 10 && s.idestados <= 20);
}

// 🧩 Obtener nombres por ID
function getClientName(id) {
  const c = currentClients.find((cl) => cl.idcliente === id);
  return c ? `${c.nombre} ${c.apellido}` : "—";
}
function getProductName(id) {
  const p = currentProducts.find((pr) => pr.idpatineta === id);
  return p ? p.modelo || p.numero_serie : "—";
}
function getStateName(id) {
    const s = currentStates.find((st) => st.idestados === id);
    return s ? s.nombre : "—";    
}

// 🧾 Renderizar tabla
function renderRentsTable(list) {
  const tbody = document.getElementById("alquileres-body");
  tbody.innerHTML = "";

  if (!list || list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;">No hay alquileres registrados</td></tr>`;
    return;
  }

  list.forEach((r) => {
    const tr = document.createElement("tr");
    tr.classList.add("clickable");
    tr.innerHTML = `
      <td>${r.fecha_hora_inicio || ""}</td>
      <td>${r.fecha_hora_fin || ""}</td>
      <td>$${r.precio || 0}</td>
      <td>${getClientName(r.idcliente)}</td>
      <td>${getStateName(r.idestado)}</td>
      <td>${getProductName(r.idpatineta)}</td>
      <td>${r.horas_alquiladas ?? "—"}</td>
    `;
    tr.addEventListener("click", (ev) => showPopupMenu(r, ev.clientX, ev.clientY));
    tbody.appendChild(tr);
  });
}

// 🧭 Popup contextual (Editar / Eliminar)
function showPopupMenu(rent, x, y) {
  removeExistingPopup();
  ensurePopupStyles();

  const menu = document.createElement("div");
  menu.className = "client-popup";
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;

  const makeItem = (text, cls, fn) => {
    const el = document.createElement("div");
    el.className = "item" + (cls ? " " + cls : "");
    el.textContent = text;
    el.onclick = () => {
      removeExistingPopup();
      fn(rent);
    };
    return el;
  };

  menu.appendChild(makeItem("Editar alquiler", "", () => showEditModal(rent)));
  menu.appendChild(
    makeItem("Eliminar alquiler", "danger", async () => {
      if (!confirm("¿Eliminar este alquiler?")) return;
      await fetch("/api/handleRent", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idalquiler: rent.idalquiler }),
      });
      currentRents = currentRents.filter((r) => r.idalquiler !== rent.idalquiler);
      renderRentsTable(currentRents);
    })
  );

  document.body.appendChild(menu);
  setTimeout(() => {
    document.addEventListener("click", handleOutsideClick);
    document.addEventListener("keydown", handleEsc);
  }, 0);
}

// 💬 Estilos y popup helpers
function ensurePopupStyles() {
  if (document.getElementById("rent-popup-styles")) return;
  const style = document.createElement("style");
  style.id = "rent-popup-styles";
  style.textContent = `
    .client-popup {
      position: fixed;
      background: #fff;
      border: 1px solid rgba(0,0,0,.15);
      box-shadow: 0 6px 18px rgba(0,0,0,.12);
      border-radius: 6px;
      z-index: 9999;
      padding: 6px 0;
      font-family: system-ui, sans-serif;
    }
    .client-popup .item {
      padding: 8px 12px;
      cursor: pointer;
    }
    .client-popup .item:hover { background: #f0f0f0; }
    .client-popup .item.danger { color: #b00020; }
    .edit-modal-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,.35);
      display: flex; align-items: center; justify-content: center; z-index: 10000;
    }
    .edit-modal {
      background: #fff; border-radius: 8px; padding: 16px; width: 600px; height: 75vh;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2); font-family: system-ui, sans-serif;
      display: grid; grid-template-columns: repeat(2, 1fr); grid-gap: 12px; overflow-y: auto;
    }
    .edit-modal label { display:block; margin-top:8px; font-size:13px; }
    .edit-modal input, .edit-modal select {
      width:100%; padding:8px; margin-top:4px; border:1px solid #ccc; border-radius:4px;
    }
    .edit-modal .actions { display:flex; justify-content:flex-end; gap:8px; margin-top:12px; }
    .btn { padding:8px 12px; border-radius:4px; cursor:pointer; border:none; }
    .btn.primary { background:#0b5cff; color:#fff; }
    .btn.secondary { background:#eee; }
  `;
  document.head.appendChild(style);
}

function removeExistingPopup() {
  const p = document.querySelector(".client-popup");
  if (p) p.remove();

  document.removeEventListener("click", handleOutsideClick);
  document.removeEventListener("keydown", handleEsc);
}

function handleOutsideClick(e) {
  if (!document.querySelector(".client-popup")?.contains(e.target)) removeExistingPopup();
}
function handleEsc(e) {
  if (e.key === "Escape") removeExistingPopup();
}

// 📝 Modal de edición
function showEditModal(rent) {
  removeEditModal();
  ensurePopupStyles();

  const backdrop = document.createElement("div");
  backdrop.className = "edit-modal-backdrop";

  const modal = document.createElement("div");
  modal.className = "edit-modal";

  modal.innerHTML = `
    <h3>Editar alquiler</h3>
    <label>Hora inicio<input type="datetime-local" id="edit-inicio" value="${rent.fecha_hora_inicio || ""}"></label>
    <label>Hora fin<input type="datetime-local" id="edit-fin" value="${rent.fecha_hora_fin || ""}"></label>
    <label>Precio<input type="number" id="edit-precio" value="${rent.precio || 0}"></label>
    <label>Estado<select id="edit-estado">${currentStates.map(s => `<option value="${s.idestados}" ${s.idestados === rent.idestado ? "selected" : ""}>${s.nombre}</option>`).join("")}</select></label>
    <label>Cliente<select id="edit-cliente">${currentClients.map(c => `<option value="${c.idcliente}" ${c.idcliente === rent.idcliente ? "selected" : ""}>${c.nombre} ${c.apellido}</option>`).join("")}</select></label>
    <label>Producto<select id="edit-producto">${currentProducts.map(p => `<option value="${p.idpatineta}" ${p.idpatineta === rent.idpatineta ? "selected" : ""}>${p.modelo || p.numero_serie}</option>`).join("")}</select></label>
    <label>Horas alquiladas<input type="number" id="edit-horas" value="${rent.horas_alquiladas || 0}"></label>
    <div class="actions">
      <button class="btn secondary" id="edit-cancel">Cancelar</button>
      <button class="btn primary" id="edit-save">Guardar</button>
    </div>
  `;

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  modal.querySelector("#edit-cancel").onclick = removeEditModal;
  modal.querySelector("#edit-save").onclick = async () => {
    const payload = {
      idalquiler: rent.idalquiler,
      fecha_hora_inicio: modal.querySelector("#edit-inicio").value,
      fecha_hora_fin: modal.querySelector("#edit-fin").value,
      precio: parseFloat(modal.querySelector("#edit-precio").value),
      idestado: parseInt(modal.querySelector("#edit-estado").value),
      idcliente: parseInt(modal.querySelector("#edit-cliente").value),
      idpatineta: parseInt(modal.querySelector("#edit-producto").value),
      horas_alquiladas: parseInt(modal.querySelector("#edit-horas").value),
    };

    await fetch("/api/handleRent", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    Object.assign(rent, payload);
    renderRentsTable(currentRents);
    removeEditModal();
  };
}

function removeEditModal() {
  const bd = document.querySelector(".edit-modal-backdrop");
  if (bd) bd.remove();
}

// ➕ Modal para crear nuevo alquiler
function showAddModal() {
  showEditModal({
    idalquiler: null,
    fecha_hora_inicio: "",
    fecha_hora_fin: "",
    precio: 0,
    idestado: currentStates[0]?.idestados,
    idcliente: currentClients[0]?.idcliente,
    idpatineta: currentProducts[0]?.idpatineta,
    horas_alquiladas: 1,
  });

  const modal = document.querySelector(".edit-modal");
  modal.querySelector("h3").textContent = "Nuevo alquiler";
  modal.querySelector("#edit-save").onclick = async () => {
    const payload = {
      fecha_hora_inicio: modal.querySelector("#edit-inicio").value,
      fecha_hora_fin: modal.querySelector("#edit-fin").value,
      precio: parseFloat(modal.querySelector("#edit-precio").value),
      idestado: parseInt(modal.querySelector("#edit-estado").value),
      idcliente: parseInt(modal.querySelector("#edit-cliente").value),
      idpatineta: parseInt(modal.querySelector("#edit-producto").value),
      horas_alquiladas: parseInt(modal.querySelector("#edit-horas").value),
    };

    const res = await fetch("/api/handleRent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.alquiler) currentRents.push(data.alquiler[0]);
    renderRentsTable(currentRents);
    removeEditModal();
  };
}

// 🔍 Filtros
function applyFilters() {
  const search = document.getElementById("buscarAlquiler").value.toLowerCase();
  const estado = document.getElementById("filtroEstado").value;

  let filtered = currentRents;
  if (estado) filtered = filtered.filter((r) => String(r.idestado) === estado);
  if (search)
    filtered = filtered.filter((r) => {
      const client = getClientName(r.idcliente).toLowerCase();
      const product = getProductName(r.idpatineta).toLowerCase();
      return client.includes(search) || product.includes(search);
    });
  renderRentsTable(filtered);
}

// 🚀 Inicializar
document.addEventListener("DOMContentLoaded", async () => {
  await loadAllData();

  const filtroEstado = document.getElementById("filtroEstado");
  filtroEstado.innerHTML = `<option value="">Todos los estados</option>` +
    currentStates.map((s) => `<option value="${s.idestados}">${s.nombre}</option>`).join("");

  renderRentsTable(currentRents);

  document.getElementById("buscarAlquiler").addEventListener("input", applyFilters);
  document.getElementById("filtroEstado").addEventListener("change", applyFilters);
  document.querySelector(".btn-primary").addEventListener("click", showAddModal);
});
