let currentProducts = [];
let currentEstados = [];
let estadoMap = new Map(); // idestado → nombre
let estadoNameToId = new Map(); // nombre → idestado

// ==========================
// 🔹 Obtener productos de la API
// ==========================
async function fetchProducts() {
    try {
        const res = await fetch("/api/getProducts");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const arr = Array.isArray(data) ? data : (data.data || []);
        return arr;
    } catch (err) {
        console.error("Error al obtener productos:", err);
        throw err;
    }
}

// ==========================
// 🔹 Obtener estados y crear mapeos
// ==========================
async function fetchEstados() {
    try {
        const res = await fetch("/api/getEstados");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const estadosArr = Array.isArray(data)
            ? data
            : Array.isArray(data.data)
                ? data.data
                : Array.isArray(data.estados)
                    ? data.estados
                    : data && typeof data === "object"
                        ? [data]
                        : [];

        currentEstados = estadosArr.map((e) => ({
            id: e.idestado ?? e.idEstado ?? e.id ?? e.id_estados ?? e.idestados ?? null,
            nombre: e.nombre ?? e.nombre_estado ?? e.name ?? "Desconocido",
        }));

        estadoMap = new Map(currentEstados.map((e) => [String(e.id), e.nombre]));
        estadoNameToId = new Map(currentEstados.map((e) => [e.nombre.toLowerCase(), e.id]));

        console.log("✅ Estados cargados:", currentEstados);
        return currentEstados;
    } catch (err) {
        console.error("Error al obtener estados:", err);
        return [];
    }
}

// ==========================
// 🔹 Estilos del popup y modal
// ==========================
function ensurePopupStyles() {
    if (document.getElementById("product-popup-styles")) return;
    const style = document.createElement("style");
    style.id = "product-popup-styles";
    style.textContent = `
    .product-table tr { transition: background .12s; }
    .product-table tr:hover { background: #f5f5f5; }
    .product-table tr.clickable { cursor: pointer; }

    .product-popup {
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
    .product-popup .item {
      padding: 8px 12px;
      cursor: pointer;
      user-select: none;
    }
    .product-popup .item:hover { background: #f0f0f0; }
    .product-popup .item.danger { color: #b00020; }

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
      width: 420px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      font-family: system-ui, sans-serif;
    }
    .edit-modal h3 { margin: 0 0 8px 0; }
    .edit-modal label { display:block; font-size: 13px; margin-top:8px; }
    .edit-modal input, .edit-modal textarea, .edit-modal select {
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

// ==========================
// 🔹 Popup contextual
// ==========================
function removeExistingPopup() {
    const existing = document.querySelector(".product-popup");
    if (existing) existing.remove();
    document.removeEventListener("click", handleOutsideClick);
    document.removeEventListener("keydown", handleEsc);
}

function handleOutsideClick(e) {
    const popup = document.querySelector(".product-popup");
    if (popup && !popup.contains(e.target)) removeExistingPopup();
}
function handleEsc(e) {
    if (e.key === "Escape") removeExistingPopup();
}

function escapeHtml(str) {
    return String(str)
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

// ==========================
// 🔹 Modal de edición
// ==========================
async function showEditModal(product) {
    removeEditModal();
    ensurePopupStyles();

    const backdrop = document.createElement("div");
    backdrop.className = "edit-modal-backdrop";

    const modal = document.createElement("div");
    modal.className = "edit-modal";
    modal.innerHTML = `
    <h3>Editar patineta</h3>
    <label>Modelo<input type="text" id="edit-modelo" value="${escapeHtml(product.modelo ?? '')}"></label>
    <label>Número de serie<input type="text" id="edit-numero" value="${escapeHtml(product.numero_serie ?? '')}"></label>
    <label>Fecha de compra<input type="date" id="edit-fecha" value="${escapeHtml(product.fecha_compra ?? '')}"></label>
    <label>Estado
      <select id="edit-estado"><option value="">Cargando estados...</option></select>
    </label>
    <label>Última revisión<input type="date" id="edit-revision" value="${escapeHtml(product.ultima_revision ?? '')}"></label>
    <label>Observaciones<textarea id="edit-observaciones">${escapeHtml(product.observaciones ?? '')}</textarea></label>
    <div class="actions">
      <button class="btn secondary" id="edit-cancel">Cancelar</button>
      <button class="btn primary" id="edit-save">Guardar</button>
    </div>
  `;

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    modal.querySelector("#edit-cancel").addEventListener("click", removeEditModal);

    // Guardar cambios
    modal.querySelector("#edit-save").addEventListener("click", async () => {
        const selectEstado = modal.querySelector("#edit-estado");
        const idestadoValue = selectEstado.options[selectEstado.selectedIndex]?.value ?? "";

        const payload = {
            idpatineta: product.idpatineta,
            modelo: modal.querySelector("#edit-modelo").value.trim(),
            numero_serie: modal.querySelector("#edit-numero").value.trim(),
            fecha_compra: modal.querySelector("#edit-fecha").value.trim(),
            ultima_revision: modal.querySelector("#edit-revision").value.trim(),
            observaciones: modal.querySelector("#edit-observaciones").value.trim(),
            idestado: idestadoValue ? Number(idestadoValue) : null,
        };

        console.log("🟢 updateProduct payload (debug):", payload);


        // Si el usuario eligió algo (value no vacío) enviar ese idestado (como Number)
        if (idestadoValue !== "") {
            // intenta convertir a número; si no es numérico, no se incluirá
            const parsed = Number(idestadoValue);
            if (!Number.isNaN(parsed)) {
                payload.idestado = parsed;
            } else {
                console.warn("Valor del select no es numérico, no se incluirá en payload:", idestadoValue);
            }
        } else {
            // Si no eligió nada y quieres conservar el actual, puedes enviar product.idestado explícitamente:
            if (product.idestado != null && product.idestado !== "") {
                payload.idestado = Number(product.idestado);
            }
        }

        console.log("🟢 updateProduct payload:", payload);
        console.log("Valor actual del <select>:", selectEstado.value);
        try {
            const res = await fetch("/api/updateProduct", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const text = await res.text();
                console.error("updateProduct error body:", text);
                try { const json = text ? JSON.parse(text) : {}; alert("Error: " + (json.error || text)); } catch (e) { alert("Error: " + text); }
                throw new Error(text || `HTTP ${res.status}`);
            }

            const result = await res.json();
            console.log("updateProduct success:", result);
            alert("Patineta actualizada correctamente.");
            removeEditModal();
            currentProducts = currentProducts.map(p => p.idpatineta === product.idpatineta ? { ...p, ...payload } : p);
            renderProductList(currentProducts);
        } catch (err) {
            console.error("Error actualizando patineta:", err);
            alert("Error al actualizar la patineta. Revisa consola/servidor.");
        }
    });

    // ====== Rellenar select de estados (cambio: asegurar valores numéricos) ======
    const selectEstado = modal.querySelector("#edit-estado");
    selectEstado.innerHTML = '<option value="">Cargando estados...</option>';

    try {
        if (!currentEstados || currentEstados.length === 0) {
            currentEstados = await fetchEstados();
        }

        // Determinar estado actual (por id o por nombre)
        let currentId =
            product.idestado ??
            product.idEstado ??
            product.id_estado ??
            estadoNameToId.get((product.estado ?? "").toLowerCase()) ??
            null;

        console.log("🟦 Estado actual detectado:", currentId, product);

        selectEstado.innerHTML = '<option value="">-- seleccionar --</option>';
        currentEstados.forEach((e) => {
            const opt = document.createElement("option");
            // asegurar que el value sea string numérico cuando exista id
            const numericId = (e.id !== null && e.id !== undefined && e.id !== "") ? Number(e.id) : "";
            opt.value = numericId === "" ? "" : String(numericId);
            opt.textContent = e.nombre;
            if (numericId !== "" && String(numericId) === String(currentId)) opt.selected = true;
            selectEstado.appendChild(opt);
        });

        selectEstado.disabled = false;
    } catch (err) {
        console.error("Error cargando estados en el modal:", err);
        selectEstado.innerHTML = '<option value="">Error al cargar estados</option>';
        selectEstado.disabled = true;
    }

    backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) removeEditModal();
    });
    document.addEventListener(
        "keydown",
        (e) => {
            if (e.key === "Escape") removeEditModal();
        },
        { once: true }
    );
}

function removeEditModal() {
    const bd = document.querySelector(".edit-modal-backdrop");
    if (bd) bd.remove();
}

// ==========================
// 🔹 Menú contextual (Editar / Eliminar)
// ==========================
function showPopupMenu(product, x, y) {
    removeExistingPopup();
    ensurePopupStyles();

    const menu = document.createElement("div");
    menu.className = "product-popup";
    const width = 200,
        height = 120,
        pad = 8;
    const vw = window.innerWidth,
        vh = window.innerHeight;
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
            handler(product);
            removeExistingPopup();
        });
        return it;
    }

    menu.appendChild(makeItem("Editar patineta", "", (p) => showEditModal(p)));
    menu.appendChild(
        makeItem("Eliminar patineta", "danger", async (p) => {
            if (!confirm(`¿Eliminar patineta "${p.modelo}"?`)) return;
            try {
                const res = await fetch("/api/deleteProduct", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ idpatineta: p.idpatineta }),
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                currentProducts = currentProducts.filter(
                    (pr) => pr.idpatineta !== p.idpatineta
                );
                renderProductList(currentProducts);
                alert("Patineta eliminada correctamente.");
            } catch (err) {
                console.error("Error eliminando patineta:", err);
                alert("Error al eliminar la patineta.");
            }
        })
    );

    document.body.appendChild(menu);
    setTimeout(() => {
        document.addEventListener("click", handleOutsideClick);
        document.addEventListener("keydown", handleEsc);
    }, 0);
}

// ==========================
// 🔹 Render de tabla
// ==========================
function renderProductList(products) {
    const tbody = document.getElementById("inventario-body");
    tbody.innerHTML = "";

    if (!products || products.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7">No hay patinetas registradas</td></tr>`;
        return;
    }

    products.forEach((p) => {
        const estadoId = p.idestado ?? p.id_estado ?? null;
        let estadoName = "";

        if (estadoId != null) {
            estadoName = estadoMap.get(String(estadoId)) ?? String(estadoId);
        } else if (p.estado) {
            estadoName = p.estado;
        } else {
            estadoName = "—";
        }

        const tr = document.createElement("tr");
        tr.classList.add("clickable");
        tr.innerHTML = `
      <td>${p.idpatineta ?? ""}</td>
      <td>${p.modelo ?? ""}</td>
      <td>${p.numero_serie ?? ""}</td>
      <td>${p.fecha_compra ?? ""}</td>
      <td>${escapeHtml(estadoName)}</td>
      <td>${p.ultima_revision ?? ""}</td>
      <td>${p.observaciones ?? ""}</td>
    `;

        tr.addEventListener("click", (ev) => {
            const x = ev.clientX;
            const y = ev.clientY;
            showPopupMenu(p, x, y);
        });

        tbody.appendChild(tr);
    });
}

// ==========================
// 🔹 Inicialización
// ==========================
document.addEventListener("DOMContentLoaded", async () => {
    try {
        currentEstados = await fetchEstados();
        currentProducts = await fetchProducts();
        renderProductList(currentProducts);
    } catch (err) {
        console.error("Error al cargar las patinetas:", err);
    }
});
