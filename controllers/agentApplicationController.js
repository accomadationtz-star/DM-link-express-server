import AgentApplication from "../models/AgentApplication.js";
import User from "../models/User.js";

const allowedStatuses = ["pending", "approved", "rejected"];

const normalizePhone = value => String(value || "").replace(/\D/g, "");

const validateSubmitPayload = body => {
  const errors = [];

  const fullName = String(body.fullName || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const phoneNumber = String(body.phoneNumber || "").trim();
  const experience = String(body.experience || "").trim();
  const licenseNumber = String(body.licenseNumber || "").trim();
  const company = String(body.company || "").trim();
  const about = String(body.about || "").trim();

  if (!fullName || fullName.length < 2) {
    errors.push({ field: "fullName", message: "Full name must be at least 2 characters" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    errors.push({ field: "email", message: "A valid email address is required" });
  }

  const digits = normalizePhone(phoneNumber);
  if (!digits || digits.length < 9 || digits.length > 15) {
    errors.push({ field: "phoneNumber", message: "Phone number must be 9-15 digits" });
  }

  if (!experience) {
    errors.push({ field: "experience", message: "Experience is required" });
  }

  if (!about || about.length < 50 || about.length > 1000) {
    errors.push({ field: "about", message: "About section must be between 50 and 1000 characters" });
  }

  return {
    errors,
    payload: {
      fullName,
      email,
      phoneNumber: digits,
      experience,
      licenseNumber,
      company,
      about,
    },
  };
};

export const submitApplication = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
        data: null,
      });
    }

    const { errors, payload } = validateSubmitPayload(req.body || {});

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        data: null,
      });
    }

    if (user.role === "agent") {
      return res.status(400).json({
        success: false,
        message: "You are already an approved agent",
        data: null,
      });
    }

    const existingApplication = await AgentApplication.findOne({
      userId,
      status: "pending",
    });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: "You already have a pending agent application",
        data: null,
      });
    }

    const application = await AgentApplication.create({
      userId,
      ...payload,
      status: "pending",
    });

    user.agentApplicationStatus = "pending";
    user.agentApplicationDate = application.createdAt;
    user.agentRejectionReason = null;
    await user.save();

    return res.status(201).json({
      success: true,
      message: "Agent application submitted successfully",
      data: {
        applicationId: application._id,
        status: application.status,
        submittedAt: application.createdAt,
      },
    });
  } catch (error) {
    console.error("Error submitting agent application:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit application",
      data: null,
    });
  }
};

export const getApplicationStatus = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
        data: null,
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        data: null,
      });
    }

    if (user.role === "agent") {
      return res.status(200).json({
        success: true,
        data: {
          status: "approved",
          canApply: false,
          approvedAt: user.updatedAt,
        },
      });
    }

    const application = await AgentApplication.findOne({ userId }).sort({ createdAt: -1 });

    if (!application) {
      return res.status(200).json({
        success: true,
        data: {
          status: "none",
          canApply: true,
        },
      });
    }

    const response = {
      status: application.status,
      applicationId: application._id,
      submittedAt: application.createdAt,
      canApply: application.status === "rejected",
    };

    if (application.status === "approved") {
      response.approvedAt = application.reviewedAt;
      response.canApply = false;
    }

    if (application.status === "rejected") {
      response.rejectedAt = application.reviewedAt;
      response.rejectionReason = application.rejectionReason || user.agentRejectionReason || null;
      response.canReapply = true;
    }

    return res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error("Error getting application status:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get application status",
      data: null,
    });
  }
};

export const getAllApplications = async (req, res) => {
  try {
    const status = req.query.status ? String(req.query.status).toLowerCase() : undefined;

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status filter",
        data: null,
      });
    }

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const sort = String(req.query.sort || "createdAt");
    const order = String(req.query.order || "desc").toLowerCase() === "asc" ? 1 : -1;

    const sortableFields = ["createdAt", "reviewedAt", "status", "fullName"];
    const sortField = sortableFields.includes(sort) ? sort : "createdAt";

    const filter = {};
    if (status) {
      filter.status = status;
    }

    const [applications, total] = await Promise.all([
      AgentApplication.find(filter)
        .populate("userId", "username email role")
        .populate("reviewedBy", "username email")
        .sort({ [sortField]: order })
        .skip((page - 1) * limit)
        .limit(limit),
      AgentApplication.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        applications,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit) || 1,
          limit,
        },
      },
    });
  } catch (error) {
    console.error("Error getting all applications:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch applications",
      data: null,
    });
  }
};

export const reviewApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { action, rejectionReason, notes } = req.body || {};
    const adminId = req.user?.id;

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Invalid action. Must be 'approve' or 'reject'",
        data: null,
      });
    }

    if (action === "reject" && !String(rejectionReason || "").trim()) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
        data: null,
      });
    }

    const application = await AgentApplication.findById(applicationId);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
        data: null,
      });
    }

    if (application.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Application has already been ${application.status}`,
        data: null,
      });
    }

    application.status = action === "approve" ? "approved" : "rejected";
    application.reviewedBy = adminId || null;
    application.reviewedAt = new Date();
    application.notes = notes ? String(notes).trim() : null;
    application.rejectionReason =
      action === "reject" ? String(rejectionReason).trim() : null;

    await application.save();

    const user = await User.findById(application.userId);
    if (user) {
      user.agentApplicationStatus = application.status;
      user.agentApplicationDate = application.reviewedAt;
      user.agentRejectionReason =
        application.status === "rejected" ? application.rejectionReason : null;

      if (application.status === "approved") {
        user.role = "agent";
      }

      await user.save();
    }

    return res.status(200).json({
      success: true,
      message: `Application ${action}d successfully`,
      data: {
        applicationId: application._id,
        status: application.status,
        reviewedAt: application.reviewedAt,
      },
    });
  } catch (error) {
    console.error("Error reviewing application:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to review application",
      data: null,
    });
  }
};
