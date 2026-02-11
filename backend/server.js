import "dotenv/config";

import express, { application } from "express";
import cors from "cors";
import session from "express-session";

// STRATEGIES
import passport from "./auth/passport.js";

// MIDDLEWARE
import requireAuth from "./middleware/requireAuth.js";

// ROUTES
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import productRoutes from "./routes/products.js";
import cartRoutes from "./routes/carts.js";
import orderRoutes from "./routes/orders.js";

const app = express();

app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:5000",
    credentials: true,
  }),
);

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // true in production
    },
  }),
);

app.use(passport.initialize());
app.use(passport.session());

// ROUTES
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/products", productRoutes);
app.use("/carts/me", requireAuth, cartRoutes);
app.use("/orders/me", requireAuth, orderRoutes);

app.get("/", (req, res) => {
  res.send("Hello from backend");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server listening on PORT ${PORT}`);
});
