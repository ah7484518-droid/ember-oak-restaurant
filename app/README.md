# Ember & Oak Restaurant

A full-stack restaurant website built with FastAPI, SQLite, SQLAlchemy, HTML, CSS, and JavaScript.

Ember & Oak is a modern wood-fired restaurant demo featuring online ordering, table reservations, JWT authentication, and an admin dashboard.

## Features

- Modern dark warm restaurant design
- Responsive layout for desktop and mobile
- User registration and login
- JWT-based authentication
- Password hashing with PBKDF2-HMAC
- Full restaurant menu
- Search and category filters
- Shopping cart
- Demo checkout flow
- Orders saved in SQLite
- Interactive table reservation floor plan
- Table availability by date and time
- Admin-only dashboard
- Sales statistics
- Recent orders table
- Recent reservations table
- Sales overview chart

## Tech Stack

- Python
- FastAPI
- SQLAlchemy
- SQLite
- PyJWT
- Pydantic
- HTML5
- CSS3
- Vanilla JavaScript

## Project Structure

```text
restaurant-demo/
├── app/
│   ├── auth.py
│   ├── database.py
│   ├── main.py
│   └── static/
│       ├── index.html
│       ├── menu.html
│       ├── checkout.html
│       ├── reserve.html
│       ├── admin.html
│       ├── css/
│       │   ├── style.css
│       │   ├── menu.css
│       │   ├── checkout.css
│       │   ├── reserve.css
│       │   └── admin.css
│       └── js/
│           ├── main.js
│           ├── menu.js
│           ├── checkout.js
│           ├── reserve.js
│           └── admin.js
├── requirements.txt
├── .gitignore
└── README.md
```

## Installation

### 1. Clone the project

Replace `your-github-username` with the actual GitHub username:

```bash
git clone https://github.com/your-github-username/ember-oak-restaurant.git
cd ember-oak-restaurant
```

### 2. Create a virtual environment

#### Windows PowerShell

```powershell
py -m venv venv
.\venv\Scripts\Activate.ps1
```

If PowerShell prevents activation, run:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\venv\Scripts\Activate.ps1
```

#### macOS or Linux

```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

## Run the Application

Start the FastAPI development server:

```bash
uvicorn app.main:app --reload
```

Open the website in your browser:

```text
http://127.0.0.1:8000
```

## Available Pages

| Page | URL |
|---|---|
| Home | `/` |
| Menu | `/menu` |
| Checkout | `/checkout` |
| Reservations | `/reserve` |
| Admin Dashboard | `/admin` |
| API Documentation | `/docs` |
| Health Check | `/api/health` |

## Demo Admin Account

The application creates an admin account automatically on startup.

```text
Email: admin@emberandoak.com
Password: EmberOak!Admin#2026xQ7
```

This account is for local demo purposes only.

## Demo Payment

The checkout page does not process real payments.

Use the following test card:

```text
Card number: 4242 4242 4242 4242
Expiry: 12/30
CVV: 123
```

## API Highlights

### Register

```http
POST /api/auth/register
```

### Login

```http
POST /api/auth/login
```

### Get Menu

```http
GET /api/menu
```

### Create Order

```http
POST /api/orders
```

Requires a valid JWT token.

### Create Reservation

```http
POST /api/reservations
```

Requires a valid JWT token.

### Admin Dashboard

```http
GET /api/admin/dashboard
```

Requires a valid JWT token belonging to an admin user.

## Environment Variables

The admin password can optionally be supplied through an environment variable.

### Windows PowerShell

```powershell
$env:ADMIN_PASSWORD="YourStrongPasswordHere"
uvicorn app.main:app --reload
```

### macOS or Linux

```bash
export ADMIN_PASSWORD="YourStrongPasswordHere"
uvicorn app.main:app --reload
```

If the environment variable is not provided, the application uses the demo password shown in the **Demo Admin Account** section.

## Notes

This is a portfolio and demonstration project. The checkout flow is simulated and does not process real payments.

For production use, the following should be added:

- Secure environment variables
- Production-grade password hashing such as Argon2 or bcrypt
- Proper database migrations
- CSRF protection
- Rate limiting
- HTTPS
- Real payment provider integration
- Email confirmations
- Production deployment configuration

## License

This project is available for portfolio and educational demonstration purposes.
