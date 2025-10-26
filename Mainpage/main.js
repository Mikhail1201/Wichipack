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
// ========== DROPDOWN MENU FUNCTIONALITY ==========
document.addEventListener('DOMContentLoaded', function() {
  // Get all dropdown buttons
  const dropdownButtons = document.querySelectorAll('.dropdown-btn');
  
  // Toggle dropdown on button click
  dropdownButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.stopPropagation();
      
      const dropdown = this.closest('.dropdown');
      const dropdownContent = dropdown.querySelector('.dropdown-content');
      
      // Close all other dropdowns
      document.querySelectorAll('.dropdown-content').forEach(content => {
        if (content !== dropdownContent) {
          content.classList.remove('show');
        }
      });
      
      // Toggle current dropdown
      dropdownContent.classList.toggle('show');
    });
  });
  
  // Close dropdown when clicking outside
  document.addEventListener('click', function(e) {
    // Check if click is outside any dropdown
    const isClickInside = e.target.closest('.dropdown');
    if (!isClickInside) {
      document.querySelectorAll('.dropdown-content').forEach(content => {
        content.classList.remove('show');
      });
    }
  });
  
  // Keep dropdowns open when clicking inside, but allow link clicks to work normally
  document.querySelectorAll('.dropdown-content').forEach(content => {
    content.addEventListener('click', function(e) {
      // Only stop propagation if not clicking on a link
      if (!e.target.closest('a')) {
        e.stopPropagation();
      }
    });
  });
});