
require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");
const path = require("path");

const app = express();
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

app.use(express.json());
app.use(express.static(__dirname));

// Get available tickets and events
app.get("/api/events", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT t.id, e.name, t.price, t.date
            FROM tickets t
            JOIN events e ON t.event_id = e.id
            ORDER BY t.id
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({error: "Cannot load events"});
    }
});

// Get bookings
app.get("/api/bookings", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT b.*, e.name AS event_name
            FROM bookings b
            JOIN tickets t ON b.ticket_id = t.id
            JOIN events e ON t.event_id = e.id
            ORDER BY b.id DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({error: "Cannot load bookings"});
    }
});

// Create booking
app.post("/api/bookings", async (req, res) => {
    try {
        const {ticketId, name, email, phone, quantity} = req.body;
        const qty = Number(quantity);

        if (!Number.isInteger(qty) || qty < 1 || qty > 10 ||
            !name?.trim() || !email?.trim() || !phone?.trim()) {
            return res.status(400).json({error: "Invalid booking details"});
        }

        const ticket = await pool.query(
            "SELECT price FROM tickets WHERE id = $1",
            [ticketId]
        );

        if (!ticket.rows.length) {
            return res.status(404).json({error: "Ticket not found"});
        }

        const total = Number(ticket.rows[0].price) * qty;

        const result = await pool.query(`
            INSERT INTO bookings
            (ticket_id, name, email, phone, quantity, total)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
        `, [ticketId, name.trim(), email.trim(), phone.trim(), qty, total]);

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({error: "Booking failed"});
    }
});

// Update booking
app.patch("/api/bookings/:id", async (req, res) => {
    try {
        const qty = Number(req.body.quantity);
        if (!Number.isInteger(qty) || qty < 1 || qty > 10) {
            return res.status(400).json({error: "Invalid quantity"});
        }

        const result = await pool.query(`
            UPDATE bookings
            SET quantity = $1,
                total = $1 * (
                    SELECT price FROM tickets
                    WHERE id = bookings.ticket_id
                )
            WHERE id = $2
            RETURNING id
        `, [qty, req.params.id]);

        if (!result.rowCount) {
            return res.status(404).json({error: "Booking not found"});
        }

        res.json({success: true});
    } catch (err) {
        console.error(err);
        res.status(500).json({error: "Update failed"});
    }
});

// Delete booking
app.delete("/api/bookings/:id", async (req, res) => {
    try {
        const result = await pool.query(
            "DELETE FROM bookings WHERE id = $1 RETURNING id",
            [req.params.id]
        );

        if (!result.rowCount) {
            return res.status(404).json({error: "Booking not found"});
        }

        res.json({success: true});
    } catch (err) {
        console.error(err);
        res.status(500).json({error: "Delete failed"});
    }
});

// Start website and create bookings table
async function start() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS bookings (
                id SERIAL PRIMARY KEY,
                ticket_id INTEGER NOT NULL,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(150) NOT NULL,
                phone VARCHAR(30) NOT NULL,
                quantity INTEGER NOT NULL,
                total NUMERIC(12,2) NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        app.listen(3000, () => {
            console.log("Website running at http://localhost:3000");
        });
    } catch (err) {
        console.error("Database connection error:", err.message);
    }
}

start();
