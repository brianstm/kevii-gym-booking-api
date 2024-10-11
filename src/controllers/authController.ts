import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import User, { IUser } from "../models/User";

const emailPattern = /^E\d{7}@u\.nus\.edu$/;
const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;

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
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET!);
    res.send({ user, token });
  } catch (error) {
    res.status(400).send(error);
  }
};
