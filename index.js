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
    // Generate JWT token
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

    // Logout — clear token cookie
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
