import Speaker from "../models/Speaker.js";
import User from "../models/User.js";
import { uploadToS3, getSignedS3Url } from "../config/uploadToS3.js";
import { v4 as uuidv4 } from "uuid";
import { sendPushNotification } from "../utils/notification.js"; 

export const createSpeaker = async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.user_id });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let imageUrl = null;
    if (req.files?.photo?.[0]) {
      const imageKey = await uploadToS3(
        req.files.photo[0],
        user.id,
        "speaker-images"
      );
      imageUrl = imageKey;
    } else if (req.body.photo) {
      const imageKey = await uploadToS3(
        req.body.photo,
        user.id,
        "speaker-images"
      );
      imageUrl = imageKey;
    }

    let passportDocumentUrl = null;
    if (req.files?.passport_document?.[0]) {
      const documentKey = await uploadToS3(
        req.files.passport_document[0],
        user.id,
        "speaker-passports"
      );
      passportDocumentUrl = documentKey;
    } else if (req.body.passport_document) {
      const documentKey = await uploadToS3(
        req.body.passportDocument_base64,
        user.id,
        "speaker-passports"
      );
      passportDocumentUrl = documentKey;
    }

    const speaker = new Speaker({
      id: uuidv4(),
      image: imageUrl,
      firstname: req.body.firstname,
      lastname: req.body.lastname,
      middlename: req.body.middlename,
      email: req.body.email,
      organizationName: req.body.organizationName,
      designation: req.body.designation,
      professional_title: req.body.professional_title,
      country: req.body.country,
      blood_group: req.body.blood_group || req.body.bloodGroup || null,
      dietary_preferences: req.body.dietary_preferences || req.body.dietaryPreferences || null,
      photoIdType: req.body.photoIdType,
      photoIdNumber: req.body.photoIdNumber,
      passportType: req.body.passportType,
      passportNumber: req.body.passportNumber,
      placeOfIssue: req.body.placeOfIssue,
      passportExpiry: req.body.passportExpiry ? new Date(req.body.passportExpiry) : null,
      passportDocument: passportDocumentUrl,
      createdBy: user._id
    });

    await speaker.save();

    try {
      if (user && user.fcm_token) {
        const speakerName = `${speaker.firstname} ${speaker.lastname || ''}`.trim();
        await sendPushNotification(
          user.fcm_token,
          "Speaker Profile Created 🎙️",
          `Speaker ${speakerName} Profile created / updated.`
        );
        console.log(`✅ Push sent to Creator (${user.email}) regarding Speaker Creation.`);
      }
    } catch (pushErr) {
      console.error("❌ Failed to push Speaker Creation notice:", pushErr.message);
    }

    return res.status(201).json({
      message: "Speaker created successfully",
      speaker
    });
  } catch (error) {
    console.error("Error creating speaker:", error);
    return res.status(500).json({
      message: "Failed to create speaker",
      error: error.message
    });
  }
};

export const getAllSpeakers = async (req, res) => {
  try {
    const speakers = await Speaker.find().populate('createdBy', 'firstname lastname email').sort({ createdAt: -1 });

    const enhancedSpeakers = await Promise.all(speakers.map(async (speaker) => {
      const speakerObj = speaker.toObject();
      
      speakerObj.fullName = `${speakerObj.firstname} ${speakerObj.middlename ? speakerObj.middlename + ' ' : ''}${speakerObj.lastname}`.trim();
      
      if (speakerObj.image) {
        try {
          speakerObj.image = await getSignedS3Url(speakerObj.image);
        } catch (err) {
          console.error("Error generating signed URL for speaker image:", err);
        }
      }
      
      if (speakerObj.passportDocument) {
        try {
          speakerObj.passportDocument = await getSignedS3Url(speakerObj.passportDocument);
        } catch (err) {
          console.error("Error generating signed URL for speaker passport:", err);
        }
      }
      
      speakerObj.identification = {
        photoIdType: speakerObj.photoIdType || null,
        photoIdNumber: speakerObj.photoIdNumber || null,
        country: speakerObj.country || null
      };
      
      speakerObj.passportDetails = {
        passportType: speakerObj.passportType || null,
        passportNumber: speakerObj.passportNumber || null,
        placeOfIssue: speakerObj.placeOfIssue || null,
        passportExpiry: speakerObj.passportExpiry || null,
        passportDocument: speakerObj.passportDocument || null
      };
      
      speakerObj.professionalDetails = {
        professional_title: speakerObj.professional_title || null,
        designation: speakerObj.designation || null,
        organizationName: speakerObj.organizationName || null
      };
      
      return speakerObj;
    }));

    return res.status(200).json({
      message: "Speakers retrieved successfully",
      count: enhancedSpeakers.length,
      speakers: enhancedSpeakers
    });
  } catch (error) {
    console.error("Error fetching speakers:", error);
    return res.status(500).json({
      message: "Failed to fetch speakers",
      error: error.message
    });
  }
};

export const getSpeakerById = async (req, res) => {
  try {
    const { speakerId } = req.params;

    const speaker = await Speaker.findOne({ id: speakerId }).populate('createdBy', 'firstname lastname email');

    if (!speaker) {
      return res.status(404).json({ message: "Speaker not found" });
    }

    const speakerObj = speaker.toObject();
    
    speakerObj.fullName = `${speakerObj.firstname} ${speakerObj.middlename ? speakerObj.middlename + ' ' : ''}${speakerObj.lastname}`.trim();
    
    if (speakerObj.image) {
      try {
        speakerObj.image = await getSignedS3Url(speakerObj.image);
      } catch (err) {
        console.error("Error generating signed URL for speaker image:", err);
      }
    }
    
    if (speakerObj.passportDocument) {
      try {
        speakerObj.passportDocument = await getSignedS3Url(speakerObj.passportDocument);
      } catch (err) {
        console.error("Error generating signed URL for speaker passport:", err);
      }
    }
    
    speakerObj.identification = {
      photoIdType: speakerObj.photoIdType || null,
      photoIdNumber: speakerObj.photoIdNumber || null,
      country: speakerObj.country || null
    };
    
    speakerObj.passportDetails = {
      passportType: speakerObj.passportType || null,
      passportNumber: speakerObj.passportNumber || null,
      placeOfIssue: speakerObj.placeOfIssue || null,
      passportExpiry: speakerObj.passportExpiry || null,
      passportDocument: speakerObj.passportDocument || null
    };
    
    speakerObj.professionalDetails = {
      professional_title: speakerObj.professional_title || null,
      designation: speakerObj.designation || null,
      organizationName: speakerObj.organizationName || null
    };

    return res.status(200).json({
      message: "Speaker retrieved successfully",
      speaker: speakerObj
    });
  } catch (error) {
    console.error("Error fetching speaker:", error);
    return res.status(500).json({
      message: "Failed to fetch speaker",
      error: error.message
    });
  }
};

export const updateSpeaker = async (req, res) => {
  try {
    const { speakerId } = req.params;
    const user = await User.findOne({ id: req.user.user_id });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const speaker = await Speaker.findOne({ id: speakerId });
    if (!speaker) {
      return res.status(404).json({ message: "Speaker not found" });
    }

    if (req.files?.photo?.[0]) {
      const imageKey = await uploadToS3(
        req.files.photo[0],
        user.id,
        "speaker-images"
      );
      req.body.image = imageKey;
    } else if (req.body.photo) {
      const imageKey = await uploadToS3(
        req.body.photo,
        user.id,
        "speaker-images"
      );
      req.body.image = imageKey;
    }

    if (req.files?.passport_document?.[0]) {
      const documentKey = await uploadToS3(
        req.files.passport_document[0],
        user.id,
        "speaker-passports"
      );
      req.body.passportDocument = documentKey;
    } else if (req.body.passport_document) {
      const documentKey = await uploadToS3(
        req.body.passport_document,
        user.id,
        "speaker-passports"
      );
      req.body.passportDocument = documentKey;
    }

    if (req.body.passportExpiry) {
      req.body.passportExpiry = new Date(req.body.passportExpiry);
    }

    if (req.body.bloodGroup !== undefined && req.body.blood_group === undefined) {
      req.body.blood_group = req.body.bloodGroup;
    }
    if (req.body.dietaryPreferences !== undefined && req.body.dietary_preferences === undefined) {
      req.body.dietary_preferences = req.body.dietaryPreferences;
    }

    const allowedUpdates = [
      "image",
      "firstname",
      "lastname",
      "middlename",
      "email",
      "organizationName",
      "designation",
      "professional_title",
      "country",
      "photoIdType",
      "photoIdNumber",
      "passportType",
      "passportNumber",
      "placeOfIssue",
      "passportExpiry",
      "passportDocument"
      ,"blood_group",
      "dietary_preferences"
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        speaker[field] = req.body[field];
      }
    });

    await speaker.save();

    try {
      if (user && user.fcm_token) {
        const speakerName = `${speaker.firstname} ${speaker.lastname || ''}`.trim();
        await sendPushNotification(
          user.fcm_token,
          "Speaker Profile Updated 🎙️",
          `Speaker ${speakerName} Profile created / updated.`
        );
        console.log(`✅ Push sent to Updater (${user.email}) regarding Speaker Update.`);
      }
    } catch (pushErr) {
      console.error("❌ Failed to push Speaker Update notice:", pushErr.message);
    }

    const speakerObj = speaker.toObject();
    
    speakerObj.fullName = `${speakerObj.firstname} ${speakerObj.middlename ? speakerObj.middlename + ' ' : ''}${speakerObj.lastname}`.trim();
    
    if (speakerObj.image) {
      try {
        speakerObj.image = await getSignedS3Url(speakerObj.image);
      } catch (err) {
        console.error("Error generating signed URL for speaker image:", err);
      }
    }
    
    if (speakerObj.passportDocument) {
      try {
        speakerObj.passportDocument = await getSignedS3Url(speakerObj.passportDocument);
      } catch (err) {
        console.error("Error generating signed URL for speaker passport:", err);
      }
    }
    
    speakerObj.identification = {
      photoIdType: speakerObj.photoIdType || null,
      photoIdNumber: speakerObj.photoIdNumber || null,
      country: speakerObj.country || null
    };
    
    speakerObj.passportDetails = {
      passportType: speakerObj.passportType || null,
      passportNumber: speakerObj.passportNumber || null,
      placeOfIssue: speakerObj.placeOfIssue || null,
      passportExpiry: speakerObj.passportExpiry || null,
      passportDocument: speakerObj.passportDocument || null
    };
    
    speakerObj.professionalDetails = {
      professional_title: speakerObj.professional_title || null,
      designation: speakerObj.designation || null,
      organizationName: speakerObj.organizationName || null
    };

    return res.status(200).json({
      message: "Speaker updated successfully",
      speaker: speakerObj
    });
  } catch (error) {
    console.error("Error updating speaker:", error);
    return res.status(500).json({
      message: "Failed to update speaker",
      error: error.message
    });
  }
};

export const deleteSpeaker = async (req, res) => {
  try {
    const { speakerId } = req.params;

    const speaker = await Speaker.findOne({ id: speakerId });
    if (!speaker) {
      return res.status(404).json({ message: "Speaker not found" });
    }

    await Speaker.findOneAndDelete({ id: speakerId });

    return res.status(200).json({
      message: "Speaker deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting speaker:", error);
    return res.status(500).json({
      message: "Failed to delete speaker",
      error: error.message
    });
  }
};