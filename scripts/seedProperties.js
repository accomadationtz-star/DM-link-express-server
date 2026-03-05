import mongoose from "mongoose";
import dotenv from "dotenv";
import Property from "../models/Property.js";

dotenv.config();

const OWNER_ID = new mongoose.Types.ObjectId("6911bd4745a53dbc617e735a");
const OWNER_USERNAME = "medusa";

const properties = [
  {
    title: "Modern office suites near Kariakoo Market",
    description:
      "Flexible office suites ideal for fintech teams and agencies, close to major transport routes.",
    type: "office",
    purpose: "rent",
    price: 4200000,
    bedrooms: 0,
    area: 180,
    location: {
      region: "Dar es Salaam",
      district: "Ilala",
      street: "Uhuru Street",
    },
    cover: {
      url: "https://picsum.photos/seed/office-uhuru-01/1280/720",
      public_id: "external/picsum/office-uhuru-01",
    },
    media: [
      {
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
        public_id: "external/video/elephants-dream",
        type: "video",
      },
    ],
    ownerId: OWNER_ID,
    ownerUsername: OWNER_USERNAME,
    status: "available",
  },
  {
    title: "Family apartment with city view in Upanga",
    description:
      "Three-bedroom apartment with balcony and reliable water supply, suitable for small families.",
    type: "apartment",
    purpose: "rent",
    price: 2800000,
    bedrooms: 3,
    area: 125,
    location: {
      region: "Dar es Salaam",
      district: "Ilala",
      street: "Upanga East Road",
    },
    cover: {
      url: "https://picsum.photos/seed/apartment-upanga-02/1280/720",
      public_id: "external/picsum/apartment-upanga-02",
    },
    media: [
      {
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        public_id: "external/video/for-bigger-blazes",
        type: "video",
      },
    ],
    ownerId: OWNER_ID,
    ownerUsername: OWNER_USERNAME,
    status: "available",
  },
  {
    title: "Standalone house with parking in Mikocheni",
    description:
      "Well-maintained house with private compound, paved parking, and easy access to schools.",
    type: "house",
    purpose: "sell",
    price: 240000000,
    bedrooms: 4,
    area: 320,
    location: {
      region: "Dar es Salaam",
      district: "Kinondoni",
      street: "Mikocheni B",
    },
    cover: {
      url: "https://picsum.photos/seed/house-mikocheni-03/1280/720",
      public_id: "external/picsum/house-mikocheni-03",
    },
    media: [
      {
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscape.mp4",
        public_id: "external/video/for-bigger-escape",
        type: "video",
      },
    ],
    ownerId: OWNER_ID,
    ownerUsername: OWNER_USERNAME,
    status: "available",
  },
  {
    title: "Boutique hotel block near Coco Beach",
    description:
      "Investment-ready boutique hotel property with reception area and modern finishing.",
    type: "hotel",
    purpose: "sell",
    price: 950000000,
    bedrooms: 18,
    area: 950,
    location: {
      region: "Dar es Salaam",
      district: "Kinondoni",
      street: "Toure Drive",
    },
    cover: {
      url: "https://picsum.photos/seed/hotel-cocobeach-04/1280/720",
      public_id: "external/picsum/hotel-cocobeach-04",
    },
    media: [
      {
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
        public_id: "external/video/for-bigger-fun",
        type: "video",
      },
    ],
    ownerId: OWNER_ID,
    ownerUsername: OWNER_USERNAME,
    status: "available",
  },
  {
    title: "Open-plan office floors in Posta district",
    description:
      "Open-plan office floors with backup power and secure entry system for corporate tenants.",
    type: "office",
    purpose: "rent",
    price: 5600000,
    bedrooms: 0,
    area: 260,
    location: {
      region: "Dar es Salaam",
      district: "Ilala",
      street: "Samora Avenue",
    },
    cover: {
      url: "https://picsum.photos/seed/office-posta-05/1280/720",
      public_id: "external/picsum/office-posta-05",
    },
    media: [
      {
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
        public_id: "external/video/for-bigger-joyrides",
        type: "video",
      },
    ],
    ownerId: OWNER_ID,
    ownerUsername: OWNER_USERNAME,
    status: "available",
  },
  {
    title: "Cozy two-bedroom apartment in Mbezi Beach",
    description:
      "Fully tiled apartment with modern kitchen cabinets and close proximity to the main road.",
    type: "apartment",
    purpose: "rent",
    price: 1800000,
    bedrooms: 2,
    area: 92,
    location: {
      region: "Dar es Salaam",
      district: "Kinondoni",
      street: "Mbezi Beach A",
    },
    cover: {
      url: "https://picsum.photos/seed/apartment-mbezi-06/1280/720",
      public_id: "external/picsum/apartment-mbezi-06",
    },
    media: [
      {
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
        public_id: "external/video/for-bigger-meltdowns",
        type: "video",
      },
    ],
    ownerId: OWNER_ID,
    ownerUsername: OWNER_USERNAME,
    status: "available",
  },
  {
    title: "Executive house compound in Tegeta",
    description:
      "Spacious executive house with servant quarter and landscaped garden in a quiet neighborhood.",
    type: "house",
    purpose: "sell",
    price: 315000000,
    bedrooms: 5,
    area: 410,
    location: {
      region: "Dar es Salaam",
      district: "Kinondoni",
      street: "Tegeta Kibaoni",
    },
    cover: {
      url: "https://picsum.photos/seed/house-tegeta-07/1280/720",
      public_id: "external/picsum/house-tegeta-07",
    },
    media: [
      {
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerScoops.mp4",
        public_id: "external/video/for-bigger-scoops",
        type: "video",
      },
    ],
    ownerId: OWNER_ID,
    ownerUsername: OWNER_USERNAME,
    status: "available",
  },
  {
    title: "Serviced apartment units near Mlimani City",
    description:
      "Serviced apartment units designed for short and long stays with parking and security.",
    type: "apartment",
    purpose: "sell",
    price: 185000000,
    bedrooms: 3,
    area: 138,
    location: {
      region: "Dar es Salaam",
      district: "Kinondoni",
      street: "Sam Nujoma Road",
    },
    cover: {
      url: "https://picsum.photos/seed/apartment-mlimani-08/1280/720",
      public_id: "external/picsum/apartment-mlimani-08",
    },
    media: [
      {
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
        public_id: "external/video/sintel",
        type: "video",
      },
    ],
    ownerId: OWNER_ID,
    ownerUsername: OWNER_USERNAME,
    status: "available",
  },
  {
    title: "Conference-ready office hub in Oysterbay",
    description:
      "Premium office hub with conference rooms, fiber internet, and 24-hour security.",
    type: "office",
    purpose: "rent",
    price: 6700000,
    bedrooms: 0,
    area: 300,
    location: {
      region: "Dar es Salaam",
      district: "Kinondoni",
      street: "Haile Selassie Road",
    },
    cover: {
      url: "https://picsum.photos/seed/office-oysterbay-09/1280/720",
      public_id: "external/picsum/office-oysterbay-09",
    },
    media: [
      {
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
        public_id: "external/video/subaru-outback",
        type: "video",
      },
    ],
    ownerId: OWNER_ID,
    ownerUsername: OWNER_USERNAME,
    status: "available",
  },
  {
    title: "City hotel annex for lease in Kariakoo",
    description:
      "Commercial hotel annex suitable for hospitality operators, positioned in a high-traffic area.",
    type: "hotel",
    purpose: "rent",
    price: 12000000,
    bedrooms: 24,
    area: 1200,
    location: {
      region: "Dar es Salaam",
      district: "Ilala",
      street: "Msimbazi Street",
    },
    cover: {
      url: "https://picsum.photos/seed/hotel-kariakoo-10/1280/720",
      public_id: "external/picsum/hotel-kariakoo-10",
    },
    media: [
      {
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
        public_id: "external/video/tears-of-steel",
        type: "video",
      },
    ],
    ownerId: OWNER_ID,
    ownerUsername: OWNER_USERNAME,
    status: "available",
  },
];

const run = async () => {
  if (!process.env.MONGO_URL) {
    throw new Error("Missing MONGO_URL in .env");
  }

  await mongoose.connect(process.env.MONGO_URL);
  const inserted = await Property.insertMany(properties);
  console.log(`Inserted ${inserted.length} properties for agent: ${OWNER_USERNAME}`);
  await mongoose.disconnect();
};

run()
  .then(() => process.exit(0))
  .catch(async error => {
    console.error("Failed to seed properties:", error.message);
    try {
      await mongoose.disconnect();
    } catch {
      // ignore disconnect errors
    }
    process.exit(1);
  });
