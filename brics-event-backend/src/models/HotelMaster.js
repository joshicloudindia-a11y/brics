import mongoose from "mongoose";

const hotelMasterSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    name: {
      type: String,
      required: true
    },

    city: {
      type: String,
      required: true
    },

    state: {
      type: String,
      required: true
    },

    address: {
      type: String
    },

    contactName: {
      type: String,
      trim: true,
    },

    contactNumber: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active"
    }
  },
  { timestamps: true }
);

export default mongoose.model("HotelMaster", hotelMasterSchema);