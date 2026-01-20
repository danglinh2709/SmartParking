//
const heading = document.getElementById("heading");
const hero = document.getElementById("hero");
window.addEventListener("scroll", () => {
  const heroBottom = hero.getBoundingClientRect().bottom;
  if (heroBottom <= 30) {
    heading.style.opacity = "0"; // ẩn dần chữ khi vượt qua vùng hero
  } else {
    heading.style.opacity = "1"; // hiện lại khi quay lên
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("active");
          obs.unobserve(entry.target); // chỉ chạy một lần
        }
      });
    },
    { threshold: 0.1 }
  );

  document.querySelectorAll(".scroll-hidden,.text ").forEach((el) => {
    observer.observe(el);
  });
});
