import mongoose from "mongoose";

const travelSchema = new mongoose.Schema(
  {
    user_id: {
      type: String,
      required: true,
      index: true
    },

    event_id: {
      // type: String,
      // required: true,
      // index: true
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event", // 👈 model name EXACT
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

    arrival: {
      country_from: String,
      flight_number: String,
      port_of_entry: String,
      arrival_date: Date,
      ticket_url: String,
      has_connecting_flight: {
        type: Boolean,
        default: false
      },
      connecting_flight: {
        flight_number: String,
        port: String,
        date: Date,
        country: String
      }
    },

    departure: {
      country_to: String,
      flight_number: String,
      port_of_exit: String,
      departure_date: Date,
      ticket_url: String,
      has_connecting_flight: {
        type: Boolean,
        default: false
      },
      connecting_flight: {
        flight_number: String,
        port: String,
        date: Date,
        country: String
      }
    },

    status: {
      type: String,
      enum: ["draft", "submitted", "approved"],
      default: "submitted"
    }
  },
  { timestamps: true }
);

travelSchema.index(
  { user_id: 1, event_id: 1 },
  { unique: true }
);

export default mongoose.model("Travel", travelSchema);
