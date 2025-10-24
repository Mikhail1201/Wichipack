const ROLE_MAP = {
    1: "Administrador",
    2: "Mantenimiento",
    3: "Recepcionista"
  };

  async function fetchUsers() {
    try {
      const response = await fetch('/api/getUsers');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const result = await response.json();
      // Aseguramos devolver siempre un array
      return Array.isArray(result.usuarios) ? result.usuarios : [];
    } catch (err) {
      console.error('Error al obtener usuarios:', err);
      throw err;
    }
  }

  function renderUserList(users) {
    const messageDiv = document.getElementById('user-list-message');
    const container = document.getElementById('user-list-container');

    // Limpiar estado previo
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

    // Cabecera (cambiado "Rol ID" => "Rol")
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

    // Cuerpo
    const tbody = document.createElement('tbody');
    users.forEach(user => {
      const tr = document.createElement('tr');

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
      // Preferimos la propiedad "rol", si no existe usamos "idrol"
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

      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.appendChild(table);
  }

  // Cargar y mostrar usuarios al cargar la página
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      const users = await fetchUsers();
      renderUserList(users);
    } catch (err) {
      const messageDiv = document.getElementById('user-list-message');
      messageDiv.textContent = 'Error al cargar la lista de usuarios. Revisa la consola.';
      messageDiv.style.color = 'red';
    }
  });