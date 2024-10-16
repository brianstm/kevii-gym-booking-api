import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User, { IUser } from "../models/User";

interface AuthRequest extends Request {
  user?: IUser;
}

export const auth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      res.status(404).send({ error: "No token provided." });
      throw new Error();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      _id: string;
    };

    const user = (await User.findOne({ _id: decoded._id }).lean()) as IUser;

    if (!user) {
      res.status(404).send({ error: "Please authenticate." });
      throw new Error();
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).send({ error: "Please authenticate." });
  }
};

export const isAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res
        .status(403)
        .send({ error: "Access denied, no token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      _id: string;
      admin: boolean;
    };

    if (!decoded.admin) {
      return res.status(403).send({ error: "Access denied, admin only" });
    }

    next();
  } catch (error) {
    res.status(403).send({ error: "Admin privileges required" });
  }
};
