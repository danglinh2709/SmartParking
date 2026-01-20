// thanh cuộn ẩn hiện
let lastScroll = window.scrollY;
const navbar = document.getElementById("navbar");

window.addEventListener("scroll", () => {
  const currentScroll = window.scrollY;

  if (currentScroll > lastScroll && currentScroll > 50) {
    navbar.classList.add("hide-navbar");
  } else {
    navbar.classList.remove("hide-navbar");
  }
  lastScroll = currentScroll;
});

// hiệu ứng cuộn trang
window.addEventListener("scroll", function () {
  document
    .querySelectorAll(
      ".footer-column, .skew-animate, .anh, .gioithieu, .a, .slide-in-left, .slide-in-right, .slide-in-up"
    )
    .forEach(function (item) {
      if (item.getBoundingClientRect().top < window.innerHeight) {
        //kiểm tra xem phần tử có đang hiển thị trong cửa sổ trình duyệt hay không
        item.classList.add("active");
      }
    });
});

// function (item) là hàm callback, đc truyền vào forEach để thực thiện với từng phần tử trong mảng
// item.getBoundingClientRect().top: đo kc từ đỉnh cửa sổ trình duyệt đến đỉnh phần tử
// window.innerHeight: đo chiều cao của cửa số trình duyệt
