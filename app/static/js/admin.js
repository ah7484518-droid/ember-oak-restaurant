const adminWelcome = document.getElementById("adminWelcome");
const adminError = document.getElementById("adminError");
const adminLogout = document.getElementById("adminLogout");

const totalSales = document.getElementById("totalSales");
const totalOrders = document.getElementById("totalOrders");
const totalReservations = document.getElementById("totalReservations");
const totalUsers = document.getElementById("totalUsers");

const salesChart = document.getElementById("salesChart");
const ordersTableBody = document.getElementById("ordersTableBody");
const reservationsTableBody = document.getElementById(
  "reservationsTableBody"
);

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value ?? "";
  return div.innerHTML;
}

function getToken() {
  return localStorage.getItem("access_token");
}

function showAdminError(message) {
  adminError.textContent = message;
  adminError.hidden = false;
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function renderStats(stats) {
  totalSales.textContent = `$${Number(stats.total_sales).toFixed(2)}`;
  totalOrders.textContent = stats.total_orders;
  totalReservations.textContent = stats.total_reservations;
  totalUsers.textContent = stats.total_users;
}

function renderSalesChart(salesByDay) {
  if (!salesByDay || salesByDay.length === 0) {
    salesChart.innerHTML = `
      <p class="chart-empty">
        No sales data yet.
      </p>
    `;
    return;
  }

  const maxTotal = Math.max(
    ...salesByDay.map((item) => Number(item.total)),
    1
  );

  salesChart.innerHTML = salesByDay
    .map((item) => {
      const total = Number(item.total);
      const barHeight = Math.max((total / maxTotal) * 190, 5);

      const label = new Date(
        `${item.date}T00:00:00`
      ).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      return `
        <div class="chart-column">
          <span class="chart-value">
            $${total.toFixed(0)}
          </span>

          <div
            class="chart-bar"
            style="height: ${barHeight}px"
            title="$${total.toFixed(2)}"
          ></div>

          <span class="chart-label">
            ${escapeHtml(label)}
          </span>
        </div>
      `;
    })
    .join("");
}

function renderOrders(orders) {
  if (!orders || orders.length === 0) {
    ordersTableBody.innerHTML = `
      <tr>
        <td colspan="3" class="empty-table">
          No orders yet.
        </td>
      </tr>
    `;
    return;
  }

  ordersTableBody.innerHTML = orders
    .map(
      (order) => `
        <tr>
          <td>#${order.id}</td>
          <td class="order-total">
            $${Number(order.total).toFixed(2)}
          </td>
          <td>
            <span class="status-badge">
              ${escapeHtml(order.status)}
            </span>
          </td>
        </tr>
      `
    )
    .join("");
}

function renderReservations(reservations) {
  if (!reservations || reservations.length === 0) {
    reservationsTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-table">
          No reservations yet.
        </td>
      </tr>
    `;
    return;
  }

  reservationsTableBody.innerHTML = reservations
    .map(
      (reservation) => `
        <tr>
          <td>
            <strong>${escapeHtml(reservation.name)}</strong>
          </td>
          <td>${escapeHtml(reservation.date)}</td>
          <td>${escapeHtml(reservation.time)}</td>
          <td>${reservation.guests}</td>
          <td>Table ${reservation.table_number}</td>
        </tr>
      `
    )
    .join("");
}

async function loadDashboard() {
  const token = getToken();

  if (!token) {
    showAdminError(
      "Please log in with the admin account first."
    );
    return;
  }

  try {
    const response = await fetch("/api/admin/dashboard", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.detail || "Could not load the dashboard."
      );
    }

    adminWelcome.textContent =
      `Welcome, ${result.admin.full_name}. ` +
      "Here is today's restaurant overview.";

    renderStats(result.stats);
    renderSalesChart(result.sales_by_day);
    renderOrders(result.recent_orders);
    renderReservations(result.recent_reservations);
  } catch (error) {
    showAdminError(error.message);
  }
}

adminLogout.addEventListener("click", () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("user");
  window.location.href = "/";
});

loadDashboard();