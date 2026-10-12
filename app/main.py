from contextlib import asynccontextmanager
import os
from pathlib import Path

import jwt
from fastapi import Depends, FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth import (
    JWT_ALGORITHM,
    JWT_SECRET,
    create_access_token,
    hash_password,
    verify_password,
)
from app.database import (
    MenuItem,
    Order,
    OrderItem,
    Reservation,
    User,
    engine,
    get_menu,
    init_db,
)


BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

security = HTTPBearer()


# ---------- Admin setup ----------


def ensure_admin_account():
    admin_email = "admin@emberandoak.com"

    admin_password = os.getenv(
        "ADMIN_PASSWORD",
        "EmberOak!Admin#2026xQ7",
    )

    with Session(engine) as session:
        admin = session.scalar(
            select(User).where(User.email == admin_email)
        )

        if admin:
            password_needs_update = not verify_password(
                admin_password,
                admin.password_hash,
            )

            if not admin.is_admin or password_needs_update:
                admin.is_admin = True
                admin.password_hash = hash_password(admin_password)
                session.commit()

            return

        admin = User(
            full_name="Restaurant Admin",
            email=admin_email,
            password_hash=hash_password(admin_password),
            is_admin=True,
        )

        session.add(admin)
        session.commit()


# ---------- Application startup ----------


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    ensure_admin_account()
    yield


app = FastAPI(
    title="Ember & Oak Restaurant",
    lifespan=lifespan,
)

app.mount(
    "/static",
    StaticFiles(directory=STATIC_DIR),
    name="static",
)


# ---------- Request models ----------


class RegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class OrderItemRequest(BaseModel):
    id: int
    quantity: int = Field(gt=0, le=20)


class CreateOrderRequest(BaseModel):
    items: list[OrderItemRequest] = Field(min_length=1)


class ReservationRequest(BaseModel):
    name: str
    phone: str
    date: str
    time: str
    guests: int = Field(ge=1, le=12)
    table_number: int = Field(ge=1, le=12)


# ---------- Authentication helpers ----------


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> User:
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM],
        )

        user_id = payload.get("sub")

        if not user_id:
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication token.",
            )

    except jwt.PyJWTError:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired authentication token.",
        )

    with Session(engine) as session:
        user = session.get(User, int(user_id))

        if not user:
            raise HTTPException(
                status_code=401,
                detail="User account was not found.",
            )

        return user


def get_current_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_admin:
        raise HTTPException(
            status_code=403,
            detail="Admin access is required.",
        )

    return current_user


# ---------- Pages ----------


@app.get("/", include_in_schema=False)
def home():
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/menu", include_in_schema=False)
def menu_page():
    return FileResponse(STATIC_DIR / "menu.html")


@app.get("/checkout", include_in_schema=False)
def checkout_page():
    return FileResponse(STATIC_DIR / "checkout.html")


@app.get("/reserve", include_in_schema=False)
def reserve_page():
    return FileResponse(STATIC_DIR / "reserve.html")


@app.get("/admin", include_in_schema=False)
def admin_page():
    return FileResponse(STATIC_DIR / "admin.html")


# ---------- General APIs ----------


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/menu")
def list_menu():
    return get_menu()


# ---------- Authentication APIs ----------


@app.post("/api/auth/register")
def register(data: RegisterRequest):
    full_name = data.full_name.strip()
    email = str(data.email).lower().strip()

    if len(full_name) < 2:
        raise HTTPException(
            status_code=400,
            detail="Full name must contain at least 2 characters.",
        )

    if len(data.password) < 6:
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least 6 characters.",
        )

    with Session(engine) as session:
        existing_user = session.scalar(
            select(User).where(User.email == email)
        )

        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="An account with this email already exists.",
            )

        user = User(
            full_name=full_name,
            email=email,
            password_hash=hash_password(data.password),
            is_admin=False,
        )

        session.add(user)
        session.commit()
        session.refresh(user)

        token = create_access_token(
            user_id=user.id,
            email=user.email,
        )

        return {
            "message": "Account created successfully.",
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "full_name": user.full_name,
                "email": user.email,
                "is_admin": user.is_admin,
            },
        }


@app.post("/api/auth/login")
def login(data: LoginRequest):
    email = str(data.email).lower().strip()

    with Session(engine) as session:
        user = session.scalar(
            select(User).where(User.email == email)
        )

        if not user:
            raise HTTPException(
                status_code=401,
                detail="Incorrect email or password.",
            )

        password_is_valid = verify_password(
            data.password,
            user.password_hash,
        )

        if not password_is_valid:
            raise HTTPException(
                status_code=401,
                detail="Incorrect email or password.",
            )

        token = create_access_token(
            user_id=user.id,
            email=user.email,
        )

        return {
            "message": "Login successful.",
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "full_name": user.full_name,
                "email": user.email,
                "is_admin": user.is_admin,
            },
        }


# ---------- Orders APIs ----------


@app.post("/api/orders")
def create_order(
    data: CreateOrderRequest,
    current_user: User = Depends(get_current_user),
):
    requested_ids = [item.id for item in data.items]

    if len(requested_ids) != len(set(requested_ids)):
        raise HTTPException(
            status_code=400,
            detail="The order contains a duplicated menu item.",
        )

    with Session(engine) as session:
        menu_items = session.scalars(
            select(MenuItem).where(MenuItem.id.in_(requested_ids))
        ).all()

        menu_by_id = {
            menu_item.id: menu_item
            for menu_item in menu_items
        }

        missing_ids = [
            item_id
            for item_id in requested_ids
            if item_id not in menu_by_id
        ]

        if missing_ids:
            raise HTTPException(
                status_code=400,
                detail="One or more menu items were not found.",
            )

        order_items = []
        total = 0.0

        for requested_item in data.items:
            menu_item = menu_by_id[requested_item.id]
            item_price = float(menu_item.price)
            item_total = item_price * requested_item.quantity

            total += item_total

            order_items.append(
                OrderItem(
                    item_name=menu_item.name,
                    price=item_price,
                    quantity=requested_item.quantity,
                )
            )

        order = Order(
            user_id=current_user.id,
            total=round(total, 2),
            status="Received",
            items=order_items,
        )

        session.add(order)
        session.commit()
        session.refresh(order)

        return {
            "message": "Order placed successfully.",
            "order": {
                "id": order.id,
                "total": order.total,
                "status": order.status,
                "items": [
                    {
                        "item_name": item.item_name,
                        "price": item.price,
                        "quantity": item.quantity,
                    }
                    for item in order.items
                ],
            },
        }


@app.get("/api/orders")
def list_my_orders(
    current_user: User = Depends(get_current_user),
):
    with Session(engine) as session:
        orders = session.scalars(
            select(Order)
            .where(Order.user_id == current_user.id)
            .order_by(Order.created_at.desc())
        ).all()

        return [
            {
                "id": order.id,
                "total": order.total,
                "status": order.status,
                "created_at": order.created_at.isoformat(),
                "items": [
                    {
                        "item_name": item.item_name,
                        "price": item.price,
                        "quantity": item.quantity,
                    }
                    for item in order.items
                ],
            }
            for order in orders
        ]


# ---------- Reservations APIs ----------


@app.get("/api/reservations/availability")
def reservation_availability(
    date: str,
    time: str,
):
    with Session(engine) as session:
        reservations = session.scalars(
            select(Reservation).where(
                Reservation.date == date,
                Reservation.time == time,
            )
        ).all()

        booked_tables = [
            reservation.table_number
            for reservation in reservations
        ]

        return {
            "date": date,
            "time": time,
            "booked_tables": booked_tables,
        }


@app.post("/api/reservations")
def create_reservation(
    data: ReservationRequest,
    current_user: User = Depends(get_current_user),
):
    name = data.name.strip()
    phone = data.phone.strip()

    if len(name) < 2:
        raise HTTPException(
            status_code=400,
            detail="Name must contain at least 2 characters.",
        )

    if len(phone) < 6:
        raise HTTPException(
            status_code=400,
            detail="Please enter a valid phone number.",
        )

    with Session(engine) as session:
        existing_reservation = session.scalar(
            select(Reservation).where(
                Reservation.date == data.date,
                Reservation.time == data.time,
                Reservation.table_number == data.table_number,
            )
        )

        if existing_reservation:
            raise HTTPException(
                status_code=409,
                detail="This table is already booked for this time.",
            )

        reservation = Reservation(
            user_id=current_user.id,
            name=name,
            phone=phone,
            date=data.date,
            time=data.time,
            guests=data.guests,
            table_number=data.table_number,
        )

        session.add(reservation)
        session.commit()
        session.refresh(reservation)

        return {
            "message": "Table reserved successfully.",
            "reservation": {
                "id": reservation.id,
                "name": reservation.name,
                "date": reservation.date,
                "time": reservation.time,
                "guests": reservation.guests,
                "table_number": reservation.table_number,
            },
        }


# ---------- Admin dashboard API ----------


@app.get("/api/admin/dashboard")
def admin_dashboard(
    current_admin: User = Depends(get_current_admin),
):
    with Session(engine) as session:
        total_orders = session.scalar(
            select(func.count(Order.id))
        ) or 0

        total_sales = session.scalar(
            select(func.coalesce(func.sum(Order.total), 0))
        ) or 0

        total_reservations = session.scalar(
            select(func.count(Reservation.id))
        ) or 0

        total_users = session.scalar(
            select(func.count(User.id))
        ) or 0

        recent_orders = session.scalars(
            select(Order)
            .order_by(Order.created_at.desc())
            .limit(8)
        ).all()

        recent_reservations = session.scalars(
            select(Reservation)
            .order_by(Reservation.created_at.desc())
            .limit(8)
        ).all()

        sales_by_day_rows = session.execute(
            select(
                func.date(Order.created_at),
                func.coalesce(func.sum(Order.total), 0),
            )
            .group_by(func.date(Order.created_at))
            .order_by(func.date(Order.created_at))
            .limit(7)
        ).all()

        return {
            "admin": {
                "id": current_admin.id,
                "full_name": current_admin.full_name,
                "email": current_admin.email,
                "is_admin": current_admin.is_admin,
            },
            "stats": {
                "total_orders": total_orders,
                "total_sales": round(float(total_sales), 2),
                "total_reservations": total_reservations,
                "total_users": total_users,
            },
            "recent_orders": [
                {
                    "id": order.id,
                    "user_id": order.user_id,
                    "total": order.total,
                    "status": order.status,
                    "created_at": order.created_at.isoformat(),
                }
                for order in recent_orders
            ],
            "recent_reservations": [
                {
                    "id": reservation.id,
                    "name": reservation.name,
                    "phone": reservation.phone,
                    "date": reservation.date,
                    "time": reservation.time,
                    "guests": reservation.guests,
                    "table_number": reservation.table_number,
                    "created_at": reservation.created_at.isoformat(),
                }
                for reservation in recent_reservations
            ],
            "sales_by_day": [
                {
                    "date": str(day),
                    "total": round(float(total), 2),
                }
                for day, total in sales_by_day_rows
            ],
        }
