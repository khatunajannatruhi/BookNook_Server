# 📚 BookNook Server – Express & MongoDB API

The backend server powering **BookNook**, a digital library platform. Built with Express.js and MongoDB native driver, featuring JWT authentication, cookie sessions, atomic copy increment/decrement operations, and strict validation.

---

## 🌐 API Base URL
- **Production URL**: [https://booknook-server.onrender.com](https://booknook-server.onrender.com)
- **Local Dev URL**: `http://localhost:5000`

---

## ⚡ API Endpoints (8 Core Routes + JWT)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/books` | Public | Fetch books (supports `sort`, `order`, `limit`, and `email` filter) |
| `GET` | `/books/:id` | Public / Protected | Get details of a single book by ID |
| `POST` | `/books` | Protected (JWT) | Add a new book to the library |
| `PATCH` | `/books/:id` | Protected (JWT) | Update book information |
| `DELETE` | `/books/:id` | Protected (JWT) | Remove a book from the library |
| `POST` | `/borrows` | Protected (JWT) | Borrow book (decrements copies by 1, prevents double borrow) |
| `GET` | `/borrows` | Protected (JWT) | Get borrowed books for the logged-in user |
| `DELETE` | `/borrows/:id` | Protected (JWT) | Return borrowed book (increments copies by 1, deletes record) |
| `POST` | `/jwt` | Public | Generate JWT authentication token and set httpOnly cookie |
| `POST` | `/jwt/logout` | Public | Clear JWT token cookie |

---

## 🛡️ Security & Features
- **JWT Protection**: Secure cookie verification (`verifyToken` middleware) with Authorization header fallback.
- **Atomic MongoDB Operations**: `$inc` operator for accurate inventory tracking when borrowing or returning books.
- **Double-Borrow Prevention**: Validates active borrows before approving a new borrow request.
- **CORS Support**: Configured for local development (`localhost:3000`) and deployed Vercel frontends.

---

## 🛠️ Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (Official Node Driver)
- **Authentication**: JSON Web Token (`jsonwebtoken`)
- **Cookie Parsing**: `cookie-parser`
- **Environment Config**: `dotenv`
- **CORS**: `cors`

---

## 🚀 Local Setup & Installation

### 1. Clone the repository
```bash
git clone https://github.com/khatunajannatruhi/BookNook_Server.git
cd BookNook_Server
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=booknook_jwt_secret_key_2024_very_secure
CLIENT_URL=http://localhost:3000
```

### 4. Start the server
```bash
npm start
```
Server runs on port 5000 by default.
