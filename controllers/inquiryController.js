import Inquiry from "../models/Inquiry.js";
import Property from "../models/Property.js";

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
