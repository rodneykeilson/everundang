import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import morgan from "morgan";
import invitationsRouter from "./routes/invitations.js";
import { FRONTEND_ORIGINS, FRONTEND_URL, PORT } from "./config.js";
import { initDatabase } from "./db.js";

async function main() {
  await initDatabase();

  const app = express();

  app.use(cors({ origin: FRONTEND_ORIGINS, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan("dev"));

  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  app.use("/api/invitations", invitationsRouter);

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  });

  app.listen(PORT, () => {
    console.log(`Backend listening on port ${PORT}`);
  });
}

main().catch((error) => {
  console.error("Failed to start backend", error);
  process.exit(1);
});
