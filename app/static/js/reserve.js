const navbar = document.getElementById("navbar");
const burger = document.getElementById("burger");
const navLinks = document.getElementById("navLinks");

const reservationForm = document.getElementById("reservationForm");
const reservationName = document.getElementById("reservationName");
const reservationPhone = document.getElementById("reservationPhone");
const reservationDate = document.getElementById("reservationDate");
const reservationTime = document.getElementById("reservationTime");
const reservationGuests = document.getElementById("reservationGuests");

const selectedTableInput = document.getElementById("selectedTable");
const selectedTableBox = document.getElementById("selectedTableBox");
const selectedTableText = document.getElementById("selectedTableText");

const reservationError = document.getElementById("reservationError");
const reservationSubmit = document.getElementById("reservationSubmit");

const reservationSuccess = document.getElementById("reservationSuccess");
const reservationNumber = document.getElementById("reservationNumber");
const successTable = document.getElementById("successTable");
const successDateTime = document.getElementById("successDateTime");

const tables = document.querySelectorAll(".table");
const floorPlanHint = document.querySelector(".floor-plan-hint");

let selectedTableNumber = null;
let toastTimer = null;


// ---------- Helpers ----------

function showError(message) {
  reservationError.textContent = message;
}

function clearError() {
  reservationError.textContent = "";
}

function getAccessToken() {
  return localStorage.getItem("access_token");
}

function showToast(message) {
  const toast = document.getElementById("toast");

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

function getTodayDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
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


// ---------- Date setup ----------

reservationDate.min = getTodayDate();

reservationDate.value = getTodayDate();


// ---------- Table selection ----------

function clearSelectedTable() {
  selectedTableNumber = null;
  selectedTableInput.value = "";
  selectedTableText.textContent =
    "Choose a table from the floor plan";

  selectedTableBox.classList.remove("has-selection");

  tables.forEach((table) => {
    table.classList.remove("selected");
  });

  updateSubmitButton();
}

function selectTable(table) {
  if (table.classList.contains("booked")) {
    return;
  }

  tables.forEach((item) => {
    item.classList.remove("selected");
  });

  table.classList.add("selected");

  selectedTableNumber = Number(
    table.dataset.tableNumber
  );

  selectedTableInput.value = selectedTableNumber;

  selectedTableText.textContent =
    `Table ${selectedTableNumber} selected`;

  selectedTableBox.classList.add("has-selection");

  clearError();
  updateSubmitButton();
}

tables.forEach((table) => {
  table.addEventListener("click", () => {
    selectTable(table);
  });
});


// ---------- Availability ----------

function resetTableAvailability() {
  tables.forEach((table) => {
    table.classList.remove("booked");
    table.disabled = false;
    table.title = "Available table";
  });

  clearSelectedTable();
}

async function loadAvailability() {
  const date = reservationDate.value;
  const time = reservationTime.value;

  resetTableAvailability();

  if (!date || !time) {
    floorPlanHint.textContent =
      "Choose a date and time to see available tables.";

    return;
  }

  floorPlanHint.textContent =
    "Checking table availability...";

  try {
    const params = new URLSearchParams({
      date,
      time,
    });

    const response = await fetch(
      `/api/reservations/availability?${params.toString()}`
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.detail || "Could not load table availability."
      );
    }

    const bookedTables = result.booked_tables || [];

    bookedTables.forEach((tableNumber) => {
      const table = document.querySelector(
        `[data-table-number="${tableNumber}"]`
      );

      if (!table) {
        return;
      }

      table.classList.add("booked");
      table.disabled = true;
      table.title = "This table is already booked";
    });

    const availableCount = tables.length - bookedTables.length;

    floorPlanHint.textContent =
      `${availableCount} table${
        availableCount === 1 ? "" : "s"
      } available for this date and time.`;
  } catch (error) {
    floorPlanHint.textContent =
      "Could not check availability. Please try again.";

    showError(error.message);
  }

  updateSubmitButton();
}

reservationDate.addEventListener(
  "change",
  loadAvailability
);

reservationTime.addEventListener(
  "change",
  loadAvailability
);


// ---------- Form state ----------

function updateSubmitButton() {
  const hasDate = reservationDate.value !== "";
  const hasTime = reservationTime.value !== "";
  const hasTable = selectedTableNumber !== null;

  reservationSubmit.disabled = !(
    hasDate &&
    hasTime &&
    hasTable
  );
}


// ---------- Create reservation ----------

reservationForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  clearError();

  const token = getAccessToken();

  if (!token) {
    showError(
      "Please log in before confirming your reservation."
    );

    return;
  }

  if (!selectedTableNumber) {
    showError("Please choose an available table.");

    return;
  }

  const requestBody = {
    name: reservationName.value.trim(),
    phone: reservationPhone.value.trim(),
    date: reservationDate.value,
    time: reservationTime.value,
    guests: Number(reservationGuests.value),
    table_number: Number(selectedTableNumber),
  };

  if (requestBody.name.length < 2) {
    showError("Please enter your full name.");

    return;
  }

  if (requestBody.phone.length < 6) {
    showError("Please enter a valid phone number.");

    return;
  }

  reservationSubmit.disabled = true;
  reservationSubmit.textContent = "Saving reservation...";

  try {
    const response = await fetch("/api/reservations", {
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
        result.detail || "Could not save reservation."
      );
    }

    reservationForm.hidden = true;
    reservationSuccess.hidden = false;

    reservationNumber.textContent =
      `#${result.reservation.id}`;

    successTable.textContent =
      `Table ${result.reservation.table_number}`;

    successDateTime.textContent =
      `${result.reservation.date} at ${result.reservation.time}`;

    showToast("Table reserved successfully.");
  } catch (error) {
    showError(error.message);

    reservationSubmit.disabled = false;
    reservationSubmit.textContent =
      "Confirm reservation";

    // Refresh availability in case another user booked
    // the same table moments ago.
    await loadAvailability();
  }
});


// ---------- Start page ----------

clearSelectedTable();
updateSubmitButton();
