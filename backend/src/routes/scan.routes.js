import { Router } from "express";
import multer from "multer";
import { scanCode } from "../controllers/scan.controller.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 512 * 1024 }
});

router.post("/", upload.single("file"), scanCode);

export default router;
