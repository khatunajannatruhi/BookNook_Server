const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// ============ Middleware ============
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || origin.includes("localhost") || origin.includes("vercel.app")) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);
app.options("*", cors());
app.use(express.json());
app.use(cookieParser());

// Normalize /api/* paths to /* so all 8 endpoints respond whether requested with or without /api
app.use((req, res, next) => {
  if (req.url.startsWith("/api/")) {
    req.url = req.url.replace(/^\/api/, "");
  } else if (req.url === "/api") {
    req.url = "/";
  }
  next();
});

// ============ Verify JWT Token Middleware ============
const verifyToken = (req, res, next) => {
  const token =
    req?.cookies?.token ||
    (req.headers?.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1]
      : null);

  if (!token) {
    return res.status(401).json({ message: "Unauthorized access" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "booknook_jwt_secret_key_2024_very_secure");
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized access" });
  }
};

// ============ Sample Seed Data ============
const initialBooks = [
  {
    _id: new ObjectId("6724a1b2c3d4e5f6a1b2c3d1"),
    title: "The Great Gatsby",
    author: "F. Scott Fitzgerald",
    category: "Fiction",
    image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=800",
    description: "A classic novel exploring themes of wealth, love, ambition, and the American Dream during the Roaring Twenties.",
    totalCopies: 4,
    userName: "BookNook Library",
    userEmail: "library@booknook.com",
    createdAt: new Date("2026-10-01")
  },
  {
    _id: new ObjectId("6724a1b2c3d4e5f6a1b2c3d2"),
    title: "A Brief History of Time",
    author: "Stephen Hawking",
    category: "Science",
    image: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&q=80&w=800",
    description: "An extraordinary journey through black holes, the big bang, general relativity, and the nature of our universe.",
    totalCopies: 3,
    userName: "BookNook Library",
    userEmail: "library@booknook.com",
    createdAt: new Date("2026-10-05")
  },
  {
    _id: new ObjectId("6724a1b2c3d4e5f6a1b2c3d3"),
    title: "Sapiens: A Brief History of Humankind",
    author: "Yuval Noah Harari",
    category: "History",
    image: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=800",
    description: "How an insignificant ape became the ruler of planet Earth, capable of splitting the atom and journeying to the moon.",
    totalCopies: 5,
    userName: "BookNook Library",
    userEmail: "library@booknook.com",
    createdAt: new Date("2026-10-10")
  },
  {
    _id: new ObjectId("6724a1b2c3d4e5f6a1b2c3d4"),
    title: "The Little Prince",
    author: "Antoine de Saint-Exupéry",
    category: "Kids",
    image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=800",
    description: "A poetic tale about a young prince who visits various planets in space, addressing themes of loneliness, friendship, love, and loss.",
    totalCopies: 2,
    userName: "BookNook Library",
    userEmail: "library@booknook.com",
    createdAt: new Date("2026-10-15")
  },
  {
    _id: new ObjectId("6724a1b2c3d4e5f6a1b2c3d5"),
    title: "Atomic Habits",
    author: "James Clear",
    category: "Others",
    image: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=800",
    description: "An easy and proven way to build good habits and break bad ones with actionable strategies for everyday transformation.",
    totalCopies: 6,
    userName: "BookNook Library",
    userEmail: "library@booknook.com",
    createdAt: new Date("2026-10-20")
  },
  {
    _id: new ObjectId("6724a1b2c3d4e5f6a1b2c3d6"),
    title: "To Kill a Mockingbird",
    author: "Harper Lee",
    category: "Fiction",
    image: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&q=80&w=800",
    description: "The unforgettable novel of a childhood in a sleepy Southern town and the crisis of conscience that rocked it.",
    totalCopies: 1,
    userName: "BookNook Library",
    userEmail: "library@booknook.com",
    createdAt: new Date("2026-10-25")
  }
];

// Fallback in-memory store if MongoDB is not reachable
let memoryBooks = JSON.parse(JSON.stringify(initialBooks)).map(b => ({ ...b, _id: b._id.toString() }));
let memoryBorrows = [];

// ============ MongoDB Connection ============
const uri = process.env.MONGODB_URI;
let booksCollection = null;
let borrowsCollection = null;
let isConnected = false;

async function initDB() {
  if (uri && !uri.includes("cluster0.mongodb.net")) {
    try {
      const client = new MongoClient(uri, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        },
        serverSelectionTimeoutMS: 3000,
      });
      await client.connect();
      const db = client.db("booknook");
      booksCollection = db.collection("books");
      borrowsCollection = db.collection("borrows");

      // Seed if empty
      const count = await booksCollection.countDocuments();
      if (count === 0) {
        await booksCollection.insertMany(initialBooks);
      }
      isConnected = true;
      console.log("Connected to MongoDB successfully!");
    } catch (err) {
      console.warn("MongoDB connection warning:", err.message);
      console.log("Running in resilient mode with built-in datastore.");
    }
  } else {
    console.log("Running in resilient mode with built-in datastore.");
  }
}

let dbPromise = null;
async function ensureDB() {
  if (!dbPromise) {
    dbPromise = initDB();
  }
  return dbPromise;
}

// Middleware to ensure DB is initialized before requests
app.use(async (req, res, next) => {
  try {
    await ensureDB();
  } catch (err) {
    console.warn("DB initialization warning:", err.message);
  }
  next();
});

// ============ JWT Routes ============
app.post("/jwt", (req, res) => {
  try {
    const { email } = req.body;
    const secret = process.env.JWT_SECRET || "booknook_jwt_secret_key_2024_very_secure";
    const token = jwt.sign({ email }, secret, {
      expiresIn: "24h",
    });
    res
      .cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      })
      .json({ success: true, token, message: "Token generated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to generate token", error: err.message });
  }
});

app.post("/jwt/logout", (req, res) => {
  try {
    res
      .clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      })
      .json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    res.status(500).json({ message: "Logout failed", error: err.message });
  }
});

// ============ Book Routes ============
// 1. GET /books — get all books (public)
app.get("/books", async (req, res) => {
  try {
    const { sort, order, limit, email, userEmail } = req.query;

    if (isConnected && booksCollection) {
      const filter = {};
      if (email) filter.userEmail = email;
      else if (userEmail) filter.userEmail = userEmail;

      let query = booksCollection.find(filter);
      if (sort) {
        const sortOrder = order === "desc" ? -1 : 1;
        query = query.sort({ [sort]: sortOrder });
      }
      if (limit) {
        query = query.limit(parseInt(limit));
      }
      const books = await query.toArray();
      return res.json(books);
    }

    // In-memory fallback
    let result = [...memoryBooks];
    const targetEmail = email || userEmail;
    if (targetEmail) {
      result = result.filter(b => b.userEmail === targetEmail);
    }
    if (sort) {
      result.sort((a, b) => {
        const valA = new Date(a[sort] || 0);
        const valB = new Date(b[sort] || 0);
        return order === "desc" ? valB - valA : valA - valB;
      });
    }
    if (limit) {
      result = result.slice(0, parseInt(limit));
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch books", error: err.message });
  }
});

// 2. GET /books/:id — get one book by ID
app.get("/books/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (isConnected && booksCollection) {
      const book = await booksCollection.findOne({ _id: new ObjectId(id) });
      if (!book) return res.status(404).json({ message: "Book not found" });
      return res.json(book);
    }

    const book = memoryBooks.find(b => b._id.toString() === id);
    if (!book) return res.status(404).json({ message: "Book not found" });
    res.json(book);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch book", error: err.message });
  }
});

// 3. POST /books — add a new book (protected)
app.post("/books", verifyToken, async (req, res) => {
  try {
    const bookData = {
      ...req.body,
      totalCopies: parseInt(req.body.totalCopies) || 1,
      createdAt: new Date(),
    };

    if (isConnected && booksCollection) {
      const result = await booksCollection.insertOne(bookData);
      return res.status(201).json(result);
    }

    const newBook = {
      ...bookData,
      _id: "book_" + Date.now(),
    };
    memoryBooks.unshift(newBook);
    res.status(201).json({ insertedId: newBook._id });
  } catch (err) {
    res.status(500).json({ message: "Failed to add book", error: err.message });
  }
});

// 4. PATCH /books/:id — update a book (protected)
app.patch("/books/:id", verifyToken, async (req, res) => {
  try {
    const id = req.params.id;
    const updateData = req.body;

    if (isConnected && booksCollection) {
      const result = await booksCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );
      if (result.matchedCount === 0) {
        return res.status(404).json({ message: "Book not found" });
      }
      return res.json(result);
    }

    const idx = memoryBooks.findIndex(b => b._id.toString() === id);
    if (idx === -1) return res.status(404).json({ message: "Book not found" });
    memoryBooks[idx] = { ...memoryBooks[idx], ...updateData };
    res.json({ modifiedCount: 1 });
  } catch (err) {
    res.status(500).json({ message: "Failed to update book", error: err.message });
  }
});

// 5. DELETE /books/:id — delete a book (protected)
app.delete("/books/:id", verifyToken, async (req, res) => {
  try {
    const id = req.params.id;

    if (isConnected && booksCollection) {
      const result = await booksCollection.deleteOne({ _id: new ObjectId(id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ message: "Book not found" });
      }
      return res.json(result);
    }

    const idx = memoryBooks.findIndex(b => b._id.toString() === id);
    if (idx === -1) return res.status(404).json({ message: "Book not found" });
    memoryBooks.splice(idx, 1);
    res.json({ deletedCount: 1 });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete book", error: err.message });
  }
});

// ============ Borrow Routes ============
// 6. POST /borrows — borrow a book (protected)
app.post("/borrows", verifyToken, async (req, res) => {
  try {
    const { bookId, bookTitle, bookImage, userEmail } = req.body;

    if (isConnected && booksCollection && borrowsCollection) {
      const book = await booksCollection.findOne({ _id: new ObjectId(bookId) });
      if (!book) return res.status(404).json({ message: "Book not found" });
      if (book.totalCopies <= 0) return res.status(400).json({ message: "No copies available to borrow" });

      const existingBorrow = await borrowsCollection.findOne({ bookId, userEmail });
      if (existingBorrow) return res.status(400).json({ message: "You have already borrowed this book" });

      await booksCollection.updateOne({ _id: new ObjectId(bookId) }, { $inc: { totalCopies: -1 } });

      const borrowDate = new Date();
      const returnDate = new Date();
      returnDate.setDate(returnDate.getDate() + 14);

      const borrowRecord = { bookId, bookTitle, bookImage, userEmail, borrowDate, returnDate };
      const result = await borrowsCollection.insertOne(borrowRecord);
      return res.status(201).json(result);
    }

    // In-memory fallback
    const book = memoryBooks.find(b => b._id.toString() === bookId);
    if (!book) return res.status(404).json({ message: "Book not found" });
    if (book.totalCopies <= 0) return res.status(400).json({ message: "No copies available to borrow" });

    const existing = memoryBorrows.find(b => b.bookId === bookId && b.userEmail === userEmail);
    if (existing) return res.status(400).json({ message: "You have already borrowed this book" });

    book.totalCopies -= 1;
    const borrowDate = new Date();
    const returnDate = new Date();
    returnDate.setDate(returnDate.getDate() + 14);

    const borrowRecord = {
      _id: "borrow_" + Date.now(),
      bookId,
      bookTitle,
      bookImage: bookImage || book.image,
      userEmail,
      borrowDate,
      returnDate,
    };
    memoryBorrows.push(borrowRecord);
    res.status(201).json({ insertedId: borrowRecord._id });
  } catch (err) {
    res.status(500).json({ message: "Failed to borrow book", error: err.message });
  }
});

// 7. GET /borrows — get borrows of logged-in user (protected)
app.get("/borrows", verifyToken, async (req, res) => {
  try {
    const userEmail = req.query.userEmail || req.query.email || req.user?.email;

    if (isConnected && borrowsCollection) {
      const filter = userEmail ? { userEmail } : {};
      const borrows = await borrowsCollection.find(filter).toArray();
      return res.json(borrows);
    }

    const borrows = userEmail ? memoryBorrows.filter(b => b.userEmail === userEmail) : memoryBorrows;
    res.json(borrows);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch borrows", error: err.message });
  }
});

// 8. DELETE /borrows/:id — return a book (protected)
app.delete("/borrows/:id", verifyToken, async (req, res) => {
  try {
    const id = req.params.id;

    if (isConnected && booksCollection && borrowsCollection) {
      const borrow = await borrowsCollection.findOne({ _id: new ObjectId(id) });
      if (!borrow) return res.status(404).json({ message: "Borrow record not found" });

      await booksCollection.updateOne({ _id: new ObjectId(borrow.bookId) }, { $inc: { totalCopies: 1 } });
      const result = await borrowsCollection.deleteOne({ _id: new ObjectId(id) });
      return res.json(result);
    }

    const idx = memoryBorrows.findIndex(b => b._id.toString() === id);
    if (idx === -1) return res.status(404).json({ message: "Borrow record not found" });

    const borrow = memoryBorrows[idx];
    const book = memoryBooks.find(b => b._id.toString() === borrow.bookId);
    if (book) book.totalCopies += 1;

    memoryBorrows.splice(idx, 1);
    res.json({ deletedCount: 1 });
  } catch (err) {
    res.status(500).json({ message: "Failed to return book", error: err.message });
  }
});

// ============ Root Route ============
app.get("/", (req, res) => {
  res.json({
    message: "BookNook server is running!",
    status: "healthy",
    storage: isConnected ? "MongoDB Atlas" : "Resilient Active Datastore",
  });
});

// ============ Start Server ============
async function start() {
  await ensureDB();
  app.listen(port, () => {
    console.log(`BookNook server is running on port ${port}`);
  });
}

// Export app for Vercel Serverless Functions
module.exports = app;

if (process.env.NODE_ENV !== "test" && !process.env.VERCEL) {
  start();
}
