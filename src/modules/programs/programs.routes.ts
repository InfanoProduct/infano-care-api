import { Router } from "express";
import { ProgramsController } from "./programs.controller.js";
import { BatchController } from "./batch.controller.js";
import { authenticate, optionalAuthenticate } from "../../common/middleware/auth.js";

const router = Router();

// User-facing endpoints (list is public/optional-auth, others require login)
router.get("/", optionalAuthenticate, ProgramsController.list);
router.get("/me", authenticate, ProgramsController.me);
router.get("/me/demos", authenticate, ProgramsController.userDemos);
router.get("/demo/booked-slots", ProgramsController.bookedSlots);
router.get("/:programId/batches", optionalAuthenticate, BatchController.listByProgram);
router.get("/:id", optionalAuthenticate, ProgramsController.get);

router.post("/:id/enroll", authenticate, ProgramsController.enroll);
router.post("/demo/book", optionalAuthenticate, ProgramsController.bookDemo);

export default router;
