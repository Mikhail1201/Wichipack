// incidencias.js  (estilo main.js)
// =====================================================
// Endpoints
const API_INCIDENCIAS = "/api/handleIncidence";
const API_PATINETAS = "/api/handleProduct";
const API_ESTADOS = "/api/getEstados";

// Globals
let incidenciasGlobal = [];
let estadosGlobal = [];
let patinetasGlobal = [];

// Referencias DOM (se usan ids del HTML que compartiste)
let incidenciasTableTBody;
let historialTableTBody;

// =====================================================
// Estilos para popup/modal (reutilizable desde main.js)
function ensurePopupStyles() {
    if (document.getElementById("incidencias-popup-styles")) return;
    const style = document.createElement("style");
    style.id = "incidencias-popup-styles";
    style.textContent = `
    .incidencia-table tr { transition: background .12s; }
    .incidencia-table tr:hover { background: #f5f5f5; cursor: pointer; }
    .incidencia-popup {
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
    .incidencia-popup .item {
      padding: 8px 12px;
      cursor: pointer;
      user-select: none;
    }
    .incidencia-popup .item:hover { background: #f0f0f0; }
    .incidencia-popup .item.danger { color: #b00020; }
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
      padding: 20px;
      width: 520px;
      max-width: calc(100% - 32px);
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      font-family: system-ui, sans-serif;
    }
    .edit-modal h3 { margin: 0 0 12px 0; }
    .edit-modal label { display:block; font-size: 13px; margin-top:8px; }
    .edit-modal input, .edit-modal select, .edit-modal textarea {
      width:100%; padding:8px; margin-top:4px; box-sizing:border-box;
      border:1px solid #ccc; border-radius:4px;
    }
    .edit-modal .actions { display:flex; gap:8px; justify-content:flex-end; margin-top:16px; }
    .btn { padding:8px 12px; border-radius:4px; cursor:pointer; border: none; }
    .btn.primary { background:#0b5cff; color:#fff; }
    .btn.secondary { background:#eee; }
    .btn.danger { background:#b00020; color:#fff; }
    .badge { padding:3px 8px; border-radius:12px; font-size:12px; display:inline-block; }
    .badge-info { background:#e6f7ff; color:#0b5cff; }
    .badge-warning { background:#fff7e6; color:#b06b00; }
    .badge-error { background:#ffe6e6; color:#b00020; }
    .shake { animation: shake .8s infinite; }
    @keyframes shake { 0%{transform:translateX(0)}25%{transform:translateX(-2px)}75%{transform:translateX(2px)}100%{transform:translateX(0)} }
  `;
    document.head.appendChild(style);
}

// =====================================================
// Inicialización
document.addEventListener("DOMContentLoaded", async () => {
    incidenciasTableTBody = document.getElementById("incidenciasTable").getElementsByTagName("tbody")[0];

    ensurePopupStyles();

    // Cargar datos iniciales
    await Promise.all([loadPatinetas(), loadEstados(), loadIncidencias()]);

    // Formularios
    const nuevaForm = document.getElementById("incidenciaForm");
    if (nuevaForm) nuevaForm.addEventListener("submit", handleNuevaIncidencia);

    const editarForm = document.getElementById("editIncidenciaForm");
    if (editarForm) editarForm.addEventListener("submit", handleEditarIncidencia);
});

// =====================================================
// Fetch helpers con token
function authHeaders(extra = {}) {
    const token = localStorage.getItem("token");
    const h = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...extra,
    };
    return h;
}

// =====================================================
// Cargar patinetas
async function loadPatinetas() {
    try {
        const res = await fetch(API_PATINETAS, { headers: authHeaders() });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        patinetasGlobal = Array.isArray(data) ? data : data.data || [];
        const sel = document.getElementById("patineta");
        if (!sel) return;
        sel.innerHTML = `<option value="">Seleccione una patineta</option>` + patinetasGlobal.map(p =>
            `<option value="${p.idpatineta}">${p.modelo} - ${p.numero_serie}</option>`
        ).join("");
        window.patinetasGlobal = patinetasGlobal;
    } catch (err) {
        console.error("Error cargando patinetas:", err);
        alert("Error al cargar patinetas. Revisa la consola.");
    }
}

// =====================================================
// Cargar estados
// =====================================================
// Cargar estados
async function loadEstados() {
    try {
        const res = await fetch(API_ESTADOS, { headers: authHeaders() });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        // ✅ Filtrar por rango de id
        estadosGlobal = (Array.isArray(data) ? data : data.data || [])
            .filter(e => {
                const id = Number(e.idestados ?? e.id_estado ?? e.id ?? e.idEstado);
                return id > 0 && id < 10;
            });

        // Llenar selects #estado y #editEstado si existen
        document.querySelectorAll("#estado, #editEstado").forEach(sel => {
            sel.innerHTML = `<option value="">Seleccione un estado</option>` + estadosGlobal.map(e =>
                `<option value="${e.idestados ?? e.id_estado ?? e.id ?? e.idEstado}">${e.nombre}</option>`
            ).join("");            
        });
        window.estadosGlobal = estadosGlobal;
    } catch (err) {
        console.error("Error cargando estados:", err);
        alert("Error al cargar estados. Revisa la consola.");
    }
}


// =====================================================
// Cargar incidencias (lista)
async function loadIncidencias() {
    try {
        const res = await fetch(API_INCIDENCIAS, { headers: authHeaders() });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        incidenciasGlobal = Array.isArray(data) ? data : data.data || [];
        renderIncidenciasList(incidenciasGlobal);
    } catch (err) {
        console.error("Error cargando incidencias:", err);
        alert("Error al cargar las incidencias. Revisa la consola.");
        incidenciasGlobal = [];
        renderIncidenciasList([]);
    }
}

// =====================================================
// Render tabla de incidencias (estilo main.js)
// =====================================================
// Render tabla de incidencias (fix IDs tipo string/number)
function renderIncidenciasList(list) {
    const cont = incidenciasTableTBody;
    cont.innerHTML = "";

    if (!list.length) {
        const r = cont.insertRow();
        r.innerHTML = `<td colspan="9" class="text-center"><p class="empty-message">No hay incidencias registradas</p></td>`;
        return;
    }

    list.forEach(inc => {
        const row = cont.insertRow();

        // Fechas
        const fechaReporte = new Date(inc.fecha_reporte).toLocaleDateString("es-ES", {
            year: "numeric", month: "long", day: "numeric"
        });
        const fechaResolucion = inc.fecha_resolucion
            ? new Date(inc.fecha_resolucion).toLocaleDateString("es-ES", {
                year: "numeric", month: "long", day: "numeric"
            })
            : "Pendiente";

        // Costo
        const costoForm = new Intl.NumberFormat("es-ES", {
            style: "currency",
            currency: "COP"
        }).format(Number(inc.costo_reparacion || 0));

        // Prioridad visual
        const prioridadClass = {
            baja: "badge-info",
            media: "badge-warning",
            alta: "badge-error",
            urgente: "badge-error shake"
        }[(inc.prioridad || "media").toLowerCase()];

        // 🛴 Buscar patineta (asegurando tipo numérico)
        const patineta = (window.patinetasGlobal || []).find(
            p => Number(p.idpatineta) === Number(inc.idpatineta)
        );

        console.log("Patineta encontrada para incidencia", inc.idincidencia, ":", patineta);

        const patinetaInfo = patineta
            ? `${patineta.modelo} - ${patineta.numero_serie}`
            : "Desconocida";

        // ⚙️ Buscar estado (asegurando tipo numérico)
        const estado = (window.estadosGlobal || []).find(
            e => Number(e.idestados ?? e.id_estado ?? e.id ?? e.idEstado) === Number(inc.idestado)
        );
        const estadoNombre = estado ? estado.nombre : "Sin estado";

        // Render fila
        row.innerHTML = `
            <td>${inc.idincidencia}</td>
            <td>${patinetaInfo}</td>
            <td>${inc.tipo || "-"}</td>
            <td><span class="badge ${prioridadClass}">${inc.prioridad || "media"}</span></td>
            <td>${estadoNombre}</td>
            <td>${fechaReporte}</td>
            <td>${fechaResolucion}</td>
            <td>${costoForm}</td>
            <td>
                <button class="btn btn.secondary btn-view" data-id="${inc.idincidencia}">Ver</button>
                <button class="btn btn.primary btn-edit" data-id="${inc.idincidencia}">Editar</button>
                <button class="btn btn.danger btn-delete" data-id="${inc.idincidencia}">Eliminar</button>
            </td>
        `;
    });

    // Delegación de eventos
    cont.querySelectorAll(".btn-view").forEach(b => b.addEventListener("click", (e) => {
        const id = e.currentTarget.dataset.id;
        openDetailsModal(Number(id));
    }));
    cont.querySelectorAll(".btn-edit").forEach(b => b.addEventListener("click", (e) => {
        const id = e.currentTarget.dataset.id;
        openEditModalById(Number(id));
    }));
    cont.querySelectorAll(".btn-delete").forEach(b => b.addEventListener("click", (e) => {
        const id = e.currentTarget.dataset.id;
        confirmAndDelete(Number(id));
    }));
}

// =====================================================
// Popup contextual (editar/eliminar/ver)
function showPopupMenu(incidencia, x, y) {
    removeExistingPopup();
    ensurePopupStyles();

    const menu = document.createElement("div");
    menu.className = "incidencia-popup";

    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const width = 200;
    const height = 120;
    const padding = 8;
    let left = x;
    let top = y;
    if (left + width + padding > viewportW) left = viewportW - width - padding;
    if (top + height + padding > viewportH) top = viewportH - height - padding;
    menu.style.left = `${Math.max(padding, left)}px`;
    menu.style.top = `${Math.max(padding, top)}px`;

    function makeItem(text, cls, onClick) {
        const item = document.createElement("div");
        item.className = "item" + (cls ? " " + cls : "");
        item.textContent = text;
        item.addEventListener("click", (e) => {
            e.stopPropagation();
            onClick(incidencia);
            removeExistingPopup();
        });
        return item;
    }

    menu.appendChild(makeItem("Ver detalles", "", (i) => openDetailsModal(i.idincidencia)));
    menu.appendChild(makeItem("Editar incidencia", "", (i) => openEditModalById(i.idincidencia)));
    menu.appendChild(makeItem("Eliminar incidencia", "danger", (i) => confirmAndDelete(i.idincidencia)));

    document.body.appendChild(menu);

    setTimeout(() => {
        document.addEventListener("click", handleOutsideClick);
        document.addEventListener("keydown", handleEsc);
    }, 0);
}
function removeExistingPopup() {
    const existing = document.querySelector(".incidencia-popup");
    if (existing) existing.remove();
    document.removeEventListener("click", handleOutsideClick);
    document.removeEventListener("keydown", handleEsc);
}
function handleOutsideClick(e) {
    const popup = document.querySelector(".incidencia-popup");
    if (!popup) return;
    if (!popup.contains(e.target)) removeExistingPopup();
}
function handleEsc(e) {
    if (e.key === "Escape") removeExistingPopup();
}

// =====================================================
// Abrir modal detalles / edición reutilizando tu HTML modal
async function openDetailsModal(idincidencia) {
    try {
        // Intentar endpoint GET /:id — si falla, fallback a buscar en la lista global
        let incidencia;

        if (!incidencia) {
            incidencia = incidenciasGlobal.find(i => Number(i.idincidencia) === Number(idincidencia));
            if (!incidencia) {
                // recarga lista como último recurso
                await loadIncidencias();
                incidencia = incidenciasGlobal.find(i => Number(i.idincidencia) === Number(idincidencia));
            }
        }

        if (!incidencia) throw new Error("Incidencia no encontrada");

        // Poblar el modal (ids según tu HTML existente)
        document.getElementById("editId").value = incidencia.idincidencia;
        document.getElementById("modalPatineta").textContent = `${incidencia.patineta_modelo || "-"}${incidencia.patineta_serie ? " - " + incidencia.patineta_serie : ""}`;
        document.getElementById("editTipo").value = incidencia.tipo || "";
        document.getElementById("editPrioridad").value = incidencia.prioridad || "media";
        document.getElementById("editEstado").value = incidencia.idestado || "";
        document.getElementById("editCosto").value = incidencia.costo_reparacion || 0;
        document.getElementById("editDescripcion").value = incidencia.descripcion || "";
        document.getElementById("editFechaResolucion").value = incidencia.fecha_resolucion ? incidencia.fecha_resolucion.split("T")[0] : "";

        // cargar historial y abrir modal
        document.getElementById("incidenciaModal").classList.add("activo");
    } catch (err) {
        console.error("openDetailsModal error:", err);
        alert("Error al cargar la incidencia. Revisa la consola.");
    }
}

async function openEditModalById(idincidencia) {
    // reusa openDetailsModal que ya llena el formulario de edición
    await openDetailsModal(idincidencia);
    // Además, ensure focus on form
    const editField = document.getElementById("editDescripcion");
    if (editField) editField.focus();
}

// =====================================================
// Crear nueva incidencia (POST)
async function handleNuevaIncidencia(ev) {
    ev.preventDefault();

    try {
        // 🟢 1. Verificar sesión (token)
        const token = localStorage.getItem("token");
        if (!token) {
            alert("⚠️ No hay sesión activa. Inicia sesión nuevamente.");
            window.location.href = "/Login/index.html";
            return;
        }

        // 🟢 2. Verificar el token y obtener info del usuario
        const response = await fetch("/api/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "check", token }),
        });

        const result = await response.json();
        console.log("🧑‍💻 Usuario autenticado:", result);

        if (!response.ok || !result.idusuario) {
            alert("Tu sesión ha expirado. Inicia sesión nuevamente.");
            window.location.href = "/Login/index.html";
            return;
        }

        // 🟢 3. Construir cuerpo de la incidencia
        const body = {
            idpatineta: Number(document.getElementById("patineta").value) || null,
            tipo: document.getElementById("tipo").value || null,
            prioridad: document.getElementById("prioridad").value || "media",
            idestado: Number(document.getElementById("estado").value) || null,
            descripcion: document.getElementById("descripcion").value || "",
            costo_reparacion: Number(document.getElementById("costo").value) || 0,
            idusuario: result.idusuario, // ✅ Ya lo devuelve el backend
        };

        console.log("🧾 Enviando nueva incidencia:", body);

        // 🟢 4. Enviar incidencia
        const r = await fetch("/api/handleIncidence", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
        });

        if (!r.ok) throw new Error(`HTTP ${r.status}`);

        alert("✅ Incidencia registrada exitosamente");
        ev.target.reset();
        await loadIncidencias();
    } catch (err) {
        console.error("❌ Error creando incidencia:", err);
        alert("Error al registrar la incidencia. Revisa la consola.");
    }
}




// =====================================================
// Editar incidencia (PUT)
async function handleEditarIncidencia(ev) {
    ev.preventDefault();
    try {
        const id = document.getElementById("editId").value;
        if (!id) throw new Error("Falta ID de incidencia");

        // 🟢 1. Verificar sesión (token)
        const token = localStorage.getItem("token");
        if (!token) {
            alert("⚠️ No hay sesión activa. Inicia sesión nuevamente.");
            window.location.href = "/Login/index.html";
            return;
        }

        // 🟢 2. Verificar el token y obtener info del usuario
        const response = await fetch("/api/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "check", token }),
        });

        const result = await response.json();
        console.log("🧑‍💻 Usuario autenticado:", result);

        if (!response.ok || !result.idusuario) {
            alert("Tu sesión ha expirado. Inicia sesión nuevamente.");
            window.location.href = "/Login/index.html";
            return;
        }

        const body = {
            idincidencia: Number(id),
            descripcion: document.getElementById("editDescripcion").value || "",
            fecha_resolucion: document.getElementById("editFechaResolucion").value || null,
            idestado: Number(document.getElementById("editEstado").value) || null,
            tipo: document.getElementById("editTipo").value || null,
            prioridad: document.getElementById("editPrioridad").value || "media",
            costo_reparacion: Number(document.getElementById("editCosto").value) || 0,
            idusuario: result.idusuario,
            observaciones: document.getElementById("observaciones").value || ""
        };

        const r = await fetch(`${API_INCIDENCIAS}`, {
            method: "PUT",
            headers: authHeaders(),
            body: JSON.stringify(body)
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const updated = await r.json();
        alert("Incidencia actualizada exitosamente");
        closeModal("incidenciaModal");
        await loadIncidencias();
    } catch (err) {
        console.error("Error actualizando incidencia:", err);
        alert("Error al actualizar la incidencia. Revisa la consola.");
    }
}

// =====================================================
// Confirmar y eliminar incidencia (DELETE)
async function confirmAndDelete(idincidencia) {
    if (!confirm(`¿Seguro que deseas eliminar la incidencia #${idincidencia}?`)) return;
    try {
        // Intentar DELETE en /:id (RESTful). Si tu backend espera body, ajusta a tu ruta.
        const r = await fetch(`${API_INCIDENCIAS}`, {
            method: "DELETE",
            headers: authHeaders()
        });
        if (r.status === 404 || !r.ok) {
            // fallback: intentar DELETE enviando JSON body a la ruta base
            const r2 = await fetch(API_INCIDENCIAS, {
                method: "DELETE",
                headers: authHeaders(),
                body: JSON.stringify({ idincidencia })
            });
            if (!r2.ok) throw new Error(`HTTP ${r2.status}`);
        }
        alert("Incidencia eliminada correctamente");
        await loadIncidencias();
    } catch (err) {
        console.error("Error eliminando incidencia:", err);
        alert("Error al eliminar la incidencia. Revisa la consola.");
    }
}

// =====================================================
// Cerrar modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove("activo");
}

// Exponer util (opcional)
window.incidenciasReload = loadIncidencias;
