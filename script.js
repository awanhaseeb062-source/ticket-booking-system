
const eventsGrid = document.getElementById("eventsGrid");
const bookingsList = document.getElementById("bookingsList");
const bookingModal = document.getElementById("bookingModal");
const bookingForm = document.getElementById("bookingForm");
const ticketSelect = document.getElementById("ticketSelect");

let tickets = [];

function safe(text) {
    return String(text ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[char]));
}

function money(amount) {
    return "Rs. " + Number(amount).toLocaleString("en-PK");
}

function showMessage(message, type = "success") {
    const box = document.getElementById("message");
    box.innerHTML = "";

    const notice = document.createElement("div");
    notice.className = type;
    notice.textContent = message;
    box.appendChild(notice);

    setTimeout(() => notice.remove(), 4000);
}

// Load events from Neon through backend
async function loadEvents() {
    try {
        const response = await fetch("/api/events");
        if (!response.ok) throw new Error("Server error");

        tickets = await response.json();

        if (tickets.length === 0) {
            eventsGrid.textContent = "No events available.";
            return;
        }

        eventsGrid.innerHTML = tickets.map(ticket => `
            <div class="event-card">
                <div class="event-image">🎟️</div>
                <div class="event-body">
                    <h3>${safe(ticket.name)}</h3>
                    <p class="event-info">
                        📅 ${safe(String(ticket.date).slice(0, 10))}
                    </p>
                    <p class="event-price">
                        ${money(ticket.price)}
                    </p>
                    <button class="btn"
                        onclick="openBooking(${Number(ticket.id)})">
                        Book Now
                    </button>
                </div>
            </div>
        `).join("");

        ticketSelect.innerHTML = tickets.map(ticket => `
            <option value="${Number(ticket.id)}">
                ${safe(ticket.name)} - ${money(ticket.price)}
            </option>
        `).join("");

    } catch (error) {
        eventsGrid.textContent =
            "Cannot load events. Please start the backend server.";
    }
}

// Open booking form
function openBooking(ticketId) {
    ticketSelect.value = String(ticketId);
    bookingModal.classList.remove("hidden");
}

document.getElementById("closeModal").onclick = () => {
    bookingModal.classList.add("hidden");
};

// Book ticket
bookingForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const booking = {
        ticketId: Number(ticketSelect.value),
        name: document.getElementById("customerName").value.trim(),
        email: document.getElementById("customerEmail").value.trim(),
        phone: document.getElementById("customerPhone").value.trim(),
        quantity: Number(document.getElementById("quantity").value)
    };

    try {
        const response = await fetch("/api/bookings", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(booking)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Booking failed");
        }

        showMessage("Booking successful! ID: " + result.id);
        bookingModal.classList.add("hidden");
        bookingForm.reset();
        await loadBookings();

    } catch (error) {
        showMessage(error.message, "error");
    }
});

// Display all bookings
async function loadBookings() {
    try {
        const response = await fetch("/api/bookings");
        if (!response.ok) throw new Error("Server error");

        const bookings = await response.json();

        if (bookings.length === 0) {
            bookingsList.textContent = "No bookings yet.";
            return;
        }

        bookingsList.innerHTML = bookings.map(b => `
            <div class="booking-item">
                <h3>Booking #${Number(b.id)}</h3>
                <p><b>Customer:</b> ${safe(b.name)}</p>
                <p><b>Event:</b> ${safe(b.event_name)}</p>
                <p><b>Email:</b> ${safe(b.email)}</p>
                <p><b>Phone:</b> ${safe(b.phone)}</p>
                <p><b>Quantity:</b> ${Number(b.quantity)}</p>
                <p><b>Total:</b> ${money(b.total)}</p>
                <br>
                <button class="btn"
                    onclick="editBooking(${Number(b.id)}, ${Number(b.quantity)})">
                    Edit
                </button>
                <button class="btn"
                    onclick="deleteBooking(${Number(b.id)})">
                    Cancel
                </button>
            </div>
        `).join("");

    } catch (error) {
        bookingsList.textContent =
            "Bookings will appear when the server is running.";
    }
}

// Update booking
async function editBooking(id, oldQuantity) {
    const input = prompt("Enter new ticket quantity:", oldQuantity);
    if (input === null) return;

    const quantity = Number(input);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
        showMessage("Enter a quantity from 1 to 10.", "error");
        return;
    }

    try {
        const response = await fetch("/api/bookings/" + id, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ quantity })
        });

        if (!response.ok) throw new Error("Update failed");

        showMessage("Booking updated successfully!");
        loadBookings();
    } catch (error) {
        showMessage(error.message, "error");
    }
}

// Delete booking
async function deleteBooking(id) {
    if (!confirm("Cancel this booking?")) return;

    try {
        const response = await fetch("/api/bookings/" + id, {
            method: "DELETE"
        });

        if (!response.ok) throw new Error("Cancellation failed");

        showMessage("Booking cancelled!");
        loadBookings();
    } catch (error) {
        showMessage(error.message, "error");
    }
}

// Start loading data
loadEvents();
loadBookings();
