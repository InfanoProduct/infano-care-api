import { Router } from "express";
import { EnquiryController } from "./enquiry.controller.js";

const router = Router();

router.post("/submit", EnquiryController.submitEnquiry);
router.post("/subscribe", EnquiryController.subscribeNewsletter);

export default router;
