import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    user_code: {
      type: String,
      sparse: true,
      unique: true
    },

    role_id: {
      type: String,
      required: true,
      index: true
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true
    },

    password_hash: {
      type: String,
      required: false
    },

    fcm_token: {
      type: String,
      default: null
    },

    title: {
      type: String,
      required: false
    },

    first_name: {
      type: String,
      trim: true
    },

    middle_name: {
      type: String,
      trim: true
    },

    last_name: {
      type: String,
      trim: true
    },

    name: {
      type: String,
      trim: true
    },

    organisation: {
      type: String,
      trim: true
    },

    date_of_birth: {
      type: Date
    },

    position: {
      type: String,
      trim: true
    },

    position_held_since: {
      type: Date
    },

    gender: {
      type: String,
    },

    blood_group: {
      type: String
    },

    medical_conditions: {
      type: String
    },

    dietary_preferences: {
      type: String
    },

    mobile: {
      type: String,
      trim: true
    },

    country: {
      type: String,
      trim: true
    },

    state: {
      type: String,
      trim: true
    },

    city: {
      type: String,
      trim: true
    },

    pincode: {
      type: String,
      trim: true
    },

    full_address: {
      type: String,
      trim: true,
      maxlength: 255
    },

    passport: {
      passport_type: {
        type: String,
        default: 'Ordinary'
      },

      passport_number: {
        type: String,
        trim: true
      },

      place_of_issue: {
        type: String,
        trim: true
      },

      expiry_date: {
        type: Date
      },

      previous_passport_details: {
        type: String
      }
    },

    document_type: {
      type: String
    },

    document_number: {
      type: String
    },

    nationality: {
      type: String
    },

    current_citizenship: {
      type: String
    },

    has_other_citizenship: {
      type: Boolean,
      default: false
    },

    is_oci_card_holder: {
      type: Boolean,
      default: false
    },

    documents: {
      passport_document_url: {
        type: String
      },

      photo_url: {
        type: String
      }
    },

    ministry_name: {
      type: String,
      trim: true
    },

    organization_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      default: null
    },

    organization_name: {
      type: String,
      trim: true,
      default: null
    },

    created_by: {
      type: String 
    },

    registration_source: {
      type: String,
      enum: ['open_invite', 'normal'],
      default: 'normal',
      index: true
    },

    account_status: {
      type: String,
      enum: ['pending', 'active', 'rejected', 'blocked'],
      default: 'active',
      index: true
    },

    deactivated_manually: {
      type: Boolean,
      default: false
    },

    rejection_reason: {
      type: String
    },

    designation: {
      type: String,
      trim: true
    },

    professional_title: {
      type: String,
      required: false
    },

    about_yourself: {
      type: String,
      trim: true,
      maxlength: 500
    },

    social_media: {
      linkedin: {
        type: String,
        trim: true
      },

      youtube: {
        type: String,
        trim: true
      },

      instagram: {
        type: String,
        trim: true
      },

      twitter: {
        type: String,
        trim: true
      }
    },

    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: false
    }

  },
  {
    timestamps: true
  }
);

export default mongoose.model('User', userSchema);