import { Router } from "express";
import DefaultController from "../controllers/DefaultController";

const router = Router();
router.get("/", DefaultController.getIndex)

export default router;