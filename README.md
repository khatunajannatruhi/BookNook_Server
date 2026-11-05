# 📚 BookNook Server – Express & MongoDB API

The backend server powering **BookNook**, a digital library platform. Built with Express.js and MongoDB native driver, featuring JWT authentication, cookie sessions, atomic copy increment/decrement operations, and strict validation.

---

## 🌐 API Base URL
- **Production URL**: https://book-nook-server-gamma.vercel.app/

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
