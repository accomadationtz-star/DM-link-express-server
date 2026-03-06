import Inquiry from "../models/Inquiry.js";
import Property from "../models/Property.js";
import User from "../models/User.js";
import { sendSMS } from "../utils/sendSMS.js";

const enrichInquiryWithPropertyMeta = (inquiry) => ({
  ...inquiry,
  propertySnapshot: {
    ...inquiry?.propertySnapshot,
    cover: inquiry?.propertyId?.cover,
    purpose: inquiry?.propertyId?.purpose || inquiry?.propertySnapshot?.purpose,
    status: inquiry?.propertyId?.status,
  },
  agentSnapshot: {
    ...inquiry?.agentSnapshot,
    phone: inquiry?.agentId?.phoneNumber,
    phoneNumber: inquiry?.agentId?.phoneNumber,
  },
  clientSnapshot: {
    ...inquiry?.clientSnapshot,
    phone: inquiry?.clientId?.phoneNumber || inquiry?.clientSnapshot?.phone,
    phoneNumber: inquiry?.clientId?.phoneNumber || inquiry?.clientSnapshot?.phoneNumber,
  },
});

/**
 * @desc    Get all inquiries
 * @route   GET /api/inquiries/all
 * @access  Public
 */
export const getAllInquiries = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const inquiries = await Inquiry.find()
      .populate('propertyId', 'title price location purpose status cover')
      .populate('clientId', 'username phoneNumber')
      .populate('agentId', 'username phoneNumber')
      .limit(Number(limit))
      .skip(skip)
      .sort({ createdAt: -1 })
      .lean();

    const enrichedInquiries = inquiries.map(enrichInquiryWithPropertyMeta);

    const count = await Inquiry.countDocuments();

    res.status(200).json({
      success: true,
      data: enrichedInquiries,
      totalPages: Math.ceil(count / limit),
      currentPage: Number(page),
      total: count,
    });
  } catch (error) {
    console.error('Error fetching all inquiries:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Get single inquiry details
 * @route   GET /api/inquiries/:id
 * @access  Public
 */
export const getInquiryDetails = async (req, res) => {
  try {
    const inquiry = await Inquiry.findById(req.params.id)
      .populate('agentId', 'name email phoneNumber')
      .populate('clientId', 'name email phoneNumber')
      .populate('propertyId', 'title price location purpose status cover');

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found',
      });
    }

    res.status(200).json({
      success: true,
      data: enrichInquiryWithPropertyMeta(inquiry.toObject()),
    });
  } catch (error) {
    console.error('Error fetching inquiry:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

export const createInquiry = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log("Authenticated user ID:", userId);
    const { propertyId } = req.body;

    if (!propertyId) {
      return res.status(400).json({
        success: false,
        message: "Property ID is required",
      });
    }

    const property = await Property.findById(propertyId);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    if (["pending", "sold", "rented"].includes(property.status)) {
      return res.status(400).json({
        success: false,
        message: `This property is ${property.status} and unavailable for inquiry`,
      });
    }

    if (property.ownerId.toString() === userId.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot inquire your own property",
      });
    }

    if (!req.user.phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    const intent =
      property.purpose === "rent" ? "rent" : "buy";

    const exists = await Inquiry.findOne({
      propertyId,
      clientId: userId,
      status: { $in: ["pending", "contacted"] },
    });

    if (exists) {
      return res.status(409).json({
        success: false,
        message: "You already have an active inquiry for this property",
      });
    }

    const message =
      intent === "rent"
        ? `Client is requesting to rent this ${property.type}.`
        : `Client is requesting to buy this ${property.type}.`;

    // Send SMS to the agent (non-blocking)
    let smsSent = false;
    const agent = await User.findById(property.ownerId);
    if (agent && agent.phoneNumber) {
      try {
        // Format phone number to Tanzanian international format (+255...)
        const formatPhoneNumber = (phone) => {
          let cleaned = phone.replace(/[\s\-()]/g, '');
          
          // Handle cases: 0712345678, 0612345678, 712345678, 255712345678, +255712345678
          if (cleaned.startsWith('+255')) {
            return cleaned; // Already formatted
          } else if (cleaned.startsWith('255')) {
            return '+' + cleaned; // Add + prefix
          } else if (cleaned.startsWith('0')) {
            return '+255' + cleaned.substring(1); // Replace 0 with +255
          } else if (cleaned.startsWith('6') || cleaned.startsWith('7')) {
            return '+255' + cleaned; // Add +255 prefix
          } else {
            return '+255' + cleaned; // Default: add +255
          }
        };
        
        const smsMessage = `New inquiry on DM Link for your property "${property.title}": ${message} Client Phone: ${req.user.phoneNumber}`;
        const formattedPhone = formatPhoneNumber(agent.phoneNumber);
        console.log("Sending SMS to agent:", formattedPhone);
        await sendSMS({ to: formattedPhone, message: smsMessage });
        console.log("SMS sent successfully to agent:", formattedPhone);
        smsSent = true;
      } catch (smsError) {
        console.error("Failed to send SMS to agent:", smsError);
        // Continue with inquiry creation even if SMS fails
      }
    }
    const inquiry = await Inquiry.create({
      propertyId: property._id,
      agentId: property.ownerId,
      clientId: userId,
      intent,

      propertySnapshot: {
        title: property.title,
        price: property.price,
        purpose: property.purpose,
        location: {
          region: property.location.region,
          district: property.location.district,
        },
      },

      agentSnapshot: {
        username: property.ownerUsername,
      },

      clientSnapshot: {
        username: req.user.username,
        phone: req.user.phoneNumber,
      },

      message,
    });

    await Property.findByIdAndUpdate(
      propertyId,
      { $inc: { inquiryCount: 1 } },
      { new: true }
    );

    return res.status(201).json({
      success: true,
      message: smsSent 
        ? "Inquiry created successfully"
        : "Inquiry created successfully, but SMS notification failed",
      data: inquiry,
      smsNotificationSent: smsSent,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * @desc    Get all inquiries for the current agent
 * @route   GET /api/inquiries/agent
 * @access  Private
 */
export const getAgentInquiries = async (req, res) => {
  try {
    const agentId = req.user.id;
    
    console.log("Fetching inquiries for agent:", agentId);
    
    const inquiries = await Inquiry.find({ agentId })
      .populate('propertyId', 'title price location purpose status cover')
      .populate('clientId', 'username phoneNumber')
      .sort({ createdAt: -1 })
      .lean();

    const enrichedInquiries = inquiries.map(enrichInquiryWithPropertyMeta);
    
    console.log("Found inquiries:", enrichedInquiries.length);
    
    return res.status(200).json({
      success: true,
      message: `Found ${enrichedInquiries.length} inquiries`,
      data: enrichedInquiries,
    });
  } catch (error) {
    console.error("Error fetching agent inquiries:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch inquiries",
    });
  }
};

/**
 * @desc    Get all inquiries created by the current user
 * @route   GET /api/inquiries/user
 * @access  Private
 */
export const getUserInquiries = async (req, res) => {
  try {
    const clientId = req.user.id;
    
    console.log("Fetching inquiries created by user:", clientId);
    
    const inquiries = await Inquiry.find({ clientId })
      .populate('propertyId', 'title price location purpose status cover')
      .populate('agentId', 'username phoneNumber')
      .sort({ createdAt: -1 })
      .lean();

    const enrichedInquiries = inquiries.map(enrichInquiryWithPropertyMeta);
    
    console.log("Found user inquiries:", enrichedInquiries.length);
    
    return res.status(200).json({
      success: true,
      message: `Found ${enrichedInquiries.length} inquiries`,
      data: enrichedInquiries,
    });
  } catch (error) {
    console.error("Error fetching user inquiries:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch inquiries",
    });
  }
};

/**
 * @desc    Get single inquiry detail
 * @route   GET /api/inquiries/:id
 * @access  Private - Agent or Client only
 */
export const getInquiryDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    console.log("Fetching inquiry detail:", id);
    
    const inquiry = await Inquiry.findById(id)
      .populate('propertyId', 'title price location purpose status cover')
      .populate('clientId', 'username phoneNumber')
      .populate('agentId', 'username phoneNumber');
    
    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found",
      });
    }
    
    // Check authorization: only agent or client can view
    if (
      inquiry.agentId._id.toString() !== userId &&
      inquiry.clientId._id.toString() !== userId
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this inquiry",
      });
    }
    
    const enrichedInquiry = enrichInquiryWithPropertyMeta(inquiry.toObject());
    
    console.log("Inquiry detail fetched successfully");
    
    return res.status(200).json({
      success: true,
      message: "Inquiry details fetched",
      data: enrichedInquiry,
    });
  } catch (error) {
    console.error("Error fetching inquiry detail:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch inquiry detail",
    });
  }
};

/**
 * @desc    Update inquiry status
 * @route   PUT /api/inquiries/:id
 * @access  Private - Agent or Client with role-based permissions
 */
export const updateInquiryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.id;
    
    console.log("Updating inquiry status:", id, "->", status);
    
    // Validate status
    const validStatuses = ["pending", "contacted", "booked", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }
    
    // Find inquiry
    const inquiry = await Inquiry.findById(id);
    
    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found",
      });
    }
    
    // Check if user is agent or client
    const isAgent = inquiry.agentId.toString() === userId;
    const isClient = inquiry.clientId.toString() === userId;
    
    // Authorization check
    if (!isAgent && !isClient) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this inquiry",
      });
    }
    
    // Validate status transitions based on role
    const currentStatus = inquiry.status;
    
    if (isClient) {
      // Clients can only update pending inquiries
      if (currentStatus !== "pending") {
        return res.status(403).json({
          success: false,
          message: "You can only update pending inquiries",
        });
      }
      
      // Clients can only mark as contacted or cancelled
      if (status !== "contacted" && status !== "cancelled") {
        return res.status(403).json({
          success: false,
          message: "You can only mark inquiries as contacted or cancelled",
        });
      }
    }
    
    if (isAgent) {
      // Agents can transition: pending → contacted/cancelled, contacted → booked/cancelled
      const validTransitions = {
        pending: ["contacted", "cancelled"],
        contacted: ["booked", "cancelled"],
        booked: [],
        cancelled: [],
      };
      
      if (!validTransitions[currentStatus]?.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Cannot transition from ${currentStatus} to ${status}`,
        });
      }
    }
    
    // Update status
    const oldStatus = inquiry.status;
    inquiry.status = status;
    inquiry.updatedAt = new Date();
    await inquiry.save();
    
    console.log(`Inquiry status updated: ${oldStatus} -> ${status} by ${isAgent ? 'agent' : 'client'}`);
    
    // Send notifications based on status change
    if (status === "contacted" && oldStatus !== "contacted") {
      try {
        const formatPhoneNumber = (phone) => {
          let cleaned = phone.replace(/[\s\-()]/g, '');
          if (cleaned.startsWith('+255')) {
            return cleaned;
          } else if (cleaned.startsWith('255')) {
            return '+' + cleaned;
          } else if (cleaned.startsWith('0')) {
            return '+255' + cleaned.substring(1);
          } else if (cleaned.startsWith('6') || cleaned.startsWith('7')) {
            return '+255' + cleaned;
          } else {
            return '+255' + cleaned;
          }
        };
        
        if (isAgent) {
          // Agent contacted client - notify client
          const client = await User.findById(inquiry.clientId);
          const agent = await User.findById(inquiry.agentId);
          
          if (client?.phoneNumber) {
            const smsMessage = `${agent?.username || 'Agent'} from DM Link has marked your property inquiry as contacted. They will reach out to you soon!`;
            const formattedPhone = formatPhoneNumber(client.phoneNumber);
            await sendSMS({ to: formattedPhone, message: smsMessage });
            console.log("SMS sent to client:", formattedPhone);
          }
        } else if (isClient) {
          // Client contacted agent - notify agent
          const agent = await User.findById(inquiry.agentId);
          const client = await User.findById(inquiry.clientId);
          
          if (agent?.phoneNumber) {
            const smsMessage = `${client?.username || 'A client'} has contacted you regarding your property inquiry. Please follow up!`;
            const formattedPhone = formatPhoneNumber(agent.phoneNumber);
            await sendSMS({ to: formattedPhone, message: smsMessage });
            console.log("SMS sent to agent:", formattedPhone);
          }
        }
      } catch (smsError) {
        console.error("Failed to send SMS notification:", smsError);
        // Continue even if SMS fails
      }
    }
    
    if (status === "booked" && isAgent) {
      try {
        const property = await Property.findById(inquiry.propertyId);
        if (property) {
          property.status = property.purpose === "rent" ? "rented" : "sold";
          await property.save();
          console.log(`Property status updated to ${property.status} from inquiry booking`);
        }
      } catch (error) {
        console.error("Error updating property status:", error);
      }
    }
    
    // Fetch updated inquiry with populated data
    const updatedInquiry = await Inquiry.findById(id)
      .populate('propertyId', 'title price location purpose status cover')
      .populate('clientId', 'username phoneNumber')
      .populate('agentId', 'username phoneNumber');

    const enrichedInquiry = enrichInquiryWithPropertyMeta(updatedInquiry.toObject());
    
    return res.status(200).json({
      success: true,
      message: `Inquiry status updated to ${status}`,
      data: enrichedInquiry,
    });
  } catch (error) {
    console.error("Error updating inquiry status:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update inquiry status",
    });
  }
};

/**
 * @desc    Cancel an inquiry
 * @route   DELETE /api/inquiries/:id
 * @access  Private - Agent only
 */
export const cancelInquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const agentId = req.user.id;
    
    console.log("Cancelling inquiry:", id);
    
    const inquiry = await Inquiry.findById(id);
    
    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found",
      });
    }
    
    if (inquiry.agentId.toString() !== agentId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to cancel this inquiry",
      });
    }
    
    inquiry.status = "cancelled";
    await inquiry.save();
    
    console.log("Inquiry cancelled successfully");
    
    return res.status(200).json({
      success: true,
      message: "Inquiry cancelled successfully",
      data: inquiry,
    });
  } catch (error) {
    console.error("Error cancelling inquiry:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to cancel inquiry",
    });
  }
};
