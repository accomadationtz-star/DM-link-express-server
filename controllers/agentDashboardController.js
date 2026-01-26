import Inquiry from "../models/Inquiry.js";
import Property from "../models/Property.js";

/**
 * GET /api/agent/dashboard
 * Agent dashboard summary
 */
export const getAgentDashboard = async (req, res) => {
  try {
    const agentId = req.user._id;

    console.log("Logged-in user:", req.user);
    console.log("AgentId being queried:", agentId.toString());

    /* =========================
       1️⃣ INQUIRY STATISTICS
    ========================= */
    const inquiryStatsPromise = Inquiry.aggregate([
      { $match: { agentId } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    console.log("inquiryStatsPromise:", inquiryStatsPromise);
    /* =========================
       2️⃣ PROPERTY STATISTICS
    ========================= */
    const propertyStatsPromise = Property.aggregate([
      { $match: { ownerId: agentId } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    /* =========================
       3️⃣ RECENT PENDING INQUIRIES (MAX 5)
    ========================= */
    const pendingInquiriesPromise = Inquiry.find({
      agentId,
      status: "pending",
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select(
        "status message createdAt propertySnapshot clientSnapshot"
      );

    const [
      inquiryStatsRaw,
      propertyStatsRaw,
      pendingInquiries,
    ] = await Promise.all([
      inquiryStatsPromise,
      propertyStatsPromise,
      pendingInquiriesPromise,
    ]);

    /* =========================
       FORMAT INQUIRY STATS
    ========================= */
    const inquiryStats = {
      total: 0,
      pending: 0,
      contacted: 0,
      cancelled: 0,
      booked: 0,
    };

    inquiryStatsRaw.forEach((item) => {
      inquiryStats[item._id] = item.count;
      inquiryStats.total += item.count;
    });

    /* =========================
       FORMAT PROPERTY STATS
    ========================= */
    const propertyStats = {
      total: 0,
      available: 0,
      booked: 0,
      sold: 0,
      rented: 0,
    };

    propertyStatsRaw.forEach((item) => {
      propertyStats[item._id] = item.count;
      propertyStats.total += item.count;
    });

    /* =========================
       RESPONSE
    ========================= */
    return res.status(200).json({
      success: true,
      data: {
        inquiries: inquiryStats,
        properties: propertyStats,
        recentPendingInquiries: pendingInquiries,
      },
    });
  } catch (error) {
    console.error("Agent dashboard error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load agent dashboard",
    });
  }
};
