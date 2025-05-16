import express from "express";
import { handleCheckin } from "../controllers/checkin.controller.js";

const router = express.Router();

router.post("/checkin-heartbeat", handleCheckin);

export default router;
