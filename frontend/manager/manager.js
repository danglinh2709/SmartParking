function logout() {
  localStorage.clear();
  location.href = "../trangchu/index.html";
}
document.addEventListener("DOMContentLoaded", () => {
  const links = document.querySelectorAll(".sidebar a");
  const currentPage = location.pathname.split("/").pop();

  links.forEach((link) => {
    const href = link.getAttribute("href");
    if (href === currentPage) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
});
