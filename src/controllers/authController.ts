import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import User, { IUser } from "../models/User";

const emailPattern = /^E\d{7}@u\.nus\.edu$/;
const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;

interface AuthRequest extends Request {
  user?: IUser;
}

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    if (!emailPattern.test(email)) {
      return res
        .status(400)
        .send({ error: "Invalid email format. Must be E1234567@u.nus.edu" });
    }

    if (!passwordPattern.test(password)) {
      return res.status(400).send({
        error:
          "Password must be at least 8 characters long and include letters and numbers.",
      });
    }

    const user = new User({ email, password, name });
    await user.save();
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET!);
    res.status(201).send({ user, token });
  } catch (error) {
    res.status(400).send(error);
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      throw new Error("Invalid login credentials");
    }

    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      throw new Error("Invalid login credentials");
    }

    const token = jwt.sign(
      { _id: user._id, admin: user.admin },
      process.env.JWT_SECRET!
    );

    res.send({ user, token });
  } catch (error) {
    res.status(400).send({ error });
  }
};

export const getCurrentUser = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const user = await User.findById(req.user!._id).select("-password");
    if (!user) {
      res.status(404).send({ error: "User not found" });
      return;
    }
    res.status(200).send(user);
  } catch (error) {
    res.status(500).send({ error: "Error fetching user profile" });
  }
};

export const updateCurrentUser = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const updates = Object.keys(req.body);
  const allowedUpdates = ["name", "email"];
  const isValidOperation = updates.every((update) =>
    allowedUpdates.includes(update)
  );

  if (!isValidOperation) {
    res.status(400).send({ error: "Invalid updates!" });
    return;
  }

  try {
    const user = await User.findById(req.user!._id);
    if (!user) {
      res.status(404).send({ error: "User not found" });
      return;
    }

    if (req.body.email) {
      const emailPattern = /^E\d{7}@u\.nus\.edu$/;
      if (!emailPattern.test(req.body.email)) {
        res
          .status(400)
          .send({ error: "Invalid email format. Must be E1234567@u.nus.edu" });
        return;
      }
    }

    updates.forEach((update) => {
      user[update as keyof IUser] = req.body[update];
    });

    await user.save();
    const userWithoutPassword = user.toObject();
    delete userWithoutPassword.password;

    res.send(userWithoutPassword);
  } catch (error) {
    res.status(400).send(error);
  }
};

export const getAllUsers = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const users = await User.find({}).select("-password");
    res.status(200).send(users);
  } catch (error) {
    res.status(500).send({ error: "Error fetching users" });
  }
};

export const getUserById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      res.status(404).send({ error: "User not found" });
      return;
    }
    res.status(200).send(user);
  } catch (error) {
    res.status(500).send({ error: "Error fetching user" });
  }
};

export const updateUserById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const updates = Object.keys(req.body);
  const allowedUpdates = ["name", "email", "admin"];
  const isValidOperation = updates.every((update) =>
    allowedUpdates.includes(update)
  );

  if (!isValidOperation) {
    res.status(400).send({ error: "Invalid updates!" });
    return;
  }

  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404).send({ error: "User not found" });
      return;
    }

    if (req.body.email) {
      const emailPattern = /^E\d{7}@u\.nus\.edu$/;
      if (!emailPattern.test(req.body.email)) {
        res
          .status(400)
          .send({ error: "Invalid email format. Must be E1234567@u.nus.edu" });
        return;
      }
    }

    updates.forEach((update) => {
      user[update as keyof IUser] = req.body[update];
    });

    await user.save();
    const userWithoutPassword = user.toObject();
    delete userWithoutPassword.password;

    res.send(userWithoutPassword);
  } catch (error) {
    res.status(400).send(error);
  }
};

export const deleteUser = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      res.status(404).send({ error: "User not found" });
      return;
    }
    res.status(200).send({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).send({ error: "Error deleting user" });
  }
};
