async function logout() {
      try {
        const response = await fetch('/api/auth', 
          { method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: "logout"})
           }
        );
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