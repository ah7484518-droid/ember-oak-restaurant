const checkoutItems = document.getElementById("checkoutItems");
const checkoutTotal = document.getElementById("checkoutTotal");
const checkoutForm = document.getElementById("checkoutForm");
const checkoutError = document.getElementById("checkoutError");
const placeOrderButton = document.getElementById("placeOrderButton");
const loginNotice = document.getElementById("loginNotice");
const successMessage = document.getElementById("successMessage");
const orderNumber = document.getElementById("orderNumber");

const cardNumberInput = document.getElementById("cardNumber");
const expiryInput = document.getElementById("expiry");
const cvvInput = document.getElementById("cvv");

const toast = document.getElementById("toast");

let toastTimer = null;


// ---------- Helpers ----------

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message) {
  if (!toast) {
    return;
  }

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}

function getCart() {
  try {
    return JSON.parse(localStorage.getItem("ember_cart") || "[]");
  } catch (error) {
    return [];
  }
}

function getAccessToken() {
  return localStorage.getItem("access_token");
}


// ---------- Display order summary ----------

function renderCheckoutItems() {
  const cart = getCart();

  if (cart.length === 0) {
    checkoutItems.innerHTML = `
      <div class="cart-empty">
        <div class="empty-menu-icon">🛒</div>
        <p>Your cart is empty.</p>
        <span class="muted">
          Go back to the menu and add some dishes.
        </span>
      </div>
    `;

    checkoutTotal.textContent = "$0.00";
    placeOrderButton.disabled = true;

    return;
  }

  let total = 0;

  checkoutItems.innerHTML = cart
    .map((item) => {
      const itemTotal = Number(item.price) * Number(item.quantity);
      total += itemTotal;

      return `
        <div class="checkout-item">
          <div class="checkout-item-icon">
            ${escapeHtml(item.emoji)}
          </div>

          <div>
            <div class="checkout-item-name">
              ${escapeHtml(item.name)}
            </div>

            <div class="checkout-item-meta">
              ${item.quantity} × $${Number(item.price).toFixed(2)}
            </div>
          </div>

          <strong class="checkout-item-total">
            $${itemTotal.toFixed(2)}
          </strong>
        </div>
      `;
    })
    .join("");

  checkoutTotal.textContent = `$${total.toFixed(2)}`;
}


// ---------- Authentication state ----------

function updateAuthenticationState() {
  const token = getAccessToken();
  const cart = getCart();

  if (cart.length === 0) {
    checkoutForm.hidden = true;
    loginNotice.hidden = true;
    return;
  }

  if (!token) {
    checkoutForm.hidden = true;
    loginNotice.hidden = false;
    return;
  }

  checkoutForm.hidden = false;
  loginNotice.hidden = true;
}


// ---------- Demo card formatting ----------

cardNumberInput.addEventListener("input", () => {
  const digitsOnly = cardNumberInput.value
    .replace(/\D/g, "")
    .slice(0, 16);

  cardNumberInput.value = digitsOnly.replace(
    /(\d{4})(?=\d)/g,
    "$1 "
  );
});

expiryInput.addEventListener("input", () => {
  const digitsOnly = expiryInput.value
    .replace(/\D/g, "")
    .slice(0, 4);

  if (digitsOnly.length >= 3) {
    expiryInput.value = `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2)}`;
  } else {
    expiryInput.value = digitsOnly;
  }
});

cvvInput.addEventListener("input", () => {
  cvvInput.value = cvvInput.value
    .replace(/\D/g, "")
    .slice(0, 3);
});


// ---------- Place order ----------

checkoutForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  checkoutError.textContent = "";

  const token = getAccessToken();
  const cart = getCart();

  if (!token) {
    checkoutError.textContent =
      "Please log in before placing your order.";

    return;
  }

  if (cart.length === 0) {
    checkoutError.textContent =
      "Your cart is empty. Please add an item first.";

    return;
  }

  const cardDigits = cardNumberInput.value.replace(/\D/g, "");

  if (cardDigits.length !== 16) {
    checkoutError.textContent =
      "Enter the demo card number: 4242 4242 4242 4242.";

    return;
  }

  if (expiryInput.value.length !== 5) {
    checkoutError.textContent =
      "Enter the expiry date in MM/YY format.";

    return;
  }

  if (cvvInput.value.length !== 3) {
    checkoutError.textContent =
      "CVV must contain 3 digits.";

    return;
  }

  placeOrderButton.disabled = true;
  placeOrderButton.textContent = "Placing order...";

  const requestBody = {
    items: cart.map((item) => ({
      id: Number(item.id),
      quantity: Number(item.quantity),
    })),
  };

  try {
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.detail || "Could not place your order."
      );
    }

    localStorage.removeItem("ember_cart");

    checkoutForm.hidden = true;
    loginNotice.hidden = true;
    successMessage.hidden = false;

    orderNumber.textContent = `#${result.order.id}`;
    showToast("Your order was placed successfully.");
  } catch (error) {
    checkoutError.textContent = error.message;
  } finally {
    placeOrderButton.disabled = false;
    placeOrderButton.textContent = "Place demo order";
  }
});


// ---------- Start page ----------

renderCheckoutItems();
updateAuthenticationState();