const navbar = document.getElementById("navbar" );
const burger = document.getElementById("burger");
const navLinks = document.getElementById("navLinks");

const menuGrid = document.getElementById("menuGrid");
const menuSearch = document.getElementById("menuSearch");
const categoryFilters = document.getElementById("categoryFilters");
const menuCount = document.getElementById("menuCount");
const emptyMenu = document.getElementById("emptyMenu");

const cartButton = document.getElementById("cartButton");
const cartCount = document.getElementById("cartCount");
const cartPanel = document.getElementById("cartPanel");
const cartBackdrop = document.getElementById("cartBackdrop");
const closeCart = document.getElementById("closeCart");
const cartItems = document.getElementById("cartItems");
const cartTotal = document.getElementById("cartTotal");
const checkoutButton = document.getElementById("checkoutButton");

const loginLink = document.getElementById("loginLink");
const signupLink = document.getElementById("signupLink");
const toast = document.getElementById("toast");

let allMenuItems = [];
let selectedCategory = "All";
let searchTerm = "";

let cart = [];

try {
  cart = JSON.parse(localStorage.getItem("ember_cart") || "[]");
} catch (error) {
  cart = [];
}

let toastTimer = null;


// ---------- Helpers ----------

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function saveCart() {
  localStorage.setItem("ember_cart", JSON.stringify(cart));
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}


// ---------- Navigation ----------

window.addEventListener("scroll", () => {
  navbar.classList.toggle("scrolled", window.scrollY > 20);
});

burger.addEventListener("click", () => {
  navLinks.classList.toggle("open");
});

navLinks.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    navLinks.classList.remove("open");
  });
});


// ---------- Login and signup ----------

loginLink.addEventListener("click", (event) => {
  event.preventDefault();
  window.location.href = "/#login";
});

signupLink.addEventListener("click", (event) => {
  event.preventDefault();
  window.location.href = "/#register";
});


// ---------- Filter menu items ----------

function getFilteredItems() {
  return allMenuItems.filter((item) => {
    const matchesCategory =
      selectedCategory === "All" ||
      item.category === selectedCategory;

    const searchableText = [
      item.name,
      item.description,
      item.category,
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch = searchableText.includes(
      searchTerm.toLowerCase()
    );

    return matchesCategory && matchesSearch;
  });
}


// ---------- Render menu ----------

function renderMenu() {
  const filteredItems = getFilteredItems();

  menuCount.textContent = `${filteredItems.length} ${
    filteredItems.length === 1 ? "dish" : "dishes"
  }`;

  if (filteredItems.length === 0) {
    menuGrid.innerHTML = "";
    emptyMenu.hidden = false;
    return;
  }

  emptyMenu.hidden = true;

  menuGrid.innerHTML = filteredItems
    .map((item) => {
      const featuredBadge = item.is_featured
        ? '<span class="featured-badge">Chef’s pick</span>'
        : "";

      return `
        <article class="menu-card">
          <div class="menu-card-art">
            ${featuredBadge}
            <span>${escapeHtml(item.emoji)}</span>
          </div>

          <div class="menu-card-content">
            <span class="menu-card-category">
              ${escapeHtml(item.category)}
            </span>

            <h3>${escapeHtml(item.name)}</h3>

            <p class="menu-card-description">
              ${escapeHtml(item.description)}
            </p>

            <div class="menu-card-bottom">
              <span class="menu-card-price">
                $${Number(item.price).toFixed(2)}
              </span>

              <button
                class="add-to-cart"
                type="button"
                data-item-id="${item.id}"
                aria-label="Add ${escapeHtml(item.name)} to cart"
              >
                +
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  menuGrid.querySelectorAll(".add-to-cart").forEach((button) => {
    button.addEventListener("click", () => {
      const itemId = Number(button.dataset.itemId);
      addToCart(itemId);
    });
  });
}


// ---------- Load menu ----------

async function loadMenu() {
  try {
    const response = await fetch("/api/menu");

    if (!response.ok) {
      throw new Error("Menu request failed.");
    }

    allMenuItems = await response.json();

    renderMenu();
  } catch (error) {
    menuGrid.innerHTML = `
      <div class="empty-menu">
        <div class="empty-menu-icon">⚠️</div>
        <h2>Could not load the menu</h2>
        <p class="muted">
          Please refresh the page and try again.
        </p>
      </div>
    `;

    menuCount.textContent = "Menu unavailable";
  }
}


// ---------- Search ----------

menuSearch.addEventListener("input", (event) => {
  searchTerm = event.target.value.trim();
  renderMenu();
});


// ---------- Category filters ----------

categoryFilters.addEventListener("click", (event) => {
  const clickedButton = event.target.closest("[data-category]");

  if (!clickedButton) {
    return;
  }

  selectedCategory = clickedButton.dataset.category;

  categoryFilters
    .querySelectorAll(".filter-btn")
    .forEach((button) => {
      button.classList.remove("active");
    });

  clickedButton.classList.add("active");

  renderMenu();
});


// ---------- Add to cart ----------

function addToCart(itemId) {
  const item = allMenuItems.find(
    (menuItem) => menuItem.id === itemId
  );

  if (!item) {
    showToast("This item could not be added.");
    return;
  }

  const existingItem = cart.find(
    (cartItem) => cartItem.id === itemId
  );

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({
      id: item.id,
      name: item.name,
      price: Number(item.price),
      emoji: item.emoji,
      quantity: 1,
    });
  }

  saveCart();
  renderCart();

  showToast(`${item.name} added to your cart.`);
}


// ---------- Cart quantity ----------

function changeQuantity(itemId, amount) {
  const item = cart.find(
    (cartItem) => cartItem.id === itemId
  );

  if (!item) {
    return;
  }

  item.quantity += amount;

  if (item.quantity <= 0) {
    cart = cart.filter(
      (cartItem) => cartItem.id !== itemId
    );
  }

  saveCart();
  renderCart();
}

function getCartQuantity() {
  return cart.reduce((total, item) => {
    return total + item.quantity;
  }, 0);
}

function getCartTotal() {
  return cart.reduce((total, item) => {
    return total + item.price * item.quantity;
  }, 0);
}


// ---------- Render cart ----------

function renderCart() {
  const quantity = getCartQuantity();
  const total = getCartTotal();

  cartCount.textContent = quantity;
  cartTotal.textContent = `$${total.toFixed(2)}`;
  checkoutButton.disabled = cart.length === 0;

  if (cart.length === 0) {
    cartItems.innerHTML = `
      <div class="cart-empty">
        <div class="empty-menu-icon">🛒</div>
        <p>Your cart is empty.</p>
        <span class="muted">
          Add something delicious from the menu.
        </span>
      </div>
    `;

    return;
  }

  cartItems.innerHTML = cart
    .map(
      (item) => `
        <div class="cart-item">
          <div class="cart-item-emoji">
            ${escapeHtml(item.emoji)}
          </div>

          <div>
            <div class="cart-item-name">
              ${escapeHtml(item.name)}
            </div>

            <div class="cart-item-price">
              $${item.price.toFixed(2)} each
            </div>
          </div>

          <div class="cart-item-controls">
            <button
              class="quantity-button"
              type="button"
              data-action="decrease"
              data-item-id="${item.id}"
              aria-label="Decrease quantity"
            >
              −
            </button>

            <span class="cart-item-quantity">
              ${item.quantity}
            </span>

            <button
              class="quantity-button"
              type="button"
              data-action="increase"
              data-item-id="${item.id}"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        </div>
      `
    )
    .join("");

  cartItems
    .querySelectorAll(".quantity-button")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const itemId = Number(button.dataset.itemId);

        const amount =
          button.dataset.action === "increase"
            ? 1
            : -1;

        changeQuantity(itemId, amount);
      });
    });
}


// ---------- Cart panel ----------

function openCart() {
  cartPanel.classList.add("open");
  cartBackdrop.classList.add("open");
  cartPanel.setAttribute("aria-hidden", "false");
}

function closeCartPanel() {
  cartPanel.classList.remove("open");
  cartBackdrop.classList.remove("open");
  cartPanel.setAttribute("aria-hidden", "true");
}

cartButton.addEventListener("click", openCart);
closeCart.addEventListener("click", closeCartPanel);
cartBackdrop.addEventListener("click", closeCartPanel);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeCartPanel();
  }
});


// ---------- Checkout ----------

checkoutButton.addEventListener("click", () => {
  if (cart.length === 0) {
    showToast("Your cart is empty.");
    return;
  }

  window.location.href = "/checkout";
});


// ---------- Start page ----------

renderCart();
loadMenu();
