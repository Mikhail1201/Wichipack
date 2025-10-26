// Variables globales
let ratesTable;

document.addEventListener('DOMContentLoaded', function() {
    // Inicializar elementos
    ratesTable = document.getElementById('ratesTable').getElementsByTagName('tbody')[0];
    const addRateForm = document.getElementById('addRateForm');

    // Cargar tarifas existentes
    loadRates();

    // Configurar el formulario de agregar tarifa
    addRateForm.addEventListener('submit', handleAddRate);

    // Establecer fecha mínima como hoy
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('fechaInicio').min = today;
});

async function loadRates() {
    try {
        const response = await fetch('/api/handleFee', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Error al cargar las tarifas');
        }

        const rates = await response.json();
        displayRates(rates);
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar las tarifas');
    }
}

function displayRates(rates) {
    ratesTable.innerHTML = '';
    rates.forEach(rate => {
        const row = ratesTable.insertRow();
        
        // Formatear el valor como porcentaje
        const valorFormateado = rate.tipo === 'Descuento' || rate.tipo === 'Mes'
            ? `${(rate.valor * 100).toFixed(2)}%`
            : `$${rate.valor.toFixed(2)}`;

        // Formatear las fechas
        const fechaInicio = new Date(rate.fecha_inicio).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Capitalizar el tipo de tarifa
        const tipoFormateado = rate.tipo.charAt(0).toUpperCase() + rate.tipo.slice(1);

        row.innerHTML = `
            <td style="font-weight: 600; color:#333;">${rate.idtarifa}</td>
            <td style="color:#333;">${rate.nombre}</td>
            <td style="color:#333;">${tipoFormateado}</td>
            <td style="font-weight: 600;color:#333;">${valorFormateado}</td>
            <td style="color:#333;">${fechaInicio}</td>
            <td>
                <span class="badge ${rate.activa ? 'badge-success' : 'badge-warning'}">
                    ${rate.activa ? 'Activa' : 'Suspendida'}
                </span>
            </td>
            <td>
                <button onclick="toggleRateStatus(${rate.idtarifa}, ${!rate.activa})" 
                        class="btn-status ${rate.activa ? 'inactive' : 'active'}">
                    ${rate.activa ? 'Suspender' : 'Activar'}
                </button>
            </td>
        `;
    });

    // Si no hay tarifas, mostrar mensaje
    if (rates.length === 0) {
        const row = ratesTable.insertRow();
        row.innerHTML = `
            <td colspan="8" style="text-align: center; padding: 2rem;">
                <p style="color: var(--accent); font-size: 1.1rem;">No hay tarifas registradas</p>
            </td>
        `;
    }
}

async function handleAddRate(event) {
    event.preventDefault();
    
    const valInput = document.getElementById('valor').value;
    if (valInput < 1 && valInput > 0) {
        var val = parseFloat(valInput);
    } else if (valInput >= 1 && valInput <= 100) {
        var val = parseFloat(valInput) / 100;
    }

    const formData = {
        nombre: document.getElementById('nombre').value,
        tipo: document.getElementById('tipo').value,
        valor: val,
        fecha_inicio: document.getElementById('fechaInicio').value,
        activa: true
    };

    try {
        const response = await fetch('/api/handleFee', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            throw new Error('Error al agregar la tarifa');
        }

        alert('Tarifa agregada exitosamente');
        event.target.reset();
        loadRates();
    } catch (error) {
        console.error('Error:', error);
        alert('Error al agregar la tarifa');
    }
}

async function toggleRateStatus(idtarifa, newStatus) {
    try {
        const response = await fetch('/api/handleFee', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                idtarifa,
                activa: newStatus
            })
        });

        if (!response.ok) {
            throw new Error('Error al actualizar el estado de la tarifa');
        }

        alert(`Tarifa ${newStatus ? 'activada' : 'suspendida'} exitosamente`);
        loadRates();
    } catch (error) {
        console.error('Error:', error);
        alert('Error al actualizar el estado de la tarifa');
    }
}

async function logout() {
    try {
        const response = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: "logout" })
        });
        const result = await response.json();

        if (response.ok) {
            alert("Sesión cerrada correctamente");
            window.location.href = "/Login/index.html";
            localStorage.removeItem("token");
        } else {
            alert(result.error || "Error al cerrar sesión");
        }
    } catch (err) {
        console.error("Error al cerrar sesión:", err);
        alert("Error inesperado al cerrar sesión.");
    }
}