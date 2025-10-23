// ========== USUARIOS Y AUTENTICACIÓN ==========

const usuarios = [
  { username: 'admin@wichipack.com', password: '1234', rol: 'admin' },
  { username: 'recepcionista@wichipack.com', password: '1234', rol: 'recepcionista' },
  { username: 'mantenimiento@wichipack.com', password: '1234', rol: 'mantenimiento' }
];

// Función de login
function login(event) {
  if (event && event.preventDefault) {
    event.preventDefault();
  }

  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  
  if (!usernameInput || !passwordInput) {
    console.error("❌ Elementos de login no encontrados");
    alert("❌ Error: Formulario de login no encontrado");
    return false;
  }

  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  if (!username || !password) {
    alert("⚠️ Por favor completa todos los campos");
    return false;
  }

  const user = usuarios.find(u => u.username === username && u.password === password);

  if (user) {
    console.log("✅ Usuario encontrado:", user.rol);
    
    try {
      localStorage.setItem("usuarioActual", JSON.stringify(user));
      alert(`✅ Bienvenido ${user.rol.toUpperCase()}`);
      
      switch (user.rol) {
        case "admin":
          window.location.href = "/mainpage/admin.html";
          break;
        case "recepcionista":
          window.location.href = "/mainpage/recepcionista.html";
          break;
        case "mantenimiento":
          window.location.href = "/mainpage/mantenimiento.html";
          break;
        default:
          alert("❌ Rol de usuario no válido");
      }
    } catch (error) {
      console.error("Error al guardar sesión:", error);
      alert("❌ Error: localStorage no disponible. Usa un servidor local.");
    }
  } else {
    alert("❌ Usuario o contraseña incorrectos");
    console.log("Intento de login con:", username);
  }
  
  return false;
}

// Cerrar sesión
function logout() {
  if (confirm("¿Deseas cerrar sesión?")) {
    try {
      localStorage.removeItem("usuarioActual");
      alert("✅ Sesión cerrada");
      window.location.href = "/Login/index.html";
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      window.location.href = "/Login/index.html";
    }
  }
}

// Verificar sesión activa
function verificarSesion() {
  try {
    const usuarioActual = localStorage.getItem("usuarioActual");
    if (usuarioActual) {
      const user = JSON.parse(usuarioActual);
      console.log("Sesión activa:", user.username);
      return user;
    }
  } catch (error) {
    console.error("Error al verificar sesión:", error);
  }
  return null;
}

// Inicializar login
function initLogin() {
  const loginForm = document.getElementById("loginForm") || 
                    document.getElementById("login-form") || 
                    document.getElementById("form-login");
  
  if (loginForm) {
    console.log("✅ Formulario de login encontrado");
    loginForm.addEventListener("submit", login);
  } else {
    console.warn("⚠️ Formulario de login NO encontrado");
  }
  
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  
  if (usernameInput && passwordInput) {
    console.log("✅ Campos de login encontrados");
  } else {
    console.warn("⚠️ Campos de login NO encontrados");
  }
}
