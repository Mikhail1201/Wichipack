// 📁 public/js/crearFactura.js
const API_BASE = "/api"; // ajusta según tu estructura real

const clienteSelect = document.getElementById("cliente-select");
const fechaFactura = document.getElementById("fecha-factura");
const productosLista = document.getElementById("productos-lista");

const subtotalEl = document.getElementById("subtotal");
const ivaEl = document.getElementById("iva");
const totalEl = document.getElementById("total");

const btnGuardar = document.querySelector(".btn-guardar");
const btnCancelar = document.querySelector(".btn-cancelar");

// ========== 1️⃣ Cargar clientes ==========
async function cargarClientes() {
    try {
        const res = await fetch(`${API_BASE}/handleClient`);
        const clientes = await res.json();
        clientes.forEach((c) => {
            const opt = document.createElement("option");
            opt.value = c.idcliente;
            opt.textContent = `${c.nombre} ${c.apellido ?? ""}`;
            clienteSelect.appendChild(opt);
        });
    } catch (err) {
        console.error("Error cargando clientes:", err);
    }
}

// ========== 2️⃣ Agregar producto dinámicamente ==========
let productoIndex = 0;
function agregarProducto() {
    productoIndex++;

    const div = document.createElement("div");
    div.classList.add("producto-item");
    div.innerHTML = `
    <div class="producto-header">
      <label>Producto #${productoIndex}</label>
      <button type="button" class="btn-eliminar" onclick="this.parentNode.parentNode.remove(); recalcularTotales()">🗑</button>
    </div>
    <div class="form-group">
      <label>Producto</label>
      <select class="producto-select">
        <option value="">Seleccionar producto...</option>
      </select>
    </div>
    <div class="form-group">
      <label>Cantidad</label>
      <input type="number" class="cantidad" min="1" value="1">
    </div>
    <div class="form-group">
      <label>Precio (desde alquiler)</label>
      <input type="text" class="precio-alquiler" value="—" readonly>
    </div>
  `;

    productosLista.appendChild(div);

    const productoSelect = div.querySelector(".producto-select");
    const precioInput = div.querySelector(".precio-alquiler");
    const cantidadInput = div.querySelector(".cantidad");

    // 🔹 Asegurar que cargue los productos
    cargarProductos(productoSelect);

    // 🟡 Cuando se seleccione un producto, buscar su alquiler correspondiente
    productoSelect.addEventListener("change", async (e) => {
        if (!precioInput) return; // 🧩 Seguridad extra

        const idProducto = parseInt(e.target.value);
        const idCliente = parseInt(document.getElementById("cliente-select").value);

        if (!idProducto || !idCliente) {
            precioInput.value = "Selecciona cliente y producto";
            return;
        }

        const hoy = new Date().toISOString().split("T")[0];

        try {
            const res = await fetch(`/api/handleRent`);
            if (!res.ok) throw new Error("Error al obtener alquileres");
            const alquileres = await res.json();

            // Buscar alquiler del cliente y producto actual con fecha de hoy
            const alquiler = alquileres.find(a =>
                a.idcliente === idCliente &&
                a.idpatineta === idProducto &&
                a.fecha_hora_inicio?.startsWith(hoy)
            );

            if (alquiler && alquiler.precio) {
                precioInput.value = `$${parseFloat(alquiler.precio).toFixed(2)}`;
                precioInput.dataset.precio = alquiler.precio;
            } else {
                precioInput.value = "No hay alquiler hoy";
                delete precioInput.dataset.precio;
            }

            recalcularTotales();
        } catch (err) {
            console.error("Error obteniendo alquiler:", err);
            if (precioInput) precioInput.value = "Error al cargar";
        }
    });

    // 🟢 Actualizar totales al cambiar cantidad
    cantidadInput.addEventListener("input", recalcularTotales);
}


// ========== 3️⃣ Cargar productos ==========
async function cargarProductos(selectEl) {
    try {
        const res = await fetch(`${API_BASE}/handleProduct`);
        const productos = await res.json();
        productos.forEach((p) => {
            const opt = document.createElement("option");
            opt.value = p.idproducto ?? p.idpatineta;
            opt.textContent = `${p.modelo}`;
            selectEl.appendChild(opt);
        });

        // Evento cuando se selecciona un producto
        selectEl.addEventListener("change", async (e) => {
            const idCliente = clienteSelect.value;
            const idProducto = e.target.value;

            if (!idCliente || !idProducto) return;

            const productoDiv = e.target.closest(".producto-item");
            const precioInput = productoDiv.querySelector(".precio-alquiler");
            const precioFinal = await obtenerPrecioAlquiler(idCliente, idProducto);

            precioInput.value = precioFinal.toFixed(2);
            recalcularTotales();
        });
    } catch (err) {
        console.error("Error cargando productos:", err);
    }
}

// ========== 4️⃣ Obtener precio de alquiler según cliente y producto ==========
async function obtenerPrecioAlquiler(idCliente, idProducto) {
    try {
        const hoy = new Date().toISOString().split("T")[0];

        // 🔹 Se trae todos los alquileres (o podrías mejorar tu endpoint para filtrar)
        const res = await fetch("/api/handleRent");
        if (!res.ok) throw new Error("Error al obtener alquileres");

        const alquileres = await res.json();

        // 🔹 Filtramos el alquiler correcto (cliente + producto + fecha)
        const alquiler = alquileres.find(a =>
            Number(a.idcliente) === Number(idCliente) &&
            Number(a.idpatineta) === Number(idProducto) &&  // 👈 fuerza uso de idpatineta
            a.fecha_hora_inicio?.slice(0, 10) === hoy       // 👈 más seguro que startsWith
        );
        
        console.log(alquiler);
        console.log("🔹 idCliente:", idCliente, "🔹 idProducto:", idProducto, "🔹 hoy:", hoy);

        if (alquiler && alquiler.precio) {
            return parseFloat(alquiler.precio);
        } else {
            console.warn("⚠️ No se encontró alquiler para el cliente/producto/fecha actual");
            return 0;
        }

    } catch (err) {
        console.error("Error obteniendo alquiler:", err);
        return 0;
    }
}

// ========== 5️⃣ Aplicar tarifas de día y mes ==========
async function aplicarTarifas(precioBase) {
    try {
        const hoy = new Date();
        const diaSemana = hoy.toLocaleString("es-ES", { weekday: "long" }).toLowerCase();
        const mes = hoy.toLocaleString("es-ES", { month: "long" }).toLowerCase();

        const res = await fetch(`${API_BASE}/handleFee`);
        const tarifas = await res.json();

        // Buscar tarifa por día y mes
        const tarifaDia = tarifas.find((t) => t.nombre.toLowerCase() === diaSemana);
        const tarifaMes = tarifas.find((t) => t.nombre.toLowerCase() === mes);

        let precioFinal = precioBase;
        if (tarifaDia) precioFinal *= 1 - tarifaDia.valor / 100;
        if (tarifaMes) precioFinal *= 1 - tarifaMes.valor / 100;

        return precioFinal;
    } catch (err) {
        console.error("Error aplicando tarifas:", err);
        return precioBase;
    }
}

// ========== 6️⃣ Recalcular totales ==========
function recalcularTotales() {
    const items = productosLista.querySelectorAll(".producto-item");
    let subtotal = 0;

    items.forEach((item) => {
        const cantidad = Number(item.querySelector(".cantidad").value || 0);
        const precio = Number(item.querySelector(".precio-alquiler").value || 0);
        subtotal += cantidad * precio;
    });

    const iva = subtotal * 0.19;
    const total = subtotal + iva;

    subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
    ivaEl.textContent = `$${iva.toFixed(2)}`;
    totalEl.textContent = `$${total.toFixed(2)}`;
}

// ========== 7️⃣ Guardar factura ==========
btnGuardar.addEventListener("click", async () => {
    const idcliente = clienteSelect.value;
    if (!idcliente) return alert("Selecciona un cliente.");

    const items = productosLista.querySelectorAll(".producto-item");
    if (!items.length) return alert("Agrega al menos un producto.");

    const detalles = [];
    items.forEach((item) => {
        const productoSelect = item.querySelector(".producto-select");
        const cantidad = Number(item.querySelector(".cantidad").value || 0);
        const precio = Number(item.querySelector(".precio-alquiler").value || 0);

        if (productoSelect.value && cantidad > 0) {
            detalles.push({
                concepto: productoSelect.options[productoSelect.selectedIndex].text,
                cantidad,
                precio_unitario: precio,
                subtotal: cantidad * precio,
            });
        }
    });

    const subtotal = detalles.reduce((acc, d) => acc + d.subtotal, 0);
    const iva = subtotal * 0.19;
    const total = subtotal + iva;

    try {
        const body = {
            subtotal,
            iva,
            total,
            idestado: 22, // Por ejemplo: “Pendiente”
            idcliente,
            detalles,
        };

        const res = await fetch(`${API_BASE}/handleBill`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        const data = await res.json();

        if (res.ok) {
            alert("Factura creada correctamente");
            console.log("Factura creada:", data);
            window.location.href = "/Mainpage/admin.html";
        } else {
            alert("Error al crear factura: " + data.error);
        }
    } catch (err) {
        console.error("Error al guardar factura:", err);
    }
});

// ========== 8️⃣ Cancelar ==========
btnCancelar.addEventListener("click", () => {
    if (confirm("¿Deseas cancelar la creación de la factura?")) {
        window.location.reload();
    }
});

// Inicializar
document.addEventListener("DOMContentLoaded", () => {
    cargarClientes();
});
