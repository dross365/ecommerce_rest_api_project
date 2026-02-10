import "dotenv/config";

import express from "express";
import cors from "cors";

// ROUTES
import authRoutes from "./routes/auth.js";

const app = express();

app.use(
  cors({
    origin: "http://localhost:5000",
    credentials: true,
  }),
);
app.use(express.json());

// ROUTES
app.use("/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("Hello from backend");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server listening on PORT ${PORT}`);
});
