import { Request, Response } from "express";
import User, { IUser } from "../models/User";
import Demerit from "../models/Demerit";

interface SuspensionRequest {
  userId?: string;
  days?: number;
  reason?: string;
  autoSuspend?: boolean;
}

interface AuthRequest extends Request {
  user?: IUser;
}

export class SuspensionController {
  // Suspend a user manually or automatically based on demerit points
  static async suspendUser(req: Request, res: Response): Promise<void> {
    try {
      const {
        userId,
        days,
        reason,
        autoSuspend = false,
      }: SuspensionRequest = req.body;

      // Validate required fields for manual suspension
      if (!autoSuspend && (!userId || !days || !reason)) {
        res.status(400).send({
          error:
            "Missing required fields. Please provide userId, days, and reason.",
        });
        return;
      }

      let suspensionData;

      if (autoSuspend) {
        // Auto-suspend based on demerit points
        suspensionData = await SuspensionController.handleAutoSuspension(
          userId!
        );
        if (!suspensionData) {
          res
            .status(400)
            .send({ error: "User does not meet auto-suspension criteria" });
          return;
        }
      } else {
        // Manual suspension
        suspensionData = {
          until: new Date(new Date().getTime() + days! * 24 * 60 * 60 * 1000),
          reason: reason,
        };
      }

      const user = await User.findByIdAndUpdate(
        userId,
        {
          suspended: suspensionData,
        },
        { new: true }
      );

      if (!user) {
        res.status(404).send({ error: "User not found" });
        return;
      }

      res.status(200).send({
        message: `User suspended until ${suspensionData.until}`,
        suspension: {
          until: suspensionData.until,
          reason: suspensionData.reason,
        },
        user,
      });
    } catch (error) {
      res.status(500).send({
        error: "Failed to suspend user",
        details: error,
      });
    }
  }

  // Remove suspension from a user
  static async removeSuspension(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const user = await User.findByIdAndUpdate(
        userId,
        {
          $unset: { suspended: "" },
        },
        { new: true }
      );

      if (!user) {
        res.status(404).send({ error: "User not found" });
        return;
      }

      res.status(200).send({
        message: "Suspension removed successfully",
        user,
      });
    } catch (error) {
      res.status(500).send({
        error: "Failed to remove suspension",
        details: error,
      });
    }
  }

  // Get suspension status of a user
  static async getSuspensionStatus(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const user = await User.findById(userId);

      if (!user) {
        res.status(404).send({ error: "User not found" });
        return;
      }

      const isSuspended = user.isSuspended();

      if (isSuspended) {
        res.status(200).send({
          suspended: true,
          details: user.suspended,
          remainingTime: user.suspended?.until
            ? new Date(user.suspended.until).getTime() - new Date().getTime()
            : 0,
        });
      } else {
        res.status(200).send({
          suspended: false,
        });
      }
    } catch (error) {
      res.status(500).send({
        error: "Failed to get suspension status",
        details: error,
      });
    }
  }

  // Handle automatic suspension based on demerit points
  private static async handleAutoSuspension(userId: string) {
    const thirtyDaysAgo = new Date(
      new Date().getTime() - 30 * 24 * 60 * 60 * 1000
    );

    const demerits = await Demerit.find({
      user: userId,
      checkedAt: { $gte: thirtyDaysAgo },
    });

    const totalPoints = demerits.reduce(
      (sum, demerit) => sum + demerit.points,
      0
    );

    if (totalPoints > 15) {
      return {
        until: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000),
        reason: `Automatic suspension due to excessive demerit points (${totalPoints} points)`,
      };
    } else if (totalPoints > 10) {
      return {
        until: new Date(new Date().getTime() + 14 * 24 * 60 * 60 * 1000),
        reason: `Automatic suspension due to high demerit points (${totalPoints} points)`,
      };
    } else if (totalPoints > 5) {
      return {
        until: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000),
        reason: `Automatic suspension due to demerit points (${totalPoints} points)`,
      };
    }

    return null;
  }

  static async getAllUsersWithSuspensionStatus(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const users = await User.find({});

      const usersWithSuspension = users.map((user) => ({
        _id: user._id,
        email: user.email,
        name: user.name,
        suspended: user.suspended ? true : false,
        suspensionDetails: user.suspended || null,
      }));

      res.status(200).send(usersWithSuspension);
    } catch (error) {
      res.status(500).send({ error: "Failed to fetch users", details: error });
    }
  }

  static async getUserSuspensionStatus(
    req: AuthRequest,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.user!._id;
      const user = await User.findById(userId);

      if (!user) {
        res.status(404).send({ error: "User not found" });
        return;
      }

      const isSuspended = user.isSuspended();

      if (isSuspended) {
        res.status(200).send({
          suspended: true,
          details: user.suspended,
          remainingTime: user.suspended?.until
            ? new Date(user.suspended.until).getTime() - new Date().getTime()
            : 0,
        });
      } else {
        res.status(200).send({ suspended: false });
      }
    } catch (error) {
      res
        .status(500)
        .send({ error: "Failed to get suspension status", details: error });
    }
  }
}
