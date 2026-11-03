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
app.use(express.json());
app.use(cookieParser());

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

// ============ MongoDB Connection ============
const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    console.log("Connected to MongoDB successfully!");

    const db = client.db("booknook");
    const booksCollection = db.collection("books");
    const borrowsCollection = db.collection("borrows");

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

        const filter = {};
        if (email) {
          filter.userEmail = email;
        } else if (userEmail) {
          filter.userEmail = userEmail;
        }

        let query = booksCollection.find(filter);

        if (sort) {
          const sortOrder = order === "desc" ? -1 : 1;
          query = query.sort({ [sort]: sortOrder });
        }

        if (limit) {
          query = query.limit(parseInt(limit));
        }

        const books = await query.toArray();
        res.json(books);
      } catch (err) {
        res.status(500).json({ message: "Failed to fetch books", error: err.message });
      }
    });

    // 2. GET /books/:id — get one book by ID
    app.get("/books/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const book = await booksCollection.findOne({ _id: new ObjectId(id) });
        if (!book) {
          return res.status(404).json({ message: "Book not found" });
        }
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
        const result = await booksCollection.insertOne(bookData);
        res.status(201).json(result);
      } catch (err) {
        res.status(500).json({ message: "Failed to add book", error: err.message });
      }
    });

    // 4. PATCH /books/:id — update a book (protected)
    app.patch("/books/:id", verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        const updateData = req.body;
        const result = await booksCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        );
        if (result.matchedCount === 0) {
          return res.status(404).json({ message: "Book not found" });
        }
        res.json(result);
      } catch (err) {
        res.status(500).json({ message: "Failed to update book", error: err.message });
      }
    });

    // 5. DELETE /books/:id — delete a book (protected)
    app.delete("/books/:id", verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        const result = await booksCollection.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) {
          return res.status(404).json({ message: "Book not found" });
        }
        res.json(result);
      } catch (err) {
        res.status(500).json({ message: "Failed to delete book", error: err.message });
      }
    });

    // ============ Borrow Routes ============
    // 6. POST /borrows — borrow a book (protected)
    app.post("/borrows", verifyToken, async (req, res) => {
      try {
        const { bookId, bookTitle, bookImage, userEmail } = req.body;

        // Check if copies > 0
        const book = await booksCollection.findOne({ _id: new ObjectId(bookId) });
        if (!book) {
          return res.status(404).json({ message: "Book not found" });
        }
        if (book.totalCopies <= 0) {
          return res.status(400).json({ message: "No copies available to borrow" });
        }

        // Check if user already borrowed this book (no double borrow)
        const existingBorrow = await borrowsCollection.findOne({
          bookId,
          userEmail,
        });
        if (existingBorrow) {
          return res.status(400).json({ message: "You have already borrowed this book" });
        }

        // Decrease totalCopies by 1
        await booksCollection.updateOne(
          { _id: new ObjectId(bookId) },
          { $inc: { totalCopies: -1 } }
        );

        // Save borrow record
        const borrowDate = new Date();
        const returnDate = new Date();
        returnDate.setDate(returnDate.getDate() + 14);

        const borrowRecord = {
          bookId,
          bookTitle,
          bookImage,
          userEmail,
          borrowDate,
          returnDate,
        };

        const result = await borrowsCollection.insertOne(borrowRecord);
        res.status(201).json(result);
      } catch (err) {
        res.status(500).json({ message: "Failed to borrow book", error: err.message });
      }
    });

    app.get("/", (req, res) => {
      res.json({ message: "BookNook server is running!" });
    });

    app.listen(port, () => {
      console.log(`BookNook server is running on port ${port}`);
    });
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err);
  }
}

run();
