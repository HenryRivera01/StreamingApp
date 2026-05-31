function initSidebarLayout() {
  const sidebar = document.querySelector(".sidebar");
  const navbar = document.querySelector(".navbar");
  if (!sidebar || !navbar) {
    return;
  }

  document.body.classList.add("has-sidebar-layout");

  if (!document.getElementById("sidebarBackdrop")) {
    const backdrop = document.createElement("div");
    backdrop.id = "sidebarBackdrop";
    backdrop.className = "sidebar-backdrop";
    backdrop.addEventListener("click", () => {
      document.body.classList.remove("sidebar-open");
    });
    document.body.appendChild(backdrop);
  }

  if (!document.getElementById("sidebarToggle")) {
    const toggle = document.createElement("button");
    toggle.id = "sidebarToggle";
    toggle.type = "button";
    toggle.className = "sidebar-toggle";
    toggle.setAttribute("aria-label", "Abrir menú");
    toggle.innerHTML = "<span></span><span></span><span></span>";
    toggle.addEventListener("click", () => {
      document.body.classList.toggle("sidebar-open");
    });
    navbar.insertBefore(toggle, navbar.firstChild);
  }

  const navLinks = sidebar.querySelectorAll("a");
  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      document.body.classList.remove("sidebar-open");
    });
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 768) {
      document.body.classList.remove("sidebar-open");
    }
  });
}

window.addEventListener("DOMContentLoaded", initSidebarLayout);
