import express from "express";
import { createInquiry } from "../controllers/inquiryController.js";
import {
   auth, 
   authorize, 
   optionalAuth,
   requireActiveAccount 
} from '../middlewares/authMiddleware.js';


const router = express.Router();

router.post("/", auth, createInquiry);

export default router;
