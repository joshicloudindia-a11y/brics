import mongoose from "mongoose";

const SpeakerSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  image: {
    type: String,
    required: false // Image is optional at creation, but can be required if needed
  },
  firstname: {
    type: String,
    required: true
  },
  lastname: {
    type: String,
    required: false
  },
  middlename: {
    type: String,
    required: false
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  organizationName: {
    type: String,
    required: false
  },
  designation: {
    type: String,
    required: false
  },
  professional_title: {
    type: String,
    required: false
  },
  country: {
    type: String,
    required: false
  },
  photoIdType: {
    type: String,
    required: false,
    enum: ['passport', 'national_id', 'driving_license', 'other']
  },
  photoIdNumber: {
    type: String,
    required: false
  },
  passportType: {
    type: String,
    required: false
  },
  passportNumber: {
    type: String,
    required: false
  },
  placeOfIssue: {
    type: String,
    required: false
  },
  passportExpiry: {
    type: Date,
    required: false
  },
  passportDocument: {
    type: String,
    required: false // S3 key for passport document upload
  },
  blood_group: {
    type: String,
    required: false
  },
  dietary_preferences: {
    type: String,
    required: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Speaker', SpeakerSchema);
