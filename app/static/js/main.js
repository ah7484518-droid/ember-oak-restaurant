const navbar = document.getElementById("navbar");
const burger = document.getElementById("burger");
const navLinks = document.getElementById("navLinks");
const toast = document.getElementById("toast");
const featuredGrid = document.getElementById("featuredGrid");

// ---------- Helpers ----------

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

let toastTimer = null;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}

// ---------- Navbar ----------

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

// ---------- Buttons for future features ----------

document.querySelectorAll("[data-soon]").forEach((element) => {
  element.addEventListener("click", (event) => {
    event.preventDefault();
    showToast("Coming in the next step 🚧");
  });
});

// ---------- Authentication ----------

const authModal = document.getElementById("authModal");
const closeAuthModal = document.getElementById("closeAuthModal");
const authForm = document.getElementById("authForm");
const authTitle = document.getElementById("authTitle");
const authEyebrow = document.getElementById("authEyebrow");
const authSubtitle = document.getElementById("authSubtitle");
const authSubmit = document.querySelector(".auth-submit");
const authSwitchText = document.getElementById("authSwitchText");
const switchAuthMode = document.getElementById("switchAuthMode");
const fullNameField = document.getElementById("fullNameField");
const fullNameInput = document.getElementById("fullName");
const authError = document.getElementById("authError");
const loginLink = document.querySelector('[data-auth="login"]');
const signupLink = document.querySelector('[data-auth="register"]');

let authMode = "login";

function openAuthModal(mode = "login") {
  authMode = mode;
  authError.textContent = "";
  authForm.reset();

  const isRegister = mode === "register";

  authEyebrow.textContent = isRegister
    ? "Join the table"
    : "Welcome back";

  authTitle.textContent = isRegister
    ? "Create your account"
    : "Log in to Ember & Oak";

  authSubtitle.textContent = isRegister
    ? "Save your details for faster ordering and booking."
    : "Continue your dining experience.";

  authSubmit.textContent = isRegister
    ? "Create account"
    : "Log in";

  fullNameField.style.display = isRegister ? "flex" : "none";
  fullNameInput.required = isRegister;

  authSwitchText.textContent = isRegister
    ? "Already have an account?"
    : "New here?";

  switchAuthMode.textContent = isRegister
    ? "Log in"
    : "Create an account";

  authModal.classList.add("open");
  authModal.setAttribute("aria-hidden", "false");

  setTimeout(() => {
    if (isRegister) {
      fullNameInput.focus();
    } else {
      document.getElementById("authEmail").focus();
    }
  }, 50);
}

function closeAuth() {
  authModal.classList.remove("open");
  authModal.setAttribute("aria-hidden", "true");
}

loginLink.addEventListener("click", (event) => {
  event.preventDefault();
  openAuthModal("login");
});

signupLink.addEventListener("click", (event) => {
  event.preventDefault();

  if (signupLink.dataset.auth === "logout") {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");

    updateAuthUI();
    showToast("You have been logged out.");

    return;
  }

  openAuthModal("register");
});

closeAuthModal.addEventListener("click", closeAuth);

authModal.addEventListener("click", (event) => {
  if (event.target === authModal) {
    closeAuth();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeAuth();
  }
});

switchAuthMode.addEventListener("click", () => {
  openAuthModal(authMode === "login" ? "register" : "login");
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  authError.textContent = "";
  authSubmit.disabled = true;
  authSubmit.textContent = "Please wait...";

  const formData = new FormData(authForm);

  const body = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  if (authMode === "register") {
    body.full_name = formData.get("full_name");
  }

  const endpoint =
    authMode === "register"
      ? "/api/auth/register"
      : "/api/auth/login";

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.detail || "Something went wrong.");
    }

    localStorage.setItem("access_token", result.access_token);
    localStorage.setItem("user", JSON.stringify(result.user));

    closeAuth();
    updateAuthUI();

    showToast(
      authMode === "register"
        ? "Account created successfully."
        : "Welcome back!"
    );
  } catch (error) {
    authError.textContent = error.message;
  } finally {
    authSubmit.disabled = false;

    authSubmit.textContent =
      authMode === "register"
        ? "Create account"
        : "Log in";
  }
});

function updateAuthUI() {
  const savedUser = localStorage.getItem("user");

  if (!savedUser) {
    loginLink.textContent = "Log in";
    signupLink.textContent = "Sign up";
    signupLink.dataset.auth = "register";
    return;
  }

  const user = JSON.parse(savedUser);

  loginLink.textContent = `Hi, ${user.full_name.split(" ")[0]}`;
  signupLink.textContent = "Log out";
  signupLink.dataset.auth = "logout";
}

// ---------- Reveal on scroll ----------

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.15,
  }
);

function observeReveals() {
  document
    .querySelectorAll(".reveal:not(.visible)")
    .forEach((element) => observer.observe(element));
}

// ---------- Signature dishes ----------

async function loadFeatured() {
  try {
    const response = await fetch("/api/menu");

    if (!response.ok) {
      throw new Error("Menu request failed.");
    }

    const menu = await response.json();
    const featured = menu.filter((item) => item.is_featured);

    featuredGrid.innerHTML = featured
      .map(
        (item) => `
          <article class="dish-card reveal">
            <div class="dish-art">
              ${escapeHtml(item.emoji)}
            </div>

            <div class="dish-body">
              <span class="dish-tag">
                ${escapeHtml(item.category)}
              </span>

              <h3>${escapeHtml(item.name)}</h3>

              <p>${escapeHtml(item.description)}</p>

              <span class="dish-price">
                $${item.price.toFixed(2)}
              </span>
            </div>
          </article>
        `
      )
      .join("");

    observeReveals();
  } catch (error) {
    featuredGrid.innerHTML =
      '<p class="muted">Could not load the menu right now. Please try again.</p>';
  }
}

// ---------- Start app ----------

observeReveals();
loadFeatured();
updateAuthUI();
