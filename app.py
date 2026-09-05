from flask import Flask, render_template, request, jsonify, session, redirect
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from datetime import datetime

app = Flask(__name__)

# Secret key for Flask sessions
app.secret_key = "notes-management-secret-key-change-this"

DATABASE = "notes.db"


# ---------------------------------------------------
# DATABASE CONNECTION
# ---------------------------------------------------

def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn


# ---------------------------------------------------
# CREATE DATABASE TABLES
# ---------------------------------------------------

def init_db():
    conn = get_db_connection()

    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    conn.commit()
    conn.close()


# ---------------------------------------------------
# LOGIN REQUIRED DECORATOR
# ---------------------------------------------------

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({
                "success": False,
                "message": "Please login first"
            }), 401

        return f(*args, **kwargs)

    return decorated_function


# ---------------------------------------------------
# FRONTEND ROUTES
# ---------------------------------------------------

@app.route("/")
def home():
    if "user_id" in session:
        return redirect("/notes")

    return redirect("/login")


@app.route("/login")
def login_page():
    return render_template("login.html")


@app.route("/register")
def register_page():
    return render_template("register.html")


@app.route("/notes")
def notes_page():
    if "user_id" not in session:
        return redirect("/login")

    return render_template("notes.html")


# ---------------------------------------------------
# REGISTER API
# ---------------------------------------------------

@app.route("/api/register", methods=["POST"])
def register():

    data = request.get_json()

    if not data:
        return jsonify({
            "success": False,
            "message": "Invalid request"
        }), 400

    username = data.get("username", "").strip()
    email = data.get("email", "").strip()
    password = data.get("password", "")

    if not username or not email or not password:
        return jsonify({
            "success": False,
            "message": "All fields are required"
        }), 400

    if len(password) < 6:
        return jsonify({
            "success": False,
            "message": "Password must contain at least 6 characters"
        }), 400

    conn = get_db_connection()

    try:
        hashed_password = generate_password_hash(password)

        conn.execute("""
            INSERT INTO users
            (username, email, password, created_at)
            VALUES (?, ?, ?, ?)
        """, (
            username,
            email,
            hashed_password,
            datetime.now().isoformat()
        ))

        conn.commit()

        return jsonify({
            "success": True,
            "message": "Registration successful"
        }), 201

    except sqlite3.IntegrityError:
        return jsonify({
            "success": False,
            "message": "Username or email already exists"
        }), 409

    finally:
        conn.close()


# ---------------------------------------------------
# LOGIN API
# ---------------------------------------------------

@app.route("/api/login", methods=["POST"])
def login():

    data = request.get_json()

    if not data:
        return jsonify({
            "success": False,
            "message": "Invalid request"
        }), 400

    email = data.get("email", "").strip()
    password = data.get("password", "")

    conn = get_db_connection()

    user = conn.execute("""
        SELECT * FROM users
        WHERE email = ?
    """, (email,)).fetchone()

    conn.close()

    if user and check_password_hash(user["password"], password):

        session["user_id"] = user["id"]
        session["username"] = user["username"]

        return jsonify({
            "success": True,
            "message": "Login successful",
            "username": user["username"]
        })

    return jsonify({
        "success": False,
        "message": "Invalid email or password"
    }), 401


# ---------------------------------------------------
# LOGOUT API
# ---------------------------------------------------

@app.route("/api/logout", methods=["POST"])
def logout():

    session.clear()

    return jsonify({
        "success": True,
        "message": "Logged out successfully"
    })


# ---------------------------------------------------
# GET CURRENT USER
# ---------------------------------------------------

@app.route("/api/me", methods=["GET"])
def current_user():

    if "user_id" not in session:
        return jsonify({
            "logged_in": False
        })

    return jsonify({
        "logged_in": True,
        "username": session["username"]
    })


# ===================================================
# NOTES CRUD APIs
# ===================================================


# ---------------------------------------------------
# CREATE NOTE
# POST /api/notes
# ---------------------------------------------------

@app.route("/api/notes", methods=["POST"])
@login_required
def create_note():

    data = request.get_json()

    title = data.get("title", "").strip()
    content = data.get("content", "").strip()

    if not title or not content:
        return jsonify({
            "success": False,
            "message": "Title and content are required"
        }), 400

    now = datetime.now().isoformat()

    conn = get_db_connection()

    cursor = conn.execute("""
        INSERT INTO notes
        (user_id, title, content, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
    """, (
        session["user_id"],
        title,
        content,
        now,
        now
    ))

    conn.commit()

    note_id = cursor.lastrowid

    conn.close()

    return jsonify({
        "success": True,
        "message": "Note created successfully",
        "note_id": note_id
    }), 201


# ---------------------------------------------------
# GET ALL NOTES
# GET /api/notes
# ---------------------------------------------------

@app.route("/api/notes", methods=["GET"])
@login_required
def get_notes():

    conn = get_db_connection()

    notes = conn.execute("""
        SELECT id, title, content, created_at, updated_at
        FROM notes
        WHERE user_id = ?
        ORDER BY id DESC
    """, (session["user_id"],)).fetchall()

    conn.close()

    return jsonify([
        dict(note) for note in notes
    ])


# ---------------------------------------------------
# GET SINGLE NOTE
# GET /api/notes/<id>
# ---------------------------------------------------

@app.route("/api/notes/<int:note_id>", methods=["GET"])
@login_required
def get_note(note_id):

    conn = get_db_connection()

    note = conn.execute("""
        SELECT *
        FROM notes
        WHERE id = ? AND user_id = ?
    """, (
        note_id,
        session["user_id"]
    )).fetchone()

    conn.close()

    if not note:
        return jsonify({
            "success": False,
            "message": "Note not found"
        }), 404

    return jsonify(dict(note))


# ---------------------------------------------------
# UPDATE NOTE
# PUT /api/notes/<id>
# ---------------------------------------------------

@app.route("/api/notes/<int:note_id>", methods=["PUT"])
@login_required
def update_note(note_id):

    data = request.get_json()

    title = data.get("title", "").strip()
    content = data.get("content", "").strip()

    if not title or not content:
        return jsonify({
            "success": False,
            "message": "Title and content are required"
        }), 400

    conn = get_db_connection()

    cursor = conn.execute("""
        UPDATE notes
        SET title = ?,
            content = ?,
            updated_at = ?
        WHERE id = ? AND user_id = ?
    """, (
        title,
        content,
        datetime.now().isoformat(),
        note_id,
        session["user_id"]
    ))

    conn.commit()

    updated = cursor.rowcount

    conn.close()

    if updated == 0:
        return jsonify({
            "success": False,
            "message": "Note not found"
        }), 404

    return jsonify({
        "success": True,
        "message": "Note updated successfully"
    })


# ---------------------------------------------------
# DELETE NOTE
# DELETE /api/notes/<id>
# ---------------------------------------------------

@app.route("/api/notes/<int:note_id>", methods=["DELETE"])
@login_required
def delete_note(note_id):

    conn = get_db_connection()

    cursor = conn.execute("""
        DELETE FROM notes
        WHERE id = ? AND user_id = ?
    """, (
        note_id,
        session["user_id"]
    ))

    conn.commit()

    deleted = cursor.rowcount

    conn.close()

    if deleted == 0:
        return jsonify({
            "success": False,
            "message": "Note not found"
        }), 404

    return jsonify({
        "success": True,
        "message": "Note deleted successfully"
    })


# ---------------------------------------------------
# RUN APPLICATION
# ---------------------------------------------------

if __name__ == "__main__":
    init_db()

    app.run(
        debug=True,
        host="127.0.0.1",
        port=5000
    )
