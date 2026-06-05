import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import scanRoutes from "./routes/scan.routes.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: "http://localhost:5174" }));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "ai-security-scanner" });
});

app.use("/api/scan", scanRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || "Internal server error"
  });
});

app.listen(env.port, () => {
  console.log(`Security scanner API running on http://localhost:${env.port}`);
});
