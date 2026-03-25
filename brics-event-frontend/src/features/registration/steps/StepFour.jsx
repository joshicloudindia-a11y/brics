// import React, { useState,useEffect } from 'react';
// import axios from "axios";
// const StepFour = ({ registrationData }) => {
//   const [copied, setCopied] = useState(false);
//   const [registrationId, setRegistrationId] = useState("");
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");

//   // Generate random registration ID
//   const GenRegistrationId = 'ADS21220025';

//   const handleCopy = () => {
//     navigator.clipboard.writeText(registrationId);
//     setCopied(true);
//     setTimeout(() => setCopied(false), 2000);
//   };

//   useEffect(() => {
//     if (registrationData?.registration_id) {
//       setRegistrationId(registrationData.registration_id);
//       setLoading(false);
//     }
//   }, [registrationData]);

//   return (
//     <div className="space-y-8 py-8">
//       {/* Success Animation */}
//       <div className="flex justify-center">
//         <div className="relative">
//           <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center animate-pulse">
//             <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center">
//               <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
//               </svg>
//             </div>
//           </div>
//           {/* Decorative dots */}
//           <div className="absolute -top-2 -left-2 w-3 h-3 bg-orange-400 rounded-full animate-bounce"></div>
//           <div className="absolute -top-2 -right-2 w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
//           <div className="absolute -bottom-2 -left-2 w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
//           <div className="absolute -bottom-2 -right-2 w-3 h-3 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
//         </div>
//       </div>

//       {/* Thank You Message */}
//       <div className="text-center">
//         <h1 className="text-4xl font-bold text-gray-900 mb-3">Thank You!</h1>
//         <p className="text-lg text-gray-700 font-medium">
//           Your Details have been submitted successfully.
//         </p>
//       </div>

//       {/* Registration ID */}
//       <div className="flex flex-col items-center space-y-3">
//         <p className="text-sm text-gray-600 font-medium">Your Registration ID</p>
//         <div className="flex items-center gap-3 bg-orange-50 border-2 border-orange-300 rounded-lg px-6 py-4">
//           <span className="text-2xl font-bold text-orange-600 tracking-wider">
//             {registrationId}
//           </span>
//           <button
//             onClick={handleCopy}
//             className="p-2 hover:bg-orange-100 rounded transition-colors"
//             title="Copy to clipboard"
//           >
//             {copied ? (
//               <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
//                 <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
//               </svg>
//             ) : (
//               <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
//               </svg>
//             )}
//           </button>
//         </div>
//       </div>

//       {/* Explore Button */}
//       <div className="flex justify-center">
//         <button className="px-8 py-3 border-2 border-[#1e4788] text-[#1e4788] rounded-lg hover:bg-blue-50 font-medium transition-colors">
//           Explore BRICS India 2026
//         </button>
//       </div>

//       {/* Disclaimer */}
//       <div className="max-w-3xl mx-auto">
//         <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
//           <p className="text-sm text-gray-700 text-center leading-relaxed">
//             Issuance of Entry Passes are subject to approval from the secretariat. A separate
//             communication will be sent with entry passes (if approved) at you registered email ID
//           </p>
//         </div>
//       </div>

//       {/* Additional Actions */}
//       {/* <div className="flex justify-center gap-4 pt-4">
//         <button
//           onClick={() => window.print()}
//           className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium flex items-center gap-2"
//         >
//           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
//           </svg>
//           Print
//         </button>
//         <button
//           onClick={() => window.location.href = 'mailto:?subject=My BRICS Registration&body=My Registration ID: ' + registrationId}
//           className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium flex items-center gap-2"
//         >
//           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
//           </svg>
//           Email
//         </button>
//       </div> */}
//     </div>
//   );
// };

// export default StepFour;

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { saveUserProfile } from "../../../services/auth";
import { toast } from "react-toastify";
import { FiUpload } from "react-icons/fi";

// Complete schema matching screenshot
const profileSchema = z.object({
  // Personal Information
  title: z.string().min(1, "Please select title"),
  firstName: z.string().min(2, "First name is required"),
  middleName: z.string().optional(),
  surname: z.string().optional(),
  country: z.string().min(1, "Please select country"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  phoneNumber: z.string().min(10, "Valid phone number required"),
  email: z.string().email("Invalid email address"),
  position: z.string().min(2, "Position is required"),
  positionHeldSince: z.string().optional(),
  gender: z.string().min(1, "Please select gender"),
  bloodGroup: z.string().optional(),
  medicalConditions: z.string().optional(),
  dietaryPreferences: z.string().optional(),

  // Passport Details
  passportType: z.string().min(1, "Please select passport type"),
  passportNumber: z.string().min(5, "Passport number required"),
  placeOfIssue: z.string().min(2, "Place of issue required"),
  passportExpiry: z.string().min(1, "Expiry date required"),

  // Citizenship Details
  nationality: z.string().min(1, "Please select nationality"),
  currentCitizenship: z.string().min(1, "Please select current citizenship"),
  hasOtherCitizenship: z.enum(["yes", "no"]),
  previousCitizenship: z.string().optional(),
  citizenshipFrom: z.string().optional(),
  citizenshipTo: z.string().optional(),

  // OCI Details
  isOCIHolder: z.enum(["yes", "no"]),
  ociName: z.string().optional(),
  ociNumber: z.string().optional(),
  ociIssueDate: z.string().optional(),
  ociPlaceOfIssue: z.string().optional(),

  // Documents
  passportFile: z.any().optional(),
  photoFile: z.any().optional(),
});

const StepFour = ({ onNext, onBack, defaultValues }) => {
  const [passportFile, setPassportFile] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [showPreviousCitizenship, setShowPreviousCitizenship] = useState(false);
  const [showOCIDetails, setShowOCIDetails] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: defaultValues || {
      hasOtherCitizenship: "no",
      isOCIHolder: "no",
    },
  });

  const hasOtherCitizenship = watch("hasOtherCitizenship");
  const isOCIHolder = watch("isOCIHolder");

  React.useEffect(() => {
    setShowPreviousCitizenship(hasOtherCitizenship === "yes");
  }, [hasOtherCitizenship]);

  React.useEffect(() => {
    setShowOCIDetails(isOCIHolder === "yes");
  }, [isOCIHolder]);

  const handleFileUpload = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      if (type === "passport") {
        setPassportFile(file);
        setValue("passportFile", file);
      } else {
        setPhotoFile(file);
        setValue("photoFile", file);
      }
    }
  };

  const titles = [
    { value: "mr", label: "Mr." },
    { value: "mrs", label: "Mrs." },
    { value: "ms", label: "Ms." },
    { value: "dr", label: "Dr." },
    { value: "prof", label: "Prof." },
  ];

  const countries = [
    { value: "afghanistan", label: "Afghanistan" },
    { value: "albania", label: "Albania" },
    { value: "algeria", label: "Algeria" },
    { value: "andorra", label: "Andorra" },
    { value: "angola", label: "Angola" },
    { value: "antigua-and-barbuda", label: "Antigua and Barbuda" },
    { value: "argentina", label: "Argentina" },
    { value: "armenia", label: "Armenia" },
    { value: "australia", label: "Australia" },
    { value: "austria", label: "Austria" },
    { value: "azerbaijan", label: "Azerbaijan" },

    { value: "bahamas", label: "Bahamas" },
    { value: "bahrain", label: "Bahrain" },
    { value: "bangladesh", label: "Bangladesh" },
    { value: "barbados", label: "Barbados" },
    { value: "belarus", label: "Belarus" },
    { value: "belgium", label: "Belgium" },
    { value: "belize", label: "Belize" },
    { value: "benin", label: "Benin" },
    { value: "bhutan", label: "Bhutan" },
    { value: "bolivia", label: "Bolivia" },
    { value: "bosnia-and-herzegovina", label: "Bosnia and Herzegovina" },
    { value: "botswana", label: "Botswana" },
    { value: "brazil", label: "Brazil" },
    { value: "brunei", label: "Brunei" },
    { value: "bulgaria", label: "Bulgaria" },
    { value: "burkina-faso", label: "Burkina Faso" },
    { value: "burundi", label: "Burundi" },

    { value: "cabo-verde", label: "Cabo Verde" },
    { value: "cambodia", label: "Cambodia" },
    { value: "cameroon", label: "Cameroon" },
    { value: "canada", label: "Canada" },
    { value: "central-african-republic", label: "Central African Republic" },
    { value: "chad", label: "Chad" },
    { value: "chile", label: "Chile" },
    { value: "china", label: "China" },
    { value: "colombia", label: "Colombia" },
    { value: "comoros", label: "Comoros" },
    { value: "congo", label: "Congo" },
    { value: "costa-rica", label: "Costa Rica" },
    { value: "croatia", label: "Croatia" },
    { value: "cuba", label: "Cuba" },
    { value: "cyprus", label: "Cyprus" },
    { value: "czech-republic", label: "Czech Republic" },

    { value: "denmark", label: "Denmark" },
    { value: "djibouti", label: "Djibouti" },
    { value: "dominica", label: "Dominica" },
    { value: "dominican-republic", label: "Dominican Republic" },

    { value: "ecuador", label: "Ecuador" },
    { value: "egypt", label: "Egypt" },
    { value: "el-salvador", label: "El Salvador" },
    { value: "equatorial-guinea", label: "Equatorial Guinea" },
    { value: "eritrea", label: "Eritrea" },
    { value: "estonia", label: "Estonia" },
    { value: "eswatini", label: "Eswatini" },
    { value: "ethiopia", label: "Ethiopia" },

    { value: "fiji", label: "Fiji" },
    { value: "finland", label: "Finland" },
    { value: "france", label: "France" },

    { value: "gabon", label: "Gabon" },
    { value: "gambia", label: "Gambia" },
    { value: "georgia", label: "Georgia" },
    { value: "germany", label: "Germany" },
    { value: "ghana", label: "Ghana" },
    { value: "greece", label: "Greece" },
    { value: "grenada", label: "Grenada" },
    { value: "guatemala", label: "Guatemala" },
    { value: "guinea", label: "Guinea" },
    { value: "guinea-bissau", label: "Guinea-Bissau" },
    { value: "guyana", label: "Guyana" },

    { value: "haiti", label: "Haiti" },
    { value: "honduras", label: "Honduras" },
    { value: "hungary", label: "Hungary" },

    { value: "iceland", label: "Iceland" },
    { value: "india", label: "India" },
    { value: "indonesia", label: "Indonesia" },
    { value: "iran", label: "Iran" },
    { value: "iraq", label: "Iraq" },
    { value: "ireland", label: "Ireland" },
    { value: "israel", label: "Israel" },
    { value: "italy", label: "Italy" },

    { value: "jamaica", label: "Jamaica" },
    { value: "japan", label: "Japan" },
    { value: "jordan", label: "Jordan" },

    { value: "kazakhstan", label: "Kazakhstan" },
    { value: "kenya", label: "Kenya" },
    { value: "kiribati", label: "Kiribati" },
    { value: "kuwait", label: "Kuwait" },
    { value: "kyrgyzstan", label: "Kyrgyzstan" },

    { value: "laos", label: "Laos" },
    { value: "latvia", label: "Latvia" },
    { value: "lebanon", label: "Lebanon" },
    { value: "lesotho", label: "Lesotho" },
    { value: "liberia", label: "Liberia" },
    { value: "libya", label: "Libya" },
    { value: "liechtenstein", label: "Liechtenstein" },
    { value: "lithuania", label: "Lithuania" },
    { value: "luxembourg", label: "Luxembourg" },

    { value: "madagascar", label: "Madagascar" },
    { value: "malawi", label: "Malawi" },
    { value: "malaysia", label: "Malaysia" },
    { value: "maldives", label: "Maldives" },
    { value: "mali", label: "Mali" },
    { value: "malta", label: "Malta" },
    { value: "marshall-islands", label: "Marshall Islands" },
    { value: "mauritania", label: "Mauritania" },
    { value: "mauritius", label: "Mauritius" },
    { value: "mexico", label: "Mexico" },
    { value: "micronesia", label: "Micronesia" },
    { value: "moldova", label: "Moldova" },
    { value: "monaco", label: "Monaco" },
    { value: "mongolia", label: "Mongolia" },
    { value: "montenegro", label: "Montenegro" },
    { value: "morocco", label: "Morocco" },
    { value: "mozambique", label: "Mozambique" },
    { value: "myanmar", label: "Myanmar" },

    { value: "namibia", label: "Namibia" },
    { value: "nauru", label: "Nauru" },
    { value: "nepal", label: "Nepal" },
    { value: "netherlands", label: "Netherlands" },
    { value: "new-zealand", label: "New Zealand" },
    { value: "nicaragua", label: "Nicaragua" },
    { value: "niger", label: "Niger" },
    { value: "nigeria", label: "Nigeria" },
    { value: "north-korea", label: "North Korea" },
    { value: "north-macedonia", label: "North Macedonia" },
    { value: "norway", label: "Norway" },

    { value: "oman", label: "Oman" },

    { value: "pakistan", label: "Pakistan" },
    { value: "palau", label: "Palau" },
    { value: "panama", label: "Panama" },
    { value: "papua-new-guinea", label: "Papua New Guinea" },
    { value: "paraguay", label: "Paraguay" },
    { value: "peru", label: "Peru" },
    { value: "philippines", label: "Philippines" },
    { value: "poland", label: "Poland" },
    { value: "portugal", label: "Portugal" },

    { value: "qatar", label: "Qatar" },

    { value: "romania", label: "Romania" },
    { value: "russia", label: "Russia" },
    { value: "rwanda", label: "Rwanda" },

    { value: "saint-kitts-and-nevis", label: "Saint Kitts and Nevis" },
    { value: "saint-lucia", label: "Saint Lucia" },
    {
      value: "saint-vincent-and-the-grenadines",
      label: "Saint Vincent and the Grenadines",
    },
    { value: "samoa", label: "Samoa" },
    { value: "san-marino", label: "San Marino" },
    { value: "sao-tome-and-principe", label: "Sao Tome and Principe" },
    { value: "saudi-arabia", label: "Saudi Arabia" },
    { value: "senegal", label: "Senegal" },
    { value: "serbia", label: "Serbia" },
    { value: "seychelles", label: "Seychelles" },
    { value: "sierra-leone", label: "Sierra Leone" },
    { value: "singapore", label: "Singapore" },
    { value: "slovakia", label: "Slovakia" },
    { value: "slovenia", label: "Slovenia" },
    { value: "solomon-islands", label: "Solomon Islands" },
    { value: "somalia", label: "Somalia" },
    { value: "south-africa", label: "South Africa" },
    { value: "south-korea", label: "South Korea" },
    { value: "south-sudan", label: "South Sudan" },
    { value: "spain", label: "Spain" },
    { value: "sri-lanka", label: "Sri Lanka" },
    { value: "sudan", label: "Sudan" },
    { value: "suriname", label: "Suriname" },
    { value: "sweden", label: "Sweden" },
    { value: "switzerland", label: "Switzerland" },
    { value: "syria", label: "Syria" },

    { value: "taiwan", label: "Taiwan" },
    { value: "tajikistan", label: "Tajikistan" },
    { value: "tanzania", label: "Tanzania" },
    { value: "thailand", label: "Thailand" },
    { value: "timor-leste", label: "Timor-Leste" },
    { value: "togo", label: "Togo" },
    { value: "tonga", label: "Tonga" },
    { value: "trinidad-and-tobago", label: "Trinidad and Tobago" },
    { value: "tunisia", label: "Tunisia" },
    { value: "turkey", label: "Turkey" },
    { value: "turkmenistan", label: "Turkmenistan" },
    { value: "tuvalu", label: "Tuvalu" },

    { value: "uganda", label: "Uganda" },
    { value: "ukraine", label: "Ukraine" },
    { value: "united-arab-emirates", label: "United Arab Emirates" },
    { value: "united-kingdom", label: "United Kingdom" },
    { value: "united-states-of-america", label: "United States of America" },
    { value: "uruguay", label: "Uruguay" },
    { value: "uzbekistan", label: "Uzbekistan" },

    { value: "vanuatu", label: "Vanuatu" },
    { value: "vatican-city", label: "Vatican City" },
    { value: "venezuela", label: "Venezuela" },
    { value: "vietnam", label: "Vietnam" },

    { value: "yemen", label: "Yemen" },

    { value: "zambia", label: "Zambia" },
    { value: "zimbabwe", label: "Zimbabwe" },
  ];

  const bloodGroups = [
    { value: "a+", label: "A+" },
    { value: "a-", label: "A-" },
    { value: "b+", label: "B+" },
    { value: "b-", label: "B-" },
    { value: "o+", label: "O+" },
    { value: "o-", label: "O-" },
    { value: "ab+", label: "AB+" },
    { value: "ab-", label: "AB-" },
  ];

  const passportTypes = [
    { value: "ordinary", label: "Ordinary" },
    { value: "diplomatic", label: "Diplomatic" },
    { value: "official", label: "Official" },
  ];

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        try {
          const payload = {
            user_id: defaultValues.temp_user_id,

            // Personal Info
            title: data.title,
            first_name: data.firstName,
            middle_name: data.middleName || null,
            last_name: data.surname || data.lastName || "",
            organisation: data.country,
            date_of_birth: data.dateOfBirth,
            position: data.position,
            position_held_since: data.positionHeldSince || null,
            gender: data.gender,
            blood_group: data.bloodGroup || null,
            medical_conditions: data.medicalConditions || null,
            dietary_preferences: data.dietaryPreferences || null,

            // Contact
            mobile: data.phoneNumber,
            country: data.country,

            // Passport
            passport_type: data.passportType,
            passport_number: data.passportNumber,
            place_of_issue: data.placeOfIssue,
            passport_expiry_date: data.passportExpiry,

            // Citizenship
            nationality: data.nationality,
            current_citizenship: data.currentCitizenship,
            has_other_citizenship: data.hasOtherCitizenship === "yes",
            is_oci_card_holder: data.isOCIHolder === "yes",

            // Documents (URLs expected – upload handled separately)
            passport_document_url: defaultValues.passport_document_url || null,
            photo_url: defaultValues.photo_url || null,
          };

          let response = await saveUserProfile(payload);
          toast.success("Profile completed successfully");
          onNext({ user_code: response?.user_code });
        } catch (error) {
          toast.error(
            error?.response?.data?.message || "Failed to save profile",
          );
        }
      })}
    >
      {/* Personal Information Section */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">
          Personal Information
        </h2>
        <p className="text-gray-600 text-sm mb-6">
          Please provide your personal details
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title<span className="text-red-500">*</span>
            </label>
            <select
              {...register("title")}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] bg-white ${
                errors.title ? "border-red-500" : "border-gray-300"
              }`}
            >
              <option value="">Select Your Title</option>
              {titles.map((title) => (
                <option key={title.value} value={title.value}>
                  {title.label}
                </option>
              ))}
            </select>
            {errors.title && (
              <p className="text-red-500 text-xs mt-1">
                {errors.title.message}
              </p>
            )}
          </div>

          {/* First Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              First Name<span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Enter your First Name"
              {...register("firstName")}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] ${
                errors.firstName ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.firstName && (
              <p className="text-red-500 text-xs mt-1">
                {errors.firstName.message}
              </p>
            )}
          </div>

          {/* Middle Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Middle Name (Optional)
            </label>
            <input
              type="text"
              placeholder="Enter your Middle Name"
              {...register("middleName")}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788]"
            />
          </div>

          {/* Surname/Lastname */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Surname/Lastname (Optional)
            </label>
            <input
              type="text"
              placeholder="Enter your Surname"
              {...register("surname")}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788]"
            />
          </div>

          {/* Country/International Organization/Central Bank */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Country<span className="text-red-500">*</span>
            </label>
            <select
              {...register("country")}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] bg-white ${
                errors.country ? "border-red-500" : "border-gray-300"
              }`}
            >
              <option value="">Select</option>
              {countries.map((country) => (
                <option key={country.value} value={country.value}>
                  {country.label}
                </option>
              ))}
            </select>
            {errors.country && (
              <p className="text-red-500 text-xs mt-1">
                {errors.country.message}
              </p>
            )}
          </div>

          {/* Date of Birth */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date of Birth<span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              {...register("dateOfBirth")}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] ${
                errors.dateOfBirth ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.dateOfBirth && (
              <p className="text-red-500 text-xs mt-1">
                {errors.dateOfBirth.message}
              </p>
            )}
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number<span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <select className="w-24 px-2 py-3 border border-gray-300 rounded-lg bg-white">
                <option>+91</option>
                <option>+1</option>
                <option>+44</option>
              </select>
              <input
                type="tel"
                placeholder="Enter Your Mobile Number"
                {...register("phoneNumber")}
                className={`flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] ${
                  errors.phoneNumber ? "border-red-500" : "border-gray-300"
                }`}
              />
            </div>
            {errors.phoneNumber && (
              <p className="text-red-500 text-xs mt-1">
                {errors.phoneNumber.message}
              </p>
            )}
          </div>

          {/* Registered Email ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Registered Email ID<span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              placeholder="nitin.singh@gmail.com"
              {...register("email")}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] ${
                errors.email ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Position */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Position<span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Enter Your Position"
              {...register("position")}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] ${
                errors.position ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.position && (
              <p className="text-red-500 text-xs mt-1">
                {errors.position.message}
              </p>
            )}
          </div>

          {/* Position held since (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Position held since (Optional)
            </label>
            <input
              type="date"
              {...register("positionHeldSince")}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788]"
            />
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gender<span className="text-red-500">*</span>
            </label>
            <select
              {...register("gender")}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] bg-white ${
                errors.gender ? "border-red-500" : "border-gray-300"
              }`}
            >
              <option value="">Select Your Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
            {errors.gender && (
              <p className="text-red-500 text-xs mt-1">
                {errors.gender.message}
              </p>
            )}
          </div>

          {/* Blood Group */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Blood Group
            </label>
            <select
              {...register("bloodGroup")}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] bg-white"
            >
              <option value="">Select</option>
              {bloodGroups.map((group) => (
                <option key={group.value} value={group.value}>
                  {group.label}
                </option>
              ))}
            </select>
          </div>

          {/* Medical Conditions - Full Width */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Please share if you have any medical condition, allergies, etc
              (Optional)
            </label>
            <textarea
              placeholder="Enter your Details here"
              {...register("medicalConditions")}
              rows="3"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] resize-none"
            />
          </div>

          {/* Dietary Preferences - Full Width */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Please enter your dietary preferences if any (Optional)
            </label>
            <textarea
              placeholder="Enter your Details here"
              {...register("dietaryPreferences")}
              rows="3"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] resize-none"
            />
          </div>
        </div>
      </div>

      {/* Passport Details Section */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">
          Passport Details
        </h2>
        <p className="text-gray-600 text-sm mb-6">
          Please provide your passport details
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Passport Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Passport Type<span className="text-red-500">*</span>
            </label>
            <select
              {...register("passportType")}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] bg-white ${
                errors.passportType ? "border-red-500" : "border-gray-300"
              }`}
            >
              <option value="">Ordinary</option>
              {passportTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            {errors.passportType && (
              <p className="text-red-500 text-xs mt-1">
                {errors.passportType.message}
              </p>
            )}
          </div>

          {/* Passport Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Passport Number<span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="ABC01234"
              {...register("passportNumber")}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] ${
                errors.passportNumber ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.passportNumber && (
              <p className="text-red-500 text-xs mt-1">
                {errors.passportNumber.message}
              </p>
            )}
          </div>

          {/* Place of Issue */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Place of issue<span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Enter Place of Issue Here"
              {...register("placeOfIssue")}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] ${
                errors.placeOfIssue ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.placeOfIssue && (
              <p className="text-red-500 text-xs mt-1">
                {errors.placeOfIssue.message}
              </p>
            )}
          </div>

          {/* Passport Date of Expiry */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Passport Date of Expiry<span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              {...register("passportExpiry")}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] ${
                errors.passportExpiry ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.passportExpiry && (
              <p className="text-red-500 text-xs mt-1">
                {errors.passportExpiry.message}
              </p>
            )}
          </div>
        </div>

        {/* Add Previous Passport Details */}
        <div className="mt-4">
          <button
            type="button"
            className="text-[#1e4788] text-sm font-medium hover:underline"
          >
            Add Previous Passport Details (if any)
          </button>
        </div>
      </div>

      {/* Citizenship Details Section */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-6">
          Citizenship Details
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Nationality */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nationality<span className="text-red-500">*</span>
            </label>
            <select
              {...register("nationality")}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] bg-white ${
                errors.nationality ? "border-red-500" : "border-gray-300"
              }`}
            >
              <option value="">Select</option>
              {countries.map((country) => (
                <option key={country.value} value={country.value}>
                  {country.label}
                </option>
              ))}
            </select>
            {errors.nationality && (
              <p className="text-red-500 text-xs mt-1">
                {errors.nationality.message}
              </p>
            )}
          </div>

          {/* Current Citizenship */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Citizenship<span className="text-red-500">*</span>
            </label>
            <select
              {...register("currentCitizenship")}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] bg-white ${
                errors.currentCitizenship ? "border-red-500" : "border-gray-300"
              }`}
            >
              <option value="">Select</option>
              {countries.map((country) => (
                <option key={country.value} value={country.value}>
                  {country.label}
                </option>
              ))}
            </select>
            {errors.currentCitizenship && (
              <p className="text-red-500 text-xs mt-1">
                {errors.currentCitizenship.message}
              </p>
            )}
          </div>

          {/* Any other citizenship */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Any other citizenship that you held or have held
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="yes"
                  {...register("hasOtherCitizenship")}
                  className="w-4 h-4 text-[#1e4788]"
                />
                <span className="text-sm">Yes</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="no"
                  {...register("hasOtherCitizenship")}
                  className="w-4 h-4 text-[#1e4788]"
                />
                <span className="text-sm">No</span>
              </label>
            </div>
          </div>

          {/* Previous Citizenship - Show if Yes */}
          {showPreviousCitizenship && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Previous Citizenship
                </label>
                <select
                  {...register("previousCitizenship")}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] bg-white"
                >
                  <option value="">Select</option>
                  {countries.map((country) => (
                    <option key={country.value} value={country.value}>
                      {country.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    From
                  </label>
                  <input
                    type="date"
                    {...register("citizenshipFrom")}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    To
                  </label>
                  <input
                    type="date"
                    {...register("citizenshipTo")}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788]"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Add more citizenship details */}
        {showPreviousCitizenship && (
          <div className="mt-4">
            <button
              type="button"
              className="text-[#1e4788] text-sm font-medium hover:underline"
            >
              Add more citizenship details
            </button>
          </div>
        )}

        {/* OCI Card Holder */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Are you an Overseas Citizen of India(OCI) card holder?
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="yes"
                {...register("isOCIHolder")}
                className="w-4 h-4 text-[#1e4788]"
              />
              <span className="text-sm">Yes</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="no"
                {...register("isOCIHolder")}
                className="w-4 h-4 text-[#1e4788]"
              />
              <span className="text-sm">No</span>
            </label>
          </div>
        </div>

        {/* OCI Details - Show if Yes */}
        {showOCIDetails && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name on Card
              </label>
              <input
                type="text"
                placeholder="Enter Your Name as on OCI Card"
                {...register("ociName")}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                OCI Card Number
              </label>
              <input
                type="text"
                placeholder="Enter Your Name as on OCI Card"
                {...register("ociNumber")}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date of Issue
              </label>
              <input
                type="date"
                {...register("ociIssueDate")}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Place of Issue
              </label>
              <input
                type="text"
                placeholder="Enter Place of Issue"
                {...register("ociPlaceOfIssue")}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Upload Documents Section */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">
          Upload Documents
        </h2>
        <p className="text-gray-600 text-sm mb-6">
          Please provide your documents
        </p>

        {/* Upload Passport */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload your Passport
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#1e4788] transition-colors">
            <input
              type="file"
              id="passport-upload"
              onChange={(e) => handleFileUpload(e, "passport")}
              accept=".jpg,.jpeg,.png,.pdf"
              className="hidden"
            />
            <label htmlFor="passport-upload" className="cursor-pointer">
              <div className="flex flex-col items-center gap-2">
                <FiUpload className="w-8 h-8 text-gray-400" />
                <p className="text-sm text-gray-600">
                  Choose a file or drag and drop it here
                </p>
                <p className="text-xs text-gray-500">
                  JPEG, PNG formats up to 1 MB. Preferred width/height 2m x25s
                  (600x600 at 300 DPI)
                </p>
                <button
                  type="button"
                  className="mt-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  Browse File
                </button>
              </div>
            </label>
            {passportFile && (
              <p className="mt-3 text-sm text-green-600">
                ✓ {passportFile.name}
              </p>
            )}
          </div>
        </div>

        {/* Upload Photo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload your Photo<span className="text-red-500"></span>
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#1e4788] transition-colors">
            <input
              type="file"
              id="photo-upload"
              onChange={(e) => handleFileUpload(e, "photo")}
              accept=".jpg,.jpeg,.png"
              className="hidden"
            />
            <label htmlFor="photo-upload" className="cursor-pointer">
              <div className="flex flex-col items-center gap-2">
                <FiUpload className="w-8 h-8 text-gray-400" />
                <p className="text-sm text-gray-600">
                  Choose a file or drag and drop it here
                </p>
                <p className="text-xs text-gray-500">
                  JPEG, PNG formats up to 1 MB. Preferred width/height 2m x25s
                  (600x600 at 300 DPI)
                </p>
                <button
                  type="button"
                  className="mt-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  Browse File
                </button>
              </div>
            </label>
            {photoFile && (
              <p className="mt-3 text-sm text-green-600">✓ {photoFile.name}</p>
            )}
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-3 pt-4 pb-8">
        <button
          type="button"
          onClick={onBack}
          className="px-8 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
        >
          Back
        </button>
        <button
          type="submit"
          className="px-8 py-3 text-white rounded-lg transition-colors font-medium btn-primary-enabled"
        >
          Continue
        </button>
      </div>
    </form>
  );
};

export default StepFour;
