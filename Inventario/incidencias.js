// Variables globales
let incidenciasTable;
let historialTable;
let currentPatineta;

document.addEventListener('DOMContentLoaded', async function() {
    // Inicializar elementos
    incidenciasTable = document.getElementById('incidenciasTable').getElementsByTagName('tbody')[0];
    historialTable = document.getElementById('historialTable').getElementsByTagName('tbody')[0];
    
    // Cargar datos iniciales
    await Promise.all([
        cargarPatinetas(),
        cargarEstados(),
        cargarIncidencias()
    ]);

    // Event listeners para formularios
    document.getElementById('incidenciaForm').addEventListener('submit', handleNuevaIncidencia);
    document.getElementById('editIncidenciaForm').addEventListener('submit', handleEditarIncidencia);
});

async function cargarPatinetas() {
    try {
        const response = await fetch('/api/handleProduct', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Error al cargar patinetas');
        }

        const patinetas = await response.json();
        const selectPatineta = document.getElementById('patineta');
        selectPatineta.innerHTML = '<option value="">Seleccione una patineta</option>';
        
        patinetas.forEach(patineta => {
            selectPatineta.innerHTML += `
                <option value="${patineta.idpatineta}">
                    ${patineta.modelo} - ${patineta.numero_serie}
                </option>
            `;
        });
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar las patinetas');
    }
}

async function cargarEstados() {
    try {
        const response = await fetch('/api/getEstados', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Error al cargar estados');
        }

        const estados = await response.json();
        const selectEstados = document.querySelectorAll('#estado, #editEstado');
        
        selectEstados.forEach(select => {
            select.innerHTML = '<option value="">Seleccione un estado</option>';
            estados.forEach(estado => {
                select.innerHTML += `
                    <option value="${estado.idestados}">${estado.nombre}</option>
                `;
            });
        });
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar los estados');
    }
}

async function cargarIncidencias() {
    try {
        const response = await fetch('/api/handleIncidence', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Error al cargar incidencias');
        }

        const incidencias = await response.json();
        displayIncidencias(incidencias);
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar las incidencias');
    }
}

function displayIncidencias(incidencias) {
    incidenciasTable.innerHTML = '';
    incidencias.forEach(incidencia => {
        const row = incidenciasTable.insertRow();
        
        // Formatear fechas
        const fechaReporte = new Date(incidencia.fecha_reporte).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        const fechaResolucion = incidencia.fecha_resolucion ? 
            new Date(incidencia.fecha_resolucion).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }) : 'Pendiente';

        // Formatear costo
        const costoFormateado = new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'USD'
        }).format(incidencia.costo_reparacion);

        // Clases para prioridad
        const prioridadClass = {
            'baja': 'badge-info',
            'media': 'badge-warning',
            'alta': 'badge-error',
            'urgente': 'badge-error shake'
        }[incidencia.prioridad];

        row.innerHTML = `
            <td>${incidencia.idincidencia}</td>
            <td>${incidencia.patineta_modelo} - ${incidencia.patineta_serie}</td>
            <td>${incidencia.tipo}</td>
            <td><span class="badge ${prioridadClass}">${incidencia.prioridad}</span></td>
            <td>${incidencia.estado_nombre}</td>
            <td>${fechaReporte}</td>
            <td>${fechaResolucion}</td>
            <td>${costoFormateado}</td>
            <td>
                <button onclick="mostrarDetalles(${incidencia.idincidencia})" class="btn-edit">
                    Ver Detalles
                </button>
            </td>
        `;
    });

    // Mensaje si no hay incidencias
    if (incidencias.length === 0) {
        const row = incidenciasTable.insertRow();
        row.innerHTML = `
            <td colspan="9" class="text-center">
                <p class="empty-message">No hay incidencias registradas</p>
            </td>
        `;
    }
}

async function handleNuevaIncidencia(event) {
    event.preventDefault();
    
    const formData = {
        idpatineta: document.getElementById('patineta').value,
        tipo: document.getElementById('tipo').value,
        prioridad: document.getElementById('prioridad').value,
        idestado: document.getElementById('estado').value,
        descripcion: document.getElementById('descripcion').value,
        costo_reparacion: document.getElementById('costo').value,
        idusuario: JSON.parse(localStorage.getItem('user')).idusuario
    };

    try {
        const response = await fetch('/api/handleIncidence', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            throw new Error('Error al crear la incidencia');
        }

        alert('Incidencia registrada exitosamente');
        event.target.reset();
        await cargarIncidencias();
    } catch (error) {
        console.error('Error:', error);
        alert('Error al registrar la incidencia');
    }
}

async function mostrarDetalles(id) {
    try {
        const response = await fetch(`/api/handleIncidence/${id}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Error al cargar los detalles');
        }

        const incidencia = await response.json();
        
        // Llenar el formulario de edición
        document.getElementById('editId').value = incidencia.idincidencia;
        document.getElementById('modalPatineta').textContent = 
            `${incidencia.patineta_modelo} - ${incidencia.patineta_serie}`;
        document.getElementById('editTipo').value = incidencia.tipo;
        document.getElementById('editPrioridad').value = incidencia.prioridad;
        document.getElementById('editEstado').value = incidencia.idestado;
        document.getElementById('editCosto').value = incidencia.costo_reparacion;
        document.getElementById('editDescripcion').value = incidencia.descripcion;
        document.getElementById('editFechaResolucion').value = 
            incidencia.fecha_resolucion?.split('T')[0] || '';

        // Cargar historial
        await cargarHistorial(incidencia.idpatineta);
        
        // Mostrar modal
        document.getElementById('incidenciaModal').classList.add('activo');
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar los detalles de la incidencia');
    }
}

async function cargarHistorial(idpatineta) {
    try {
        const response = await fetch(`/api/handleIncidence/historial/${idpatineta}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Error al cargar el historial');
        }

        const historial = await response.json();
        displayHistorial(historial);
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar el historial');
    }
}

function displayHistorial(historial) {
    historialTable.innerHTML = '';
    historial.forEach(registro => {
        const row = historialTable.insertRow();
        
        const fecha = new Date(registro.fecha_cambio).toLocaleString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        row.innerHTML = `
            <td>${fecha}</td>
            <td>${registro.estado_nombre}</td>
            <td>${registro.usuario_nombre}</td>
            <td>${registro.observaciones || '-'}</td>
        `;
    });

    if (historial.length === 0) {
        const row = historialTable.insertRow();
        row.innerHTML = `
            <td colspan="4" class="text-center">
                <p class="empty-message">No hay registros en el historial</p>
            </td>
        `;
    }
}

async function handleEditarIncidencia(event) {
    event.preventDefault();
    
    const id = document.getElementById('editId').value;
    const formData = {
        tipo: document.getElementById('editTipo').value,
        prioridad: document.getElementById('editPrioridad').value,
        idestado: document.getElementById('editEstado').value,
        descripcion: document.getElementById('editDescripcion').value,
        costo_reparacion: document.getElementById('editCosto').value,
        fecha_resolucion: document.getElementById('editFechaResolucion').value || null,
        observaciones: document.getElementById('observaciones').value,
        idusuario: JSON.parse(localStorage.getItem('user')).idusuario
    };

    try {
        const response = await fetch(`/api/handleIncidence/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            throw new Error('Error al actualizar la incidencia');
        }

        alert('Incidencia actualizada exitosamente');
        closeModal('incidenciaModal');
        await cargarIncidencias();
    } catch (error) {
        console.error('Error:', error);
        alert('Error al actualizar la incidencia');
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('activo');
}