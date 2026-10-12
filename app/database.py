from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    create_engine,
    select,
)
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    Session,
    mapped_column,
    relationship,
)

DATABASE_URL = "sqlite:///restaurant.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    full_name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(300))
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)


class MenuItem(Base):
    __tablename__ = "menu_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(150))
    description: Mapped[str] = mapped_column(String(400))
    price: Mapped[float] = mapped_column(Float)
    category: Mapped[str] = mapped_column(String(50))
    emoji: Mapped[str] = mapped_column(String(10), default="🍽️")
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    total: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(30), default="Received")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    items: Mapped[list["OrderItem"]] = relationship(
        back_populates="order", cascade="all, delete-orphan"
    )


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"))
    item_name: Mapped[str] = mapped_column(String(150))
    price: Mapped[float] = mapped_column(Float)
    quantity: Mapped[int] = mapped_column(Integer)

    order: Mapped["Order"] = relationship(back_populates="items")


class Reservation(Base):
    __tablename__ = "reservations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(40))
    date: Mapped[str] = mapped_column(String(20))
    time: Mapped[str] = mapped_column(String(10))
    guests: Mapped[int] = mapped_column(Integer)
    table_number: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)


SEED_MENU = [
    # Starters
    {"name": "Burrata & Roasted Tomatoes", "description": "Creamy burrata, slow-roasted tomatoes, basil oil and grilled sourdough.", "price": 9.50, "category": "Starters", "emoji": "🍅", "is_featured": False},
    {"name": "Crispy Calamari", "description": "Lightly dusted calamari with lemon aioli and chili flakes.", "price": 8.90, "category": "Starters", "emoji": "🦑", "is_featured": False},
    {"name": "Wild Mushroom Soup", "description": "Velvety mushroom soup finished with thyme cream.", "price": 7.50, "category": "Starters", "emoji": "🍄", "is_featured": False},
    # Mains
    {"name": "Wood-Fired Ribeye", "description": "300g oak-grilled ribeye, smoked butter, charred greens and fries.", "price": 28.00, "category": "Mains", "emoji": "🥩", "is_featured": True},
    {"name": "Lemon Herb Salmon", "description": "Pan-seared salmon, lemon herb glaze and roasted baby potatoes.", "price": 21.50, "category": "Mains", "emoji": "🐟", "is_featured": True},
    {"name": "Truffle Mushroom Risotto", "description": "Creamy arborio rice, wild mushrooms, parmesan and truffle oil.", "price": 18.00, "category": "Mains", "emoji": "🍚", "is_featured": False},
    {"name": "Smoked BBQ Burger", "description": "Beef patty, smoked cheddar, crispy onions and house BBQ sauce.", "price": 15.50, "category": "Mains", "emoji": "🍔", "is_featured": False},
    # Pizza
    {"name": "Margherita Fiamma", "description": "San Marzano tomatoes, fresh mozzarella and basil on a wood-fired crust.", "price": 12.00, "category": "Pizza", "emoji": "🍕", "is_featured": False},
    {"name": "Spicy Salami Pizza", "description": "Spicy salami, mozzarella, chili honey and fresh oregano.", "price": 14.00, "category": "Pizza", "emoji": "🌶️", "is_featured": True},
    # Desserts
    {"name": "Molten Chocolate Cake", "description": "Warm dark chocolate cake with a liquid center and vanilla cream.", "price": 8.00, "category": "Desserts", "emoji": "🍫", "is_featured": True},
    {"name": "Burnt Basque Cheesecake", "description": "Caramelized top, silky center, served with berry compote.", "price": 7.50, "category": "Desserts", "emoji": "🍰", "is_featured": False},
    # Drinks
    {"name": "Fresh Mint Lemonade", "description": "Squeezed lemons, fresh mint and a touch of honey.", "price": 4.50, "category": "Drinks", "emoji": "🍋", "is_featured": False},
    {"name": "Iced Spiced Latte", "description": "Double espresso, cold milk, cinnamon and brown sugar.", "price": 5.00, "category": "Drinks", "emoji": "☕", "is_featured": False},
]


def seed_menu() -> None:
    """Fill the menu once, only if the table is empty."""
    with Session(engine) as session:
        if session.scalars(select(MenuItem).limit(1)).first():
            return
        session.add_all([MenuItem(**item) for item in SEED_MENU])
        session.commit()


def init_db() -> None:
    """Create all tables and add the starter menu."""
    Base.metadata.create_all(engine)
    seed_menu()


def get_menu() -> list[dict]:
    with Session(engine) as session:
        rows = session.scalars(select(MenuItem).order_by(MenuItem.id)).all()
        return [
            {
                "id": row.id,
                "name": row.name,
                "description": row.description,
                "price": row.price,
                "category": row.category,
                "emoji": row.emoji,
                "is_featured": row.is_featured,
            }
            for row in rows
        ]