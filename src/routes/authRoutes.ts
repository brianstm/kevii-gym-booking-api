import express from "express";
import {
  register,
  login,
  getCurrentUser,
  updateCurrentUser,
  getAllUsers,
  getUserById,
  updateUserById,
  deleteUser,
} from "../controllers/authController";
import { auth, isAdmin } from "../middleware/auth";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", auth, getCurrentUser);
router.patch("/me", auth, updateCurrentUser);
router.get("/users", auth, isAdmin, getAllUsers);
router.get("/users/:id", auth, isAdmin, getUserById);
router.patch("/users/:id", auth, isAdmin, updateUserById);
router.delete("/users/:id", auth, isAdmin, deleteUser);

export default router;
