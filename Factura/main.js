// =====================================================
// 📁 main.js - Administración de Facturas
// =====================================================
const API_FACTURAS = "/api/handleBill";
const API_ESTADOS = "/api/getEstados";
const API_CLIENTES = "/api/getClientes"; // 🧩 Nuevo: Endpoint para traer clientes
const API_TARIFAS = "/api/handleFee";


let currentFacturas = [];
let estadosGlobal = [];
let clientesGlobal = [];
let tarifasGlobal = [];

// 🚀 Cargar tarifas activas (día y mes)
async function fetchTarifas() {
    try {
        const res = await fetch("/api/handleFee.js", { method: "GET" });
        if (!res.ok) throw new Error("Error al obtener tarifas");

        const tarifas = await res.json();

        // Filtrar solo las activas
        tarifasGlobal = tarifas.filter((t) => t.activa);
        console.log("✅ Tarifas cargadas:", tarifasGlobal);
    } catch (err) {
        console.error("❌ Error al cargar tarifas:", err);
        tarifasGlobal = [];
    }
}



// =====================================================
// 🔹 Cargar facturas desde Supabase
// =====================================================
async function fetchFacturas() {
    try {
        const res = await fetch(API_FACTURAS);
        if (!res.ok) throw new Error(`Error HTTP ${res.status}`);
        const data = await res.json();
        currentFacturas = Array.isArray(data) ? data : data.data || [];
        renderFacturaList(currentFacturas);
    } catch (err) {
        console.error("❌ Error al cargar facturas:", err);
        alert("Error al cargar facturas. Revisa la consola.");
    }
}

// =====================================================
// 🔹 Cargar estados (solo id > 20)
// =====================================================
async function fetchEstados() {
    try {
        const res = await fetch("/api/getEstados");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        estadosGlobal = data.filter((e) => Number(e.idestados) > 20);
    } catch (err) {
        console.error("Error al obtener estados:", err);
    }
}

// =====================================================
// 🔹 Cargar clientes
// =====================================================
async function fetchClientes() {
    try {
        const res = await fetch("/api/handleClient", { method: "GET" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        clientesGlobal = data;
    } catch (err) {
        console.error("Error al obtener clientes:", err);
    }
}

// =====================================================
// 🔹 Obtener nombre de cliente / estado
// =====================================================
function getClienteNombre(idcliente) {
    const cliente = clientesGlobal.find((c) => c.idcliente == idcliente);
    return cliente ? cliente.nombre || cliente.nombre_cliente : "—";
}

function getEstadoNombre(idestado) {
    const estado = estadosGlobal.find((e) => e.idestados == idestado);
    return estado ? estado.nombre : "—";
}

// =====================================================
// 🔹 Estilos del popup y modal
// =====================================================
function ensurePopupStyles() {
    if (document.getElementById("factura-popup-styles")) return;
    const style = document.createElement("style");
    style.id = "factura-popup-styles";
    style.textContent = `
    .factura-table tr { transition: background .12s; }
    .factura-table tr:hover { background: #f5f5f5; cursor: pointer; }
    .factura-popup {
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
    .factura-popup .item {
      padding: 8px 12px;
      cursor: pointer;
      user-select: none;
    }
    .factura-popup .item:hover { background: #f0f0f0; }
    .factura-popup .item.danger { color: #b00020; }
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
      width: 400px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      font-family: system-ui, sans-serif;
    }
    .edit-modal h3 { margin: 0 0 12px 0; }
    .edit-modal label { display:block; font-size: 13px; margin-top:8px; }
    .edit-modal input, .edit-modal select {
      width:100%; padding:8px; margin-top:4px; box-sizing:border-box;
      border:1px solid #ccc; border-radius:4px;
    }
    .edit-modal .actions { display:flex; gap:8px; justify-content:flex-end; margin-top:16px; }
    .btn { padding:8px 12px; border-radius:4px; cursor:pointer; border: none; }
    .btn.primary { background:#0b5cff; color:#fff; }
    .btn.secondary { background:#eee; }
    .btn.danger { background:#b00020; color:#fff; }
  `;
    document.head.appendChild(style);
}

// =====================================================
// 🔹 Renderizar lista de facturas
// =====================================================
// =====================================================
// 🔹 Renderizar lista de facturas (con columna DesTarifas)
// =====================================================
async function renderFacturaList(facturas) {
    const cont = document.getElementById("lista-facturas-registro");
    cont.innerHTML = "";

    if (!facturas.length) {
        cont.innerHTML = `<p>No hay facturas registradas.</p>`;
        return;
    }

    // ⚙️ Asegurarse de que las tarifas estén cargadas
    if (!window.tarifasGlobal) {
        try {
            const response = await fetch('/api/handleFee', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (!response.ok) throw new Error('Error al cargar las tarifas');
            window.tarifasGlobal = await response.json();
        } catch (error) {
            console.error('❌ Error al obtener tarifas:', error);
            window.tarifasGlobal = [];
        }
    }

    // 🗓️ Obtener fecha actual
    const hoy = new Date();
    const dias = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
    const meses = [
        "Enero","Febrero","Marzo","Abril","Mayo","Junio",
        "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
    ];

    const nombreDia = dias[hoy.getDay()];
    const nombreMes = meses[hoy.getMonth()];

    // 🔍 Buscar tarifas activas coincidentes
    const tarifaDia = window.tarifasGlobal.find(
        t => t.tipo?.toLowerCase() === "descuento" &&
             t.nombre?.toLowerCase() === nombreDia.toLowerCase() &&
             t.activa
    );

    const tarifaMes = window.tarifasGlobal.find(
        t => t.tipo?.toLowerCase() === "mes" &&
             t.nombre?.toLowerCase() === nombreMes.toLowerCase() &&
             t.activa
    );

    // 🧮 Valores de descuento
    const descDia = tarifaDia ? parseFloat(tarifaDia.valor) : 0;
    const descMes = tarifaMes ? parseFloat(tarifaMes.valor) : 0;
    const descuentoTotal = descDia + descMes;

    // 🧾 Crear tabla
    const table = document.createElement("table");
    table.className = "factura-table";
    table.style.width = "100%";
    table.style.borderCollapse = "collapse";

    // Encabezado
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    [
        "N° Factura",
        "Cliente",
        "Subtotal",
        "DesTarifas",
        "IVA",
        "Total",
        "Estado",
        "Fecha"
    ].forEach((h) => {
        const th = document.createElement("th");
        th.textContent = h;
        th.style.padding = "8px";
        th.style.borderBottom = "1px solid #ddd";
        th.style.textAlign = "center";
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    // 🔄 Recorrer las facturas y calcular los totales
    facturas.forEach((factura) => {
        const tr = document.createElement("tr");

        const subtotal = Number(factura.subtotal) || 0;
        const iva = Number(factura.iva) || 0;

        // 💰 Aplicar descuento día + mes
        const subtotalDescuento = subtotal * (1 - descuentoTotal);
        const totalConIva = subtotalDescuento + iva;

        const celdas = [
            factura.numero_factura ?? factura.idfactura,
            getClienteNombre(factura.idcliente),
            `$${subtotal.toFixed(2)}`,
            `$${subtotalDescuento.toFixed(2)} (${(descuentoTotal * 100).toFixed(1)}%)`,
            `$${iva.toFixed(2)}`,
            `$${totalConIva.toFixed(2)}`,
            getEstadoNombre(factura.idestado),
            new Date(factura.fecha).toLocaleString("es-ES")
        ];

        celdas.forEach((valor) => {
            const td = document.createElement("td");
            td.textContent = valor;
            td.style.padding = "8px";
            td.style.textAlign = "center";
            tr.appendChild(td);
        });

        tr.addEventListener("click", (ev) => {
            const x = ev.clientX;
            const y = ev.clientY;
            showPopupMenu(factura, x, y);
        });

        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    cont.appendChild(table);
}



// =====================================================
// 🔹 Popup contextual (Editar / Eliminar)
// =====================================================
function showPopupMenu(factura, x, y) {
    removeExistingPopup();
    ensurePopupStyles();

    const menu = document.createElement("div");
    menu.className = "factura-popup";

    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const width = 200;
    const height = 100;
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
            onClick(factura);
            removeExistingPopup();
        });
        return item;
    }

    menu.appendChild(makeItem("Editar factura", "", (f) => showEditModal(f)));
    menu.appendChild(makeItem("Imprimir factura", "", (f) => imprimirFactura(f)));
    menu.appendChild(makeItem("Eliminar factura", "danger", (f) => eliminarFactura(f)));


    document.body.appendChild(menu);
    setTimeout(() => {
        document.addEventListener("click", handleOutsideClick);
        document.addEventListener("keydown", handleEsc);
    }, 0);
}

function removeExistingPopup() {
    const existing = document.querySelector(".factura-popup");
    if (existing) existing.remove();
    document.removeEventListener("click", handleOutsideClick);
    document.removeEventListener("keydown", handleEsc);
}
function handleOutsideClick(e) {
    const popup = document.querySelector(".factura-popup");
    if (!popup) return;
    if (!popup.contains(e.target)) removeExistingPopup();
}
function handleEsc(e) {
    if (e.key === "Escape") removeExistingPopup();
}

// =====================================================
// 🖨️ Imprimir factura (Generar PDF con detalles)
// =====================================================
async function imprimirFactura(factura) {
    try {
        // 1️⃣ Obtener la factura con detalles desde el backend
        const res = await fetch(`${API_FACTURAS}?idfactura=${factura.idfactura}&includeDetails=true`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        // 2️⃣ Datos base
        const { numero_factura, fecha, subtotal, iva, total, idcliente, idestado, detalles } = data;
        const nombreCliente = getClienteNombre(idcliente);
        const nombreEstado = getEstadoNombre(idestado);

        // 3️⃣ Aplicar la misma lógica que renderFacturaList() para tarifas
        const hoy = new Date();
        const dias = [
            "Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"
        ];
        const meses = [
            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ];

        const nombreDia = dias[hoy.getDay()];
        const nombreMes = meses[hoy.getMonth()];

        const tarifaDia = tarifasGlobal?.find(
            (t) =>
                t.tipo?.toLowerCase() === "descuento" &&
                t.nombre?.toLowerCase() === nombreDia.toLowerCase() &&
                (!t.fecha_inicio || new Date(t.fecha_inicio) <= hoy) &&
                (!t.fecha_fin || new Date(t.fecha_fin) >= hoy) &&
                t.activa
        );

        const tarifaMes = tarifasGlobal?.find(
            (t) =>
                t.tipo?.toLowerCase() === "mes" &&
                t.nombre?.toLowerCase() === nombreMes.toLowerCase() &&
                (!t.fecha_inicio || new Date(t.fecha_inicio) <= hoy) &&
                (!t.fecha_fin || new Date(t.fecha_fin) >= hoy) &&
                t.activa
        );

        const descDia = tarifaDia ? parseFloat(tarifaDia.valor) : 0;
        const descMes = tarifaMes ? parseFloat(tarifaMes.valor) : 0;
        const descuentoTotal = descDia + descMes;

        const subtotalDescuento = subtotal * (1 - descuentoTotal);
        const totalConIva = subtotalDescuento + iva;

        // 4️⃣ Crear PDF con jsPDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        let y = 20;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text(`Factura #${numero_factura}`, 105, y, { align: "center" });

        y += 10;
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text(`Fecha: ${new Date(fecha).toLocaleString()}`, 20, y);
        y += 8;
        doc.text(`Cliente: ${nombreCliente}`, 20, y);
        y += 8;
        doc.text(`Estado: ${nombreEstado}`, 20, y);

        // 5️⃣ Encabezado de tabla
        y += 12;
        doc.setFont("helvetica", "bold");
        doc.text("Concepto", 20, y);
        doc.text("Cant.", 100, y);
        doc.text("P. Unit.", 130, y);
        doc.text("Subtotal", 170, y);

        // 6️⃣ Detalles
        y += 6;
        doc.setFont("helvetica", "normal");
        detalles.forEach((d) => {
            if (y > 270) { // Salto de página
                doc.addPage();
                y = 20;
            }
            doc.text(String(d.concepto || ""), 20, y);
            doc.text(String(d.cantidad || "1"), 100, y, { align: "right" });
            doc.text(`$${Number(d.precio_unitario).toFixed(2)}`, 135, y, { align: "right" });
            doc.text(`$${Number(d.subtotal).toFixed(2)}`, 185, y, { align: "right" });
            y += 6;
        });

        // 7️⃣ Totales (idéntico al cálculo de la tabla facturas)
        y += 10;
        doc.setFont("helvetica", "bold");
        doc.text(`Subtotal: $${Number(subtotal).toFixed(2)}`, 150, y, { align: "right" });
        y += 6;
        if (descuentoTotal > 0) {
            doc.text(
                `Descuento tarifa (${(descuentoTotal * 100).toFixed(1)}%): -$${(subtotal * descuentoTotal).toFixed(2)}`,
                150,
                y,
                { align: "right" }
            );
            y += 6;
        }
        doc.text(`Subtotal con descuento: $${subtotalDescuento.toFixed(2)}`, 150, y, { align: "right" });
        y += 6;
        doc.text(`IVA: $${Number(iva).toFixed(2)}`, 150, y, { align: "right" });
        y += 6;
        doc.text(`TOTAL: $${totalConIva.toFixed(2)}`, 150, y, { align: "right" });

        // 8️⃣ Guardar PDF
        const nombreArchivo = `Factura_${numero_factura}.pdf`;
        doc.save(nombreArchivo);
    } catch (err) {
        console.error("❌ Error al imprimir factura:", err);
        alert("Error al generar el PDF de la factura.");
    }
}



// =====================================================
// 🔹 Modal de edición (PUT)
// =====================================================
function showEditModal(factura) {
    removeEditModal();
    ensurePopupStyles();

    const backdrop = document.createElement("div");
    backdrop.className = "edit-modal-backdrop";

    const modal = document.createElement("div");
    modal.className = "edit-modal";
    modal.innerHTML = `
    <h3>Editar factura #${factura.numero_factura ?? factura.idfactura}</h3>
    <label>Cliente
      <select id="edit-idcliente">
        ${clientesGlobal
            .map(
                (c) =>
                    `<option value="${c.idcliente}" ${c.idcliente == factura.idcliente ? "selected" : ""
                    }>${c.nombre || c.nombre_cliente}</option>`
            )
            .join("")}
      </select>
    </label>
    <label>Subtotal
      <input type="number" step="0.01" id="edit-subtotal" value="${factura.subtotal ?? 0}">
    </label>
    <label>IVA
      <input type="number" step="0.01" id="edit-iva" value="${factura.iva ?? 0}">
    </label>
    <label>Total
      <input type="number" step="0.01" id="edit-total" value="${factura.total ?? 0}">
    </label>
    <label>Estado
      <select id="edit-idestado">
        ${estadosGlobal
            .map(
                (e) =>
                    `<option value="${e.idestados}" ${e.idestados == factura.idestado ? "selected" : ""
                    }>${e.nombre}</option>`
            )
            .join("")}
      </select>
    </label>
    <div class="actions">
      <button class="btn secondary" id="edit-cancel">Cancelar</button>
      <button class="btn primary" id="edit-save">Guardar</button>
    </div>
  `;

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    modal.querySelector("#edit-cancel").addEventListener("click", removeEditModal);
    backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) removeEditModal();
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") removeEditModal();
    }, { once: true });

    modal.querySelector("#edit-save").addEventListener("click", async () => {
        const body = {
            idfactura: factura.idfactura,
            idcliente: parseInt(modal.querySelector("#edit-idcliente").value),
            subtotal: parseFloat(modal.querySelector("#edit-subtotal").value) || 0,
            iva: parseFloat(modal.querySelector("#edit-iva").value) || 0,
            total: parseFloat(modal.querySelector("#edit-total").value) || 0,
            idestado: parseInt(modal.querySelector("#edit-idestado").value),
        };

        try {
            const res = await fetch(API_FACTURAS, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            alert("✅ Factura actualizada correctamente");
            removeEditModal();
            await fetchFacturas();
        } catch (err) {
            console.error("Error al actualizar factura:", err);
            alert("Error al actualizar factura.");
        }
    });
}

function removeEditModal() {
    const bd = document.querySelector(".edit-modal-backdrop");
    if (bd) bd.remove();
}

// =====================================================
// 🔹 Eliminar factura
// =====================================================
async function eliminarFactura(factura) {
    if (!confirm(`¿Seguro que deseas eliminar la factura #${factura.numero_factura}?`)) return;
    try {
        const res = await fetch(`${API_FACTURAS}?idfactura=${factura.idfactura}`, { method: "DELETE" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        alert("🗑 Factura eliminada correctamente");
        await fetchFacturas();
    } catch (err) {
        console.error("Error eliminando factura:", err);
        alert("Error al eliminar factura. Revisa la consola.");
    }
}

// =====================================================
// 🔍 Filtrar facturas por estado y búsqueda
// =====================================================
function filtrarFacturasLista() {
    const estadoSeleccionado = document.getElementById("filtro-estado").value.toLowerCase();
    const textoBusqueda = document.getElementById("buscar-factura").value.trim().toLowerCase();

    // Filtramos desde la lista global
    const filtradas = currentFacturas.filter((factura) => {
        // 🧩 Nombre del estado y cliente
        const nombreEstado = getEstadoNombre(factura.idestado).toLowerCase();
        const nombreCliente = getClienteNombre(factura.idcliente).toLowerCase();
        const numeroFactura = (factura.numero_factura || factura.idfactura || "").toString().toLowerCase();

        // 1️⃣ Filtro por estado
        const coincideEstado =
            estadoSeleccionado === "todas" || nombreEstado === estadoSeleccionado;

        // 2️⃣ Filtro por texto (busca en número y nombre del cliente)
        const coincideTexto =
            textoBusqueda === "" ||
            numeroFactura.includes(textoBusqueda) ||
            nombreCliente.includes(textoBusqueda);

        return coincideEstado && coincideTexto;
    });

    // Renderizar el resultado
    renderFacturaList(filtradas);
}


// =====================================================
// 🔹 Inicialización
// =====================================================
document.addEventListener("DOMContentLoaded", async () => {
    await fetchEstados();
    await fetchClientes(); // 🧩 Cargamos clientes antes de las facturas
    await fetchFacturas();
    await fetchTarifas();
});
