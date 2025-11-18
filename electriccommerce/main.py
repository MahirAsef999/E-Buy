import re
import uuid
import datetime

from flask import Flask, request, jsonify, abort
from flask_cors import CORS

import jwt
from mysql.connector import pooling, Error as MySQLError
from email_validator import validate_email, EmailNotValidError

app = Flask(__name__)
CORS(app)

JWT_SECRET = "dev_secret"

DB_CONFIG = {
    "host": "127.0.0.1",
    "user": "bestbuy_user",
    "password": "Software5432",
    "database": "bestbuy_app",
}

pool = pooling.MySQLConnectionPool(
    pool_name="bestbuy_pool",
    pool_size=5,
    **DB_CONFIG,
)

NAME_RE = re.compile(r"^.{2,}$")


def issue_token(user):
    payload = {"id": user["id"], "email": user["email"], "name": user["name"]}
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


@app.get("/api/health")
def health():
    return jsonify({"ok": True})


# ---------- AUTH ROUTES ----------

@app.post("/api/auth/register")
def register():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    address = (data.get("address") or "").strip() or None

    try:
        validate_email(email)
    except EmailNotValidError:
        return jsonify({"errors": [{"msg": "Invalid email"}]}), 400

    if not NAME_RE.match(name):
        return jsonify({"errors": [{"msg": "Name must be at least 2 characters"}]}), 400

    if len(password) < 8:
        return jsonify({"errors": [{"msg": "Password must be at least 8 characters"}]}), 400

    try:
        conn = pool.get_connection()
        cur = conn.cursor(dictionary=True)
        cur.execute(
            "INSERT INTO users (name, email, password_hash, address) "
            "VALUES (%s, %s, SHA2(%s,256), %s)",
            (name, email, password, address),
        )
        conn.commit()
        return jsonify({"id": cur.lastrowid, "email": email})
    except MySQLError as e:
        if getattr(e, "errno", None) == 1062:
            return "Email already registered", 409
        app.logger.exception(e)
        return "Server error", 500
    finally:
        try:
            cur.close()
            conn.close()
        except Exception:
            pass


@app.post("/api/auth/login")
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    try:
        validate_email(email)
    except EmailNotValidError:
        return jsonify({"errors": [{"msg": "Invalid email"}]}), 400

    if len(password) < 8:
        return jsonify({"errors": [{"msg": "Password must be at least 8 characters"}]}), 400

    try:
        conn = pool.get_connection()
        cur = conn.cursor(dictionary=True)
        cur.execute(
            "SELECT id, name, email "
            "FROM users "
            "WHERE email=%s AND password_hash=SHA2(%s,256) "
            "LIMIT 1",
            (email, password),
        )
        row = cur.fetchone()
        if not row:
            return "Invalid credentials", 401

        token = issue_token(row)
        return jsonify({"token": token, "user": row})
    except MySQLError as e:
        app.logger.exception(e)
        return "Server error", 500
    finally:
        try:
            cur.close()
            conn.close()
        except Exception:
            pass


# ---------- PRODUCTS / CART / ORDERS ----------

PRODUCTS = {
    "Refrigerator": {"price": 500},
    "Microwave": {"price": 300},
    "Dishwasher": {"price": 450},
    "Oven": {"price": 550},
    "Washer": {"price": 600},
    "Dryer": {"price": 600},
    "Blender": {"price": 100},
    "DripCoffee": {"price": 150},
    "Laptop": {"price": 200},
    "TV": {"price": 399},
    "Speaker": {"price": 199},
    "OutDatedVinyl": {"price": 50},
    "Switch2": {"price": 499},
    "PlayStation5": {"price": 599},
    "XboxS": {"price": 399},
    "OutDatedGameBoy": {"price": 1},
    "Headphones": {"price": 49},
    "IPad": {"price": 299},
    "GamingDesktop": {"price": 999},
    "Printer": {"price": 230},
    "Monitor": {"price": 750},
    "Camera": {"price": 700},
    "SmartWatch": {"price": 299},
    "Vaccum": {"price": 100},
}

CARTS = {}
ORDERS = {}


def tok():
    return request.headers.get("X-Demo-Token") or "guest"


def subtotal(t):
    cart = CARTS.get(t, {})
    return sum(PRODUCTS[p]["price"] * q for p, q in cart.items())


@app.get("/api/products")
def list_products():
    return jsonify([{"id": k, "price": v["price"]} for k, v in PRODUCTS.items()])


@app.get("/api/cart")
def get_cart():
    t = tok()
    items = [
        {"productId": p, "qty": q, "price": PRODUCTS[p]["price"]}
        for p, q in CARTS.get(t, {}).items()
    ]
    return jsonify({"items": items, "subtotal": subtotal(t)})


@app.post("/api/cart/items")
def add_item():
    data = request.get_json(force=True)
    pid = data.get("productId")
    qty = int(data.get("qty", 1))
    if pid not in PRODUCTS:
        abort(400, "invalid product")
    t = tok()
    CARTS.setdefault(t, {})
    CARTS[t][pid] = CARTS[t].get(pid, 0) + max(1, qty)
    return jsonify({"ok": True})


@app.patch("/api/cart/items/<pid>")
def update_item(pid):
    data = request.get_json(force=True)
    qty = int(data.get("qty", 1))
    t = tok()
    if t not in CARTS or pid not in CARTS[t]:
        abort(404, "not in cart")
    CARTS[t][pid] = max(1, qty)
    return jsonify({"ok": True})


@app.delete("/api/cart/items/<pid>")
def remove_item(pid):
    t = tok()
    if t in CARTS and pid in CARTS[t]:
        del CARTS[t][pid]
    return jsonify({"ok": True})


@app.post("/api/orders")
def create_order():
    t = tok()
    if not CARTS.get(t):
        abort(400, "cart empty")
    order_id = uuid.uuid4().hex[:12]
    order = {
        "id": order_id,
        "user": t,
        "items": [
            {"productId": p, "qty": q, "price": PRODUCTS[p]["price"]}
            for p, q in CARTS[t].items()
        ],
        "total": subtotal(t),
        "status": "pending",
        "createdAt": datetime.datetime.utcnow().isoformat(),
    }
    ORDERS[order_id] = order
    CARTS[t] = {}
    return jsonify(order)


@app.get("/api/orders")
def list_orders():
    t = tok()
    return jsonify([o for o in ORDERS.values() if o["user"] == t])


@app.post("/api/payments/mock")
def pay():
    data = request.get_json(force=True)
    oid = data.get("orderId")
    outcome = data.get("outcome", "success")
    if oid not in ORDERS:
        abort(404, "order not found")
    ORDERS[oid]["status"] = "paid" if outcome == "success" else "failed"
    return jsonify(ORDERS[oid])


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
