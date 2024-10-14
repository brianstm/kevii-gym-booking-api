import jwt from "jsonwebtoken";
import User from "../models/User";
export const auth = async (req, res, next) => {
    try {
        const token = req.header("Authorization")?.replace("Bearer ", "");
        if (!token) {
            res.status(404).send({ error: "Please authenticate." });
            throw new Error();
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({ _id: decoded._id });
        if (!user) {
            res.status(404).send({ error: "Please authenticate." });
            throw new Error();
        }
        req.user = user;
        next();
    }
    catch (error) {
        res.status(401).send({ error: "Please authenticate." });
    }
};
