import express, { type Express } from "express";
import cors from "cors";
import { createAuthMiddleware } from "./middleware/auth.middleware";

const app: Express = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health endpoint is public — placed BEFORE auth middleware
app.get("/api/v1/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// All other /api/v1 routes require authentication
app.use("/api/v1", createAuthMiddleware());

app.listen(PORT, () => {
  console.log(`[server] listening on port ${PORT}`);
});

export { app };
