import e from "express";
import Inquiry from "../models/Inquiry.js";
import Property from "../models/Property.js";
import User from "../models/User.js";
import { sendSMS } from "../utils/sendSMS.js";

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
      .limit(Number(limit))
      .skip(skip)
      .sort({ createdAt: -1 });

    const count = await Inquiry.countDocuments();

    res.status(200).json({
      success: true,
      data: inquiries,
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
      .populate('propertyId');

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found',
      });
    }

    res.status(200).json({
      success: true,
      data: inquiry,
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

    // Send SMS to the agent
    const agent = await User.findById(property.ownerId);
    if (agent && agent.phoneNumber) {
      try {
        // Format phone number to international format (e.g., +256700123456)
        const formatPhoneNumber = (phone) => {
          let cleaned = phone.replace(/[\s\-()]/g, '');
          if (!cleaned.startsWith('+')) {
            if (cleaned.startsWith('0')) {
              cleaned = '+256' + cleaned.substring(1);
            } else if (!cleaned.startsWith('256')) {
              cleaned = '+256' + cleaned;
            } else {
              cleaned = '+' + cleaned;
            }
          }
          return cleaned;
        };
        
        const smsMessage = `New inquiry on DM Link for your property "${property.title}": ${message} Client Phone: ${req.user.phoneNumber}`;
        const formattedPhone = formatPhoneNumber(agent.phoneNumber);
        console.log("Sending SMS to agent:", formattedPhone);
        await sendSMS({ to: "+255625358254", message: smsMessage });
        console.log("SMS sent to agent:", agent.phoneNumber);
      } catch (smsError) {
        console.error("Failed to send SMS to agent:", smsError);
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

    return res.status(201).json({
      success: true,
      data: inquiry,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
