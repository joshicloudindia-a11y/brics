import mongoose from "mongoose";

const hotelSchema = new mongoose.Schema(
  {
    user_id: {
      type: String,
      required: true,
      index: true
    },

    event_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true
    },

    user_event_id: {
      type: String,
      required: true,
      index: true
    },

    added_by: {
      type: String
    },

    for_whom: {
      type: String,
      enum: ["MYSELF", "DELEGATE"],
      default: "MYSELF"
    },

    stay_start_date: {
      type: Date,
      required: true
    },

    stay_end_date: {
      type: Date,
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

    hotel_id: {
      type: String,
      required: false,
      ref: "HotelMaster"
    },

    hotel_name: {
      type: String,
    },

    hotel_type: {
      type: String,
      enum: ["master_list", "manual_entry"],
      required: false,
      default: "master_list"
    },
    

    status: {
      type: String,
      enum: ["draft", "submitted", "approved"],
      default: "submitted"
    }
  },
  { timestamps: true }
);

hotelSchema.index(
  { user_id: 1, event_id: 1 },
  { unique: true }
);

export default mongoose.model("Hotel", hotelSchema);