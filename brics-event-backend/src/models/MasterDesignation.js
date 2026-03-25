import mongoose from "mongoose";

const MasterDesignationSchema = new mongoose.Schema(
  {
    designation_name: { type: String, required: true, unique: true, trim: true },
    is_active: { type: Boolean, default: true },
    created_by: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("MasterDesignation", MasterDesignationSchema);
