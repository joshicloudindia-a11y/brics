// import React, { useState } from 'react';
// import { useForm } from 'react-hook-form';
// import { zodResolver } from '@hookform/resolvers/zod';
// import { z } from 'zod';
// import { savePersonalDetails } from "../../api/registrations";
// import { toast } from "react-toastify";

// // Schema for Indian citizens - NOW WITH GENDER
// const indianSchema = z.object({
//   firstName: z.string().min(2, 'First name is required'),
//   lastName: z.string().min(2, 'Last name is required'),
//   gender: z.string().min(1, 'Please select gender'),
//   organization: z.string().min(2, 'Organization is required'),
//   governmentIdType: z.string().min(1, 'Please select ID type'),
//   governmentIdNumber: z.string().min(5, 'Valid ID number required'),
//   state: z.string().min(2, 'State is required'),
//   pinCode: z.string().regex(/^[0-9]{6}$/, 'Valid 6-digit PIN code required'),
//   address: z.string().min(10, 'Complete address is required'),
//   photo: z.any().optional(),
// });

// // Schema for Foreign citizens
// const foreignSchema = z.object({
//   firstName: z.string().min(2, 'First name is required'),
//   lastName: z.string().min(2, 'Last name is required'),
//   gender: z.string().min(1, 'Please select gender'),
//   organization: z.string().min(2, 'Organization is required'),
//   governmentIdType: z.string().min(1, 'Please select ID type'),
//   passportNumber: z.string().min(5, 'Valid passport number required'),
//   state: z.string().min(2, 'State is required'),
//   pinCode: z.string().regex(/^[0-9]{6}$/, 'Valid 6-digit PIN code required'),
//   address: z.string().min(10, 'Complete address is required'),
//   passportPhoto: z.any().optional(),
// });

// const StepThree = ({ onNext, onBack, defaultValues, country }) => {
//   const [photoPreview, setPhotoPreview] = useState(null);
//   const [uploadedFileName, setUploadedFileName] = useState('');
//   const [selectedIdType, setSelectedIdType] = useState(defaultValues?.governmentIdType || '');

//   const isIndian = country === 'india';
//   const schema = isIndian ? indianSchema : foreignSchema;

//   const {
//     register,
//     handleSubmit,
//     formState: { errors },
//     watch,
//   } = useForm({
//     resolver: zodResolver(schema),
//     defaultValues: defaultValues || {},
//   });

//   const governmentIdType = watch('governmentIdType');

//   React.useEffect(() => {
//     setSelectedIdType(governmentIdType);
//   }, [governmentIdType]);

//   const handlePhotoUpload = (e) => {
//     const file = e.target.files[0];
//     if (file) {
//       setUploadedFileName(file.name);
//       const reader = new FileReader();
//       reader.onloadend = () => {
//         setPhotoPreview(reader.result);
//       };
//       reader.readAsDataURL(file);
//     }
//   };

//   const governmentIdTypes = isIndian
//     ? [
//       { value: 'voter-id', label: 'Voter ID' },
//       { value: 'pan', label: 'PAN Card' },
//       { value: 'driving-license', label: 'Driving License' },
//       { value: 'passport', label: 'Passport' },
//     ]
//     : [
//       { value: 'passport', label: 'Passport' },
//     ];

//   const getIdFieldConfig = () => {
//     switch (selectedIdType) {
//       case 'voter-id':
//         return { label: 'Voter ID Card Number', placeholder: 'ABC1234567' };
//       case 'pan':
//         return { label: 'PAN Card Number', placeholder: 'ABCDE1234F' };
//       case 'driving-license':
//         return { label: 'Driving License Number', placeholder: 'DL-1234567890123' };
//       case 'passport':
//         return { label: 'Passport Number', placeholder: 'A12345678' };
//       default:
//         return { label: 'Government ID Number', placeholder: 'Enter ID Number' };
//     }
//   };

//   const idFieldConfig = getIdFieldConfig();

//   return (
//     <form
//       onSubmit={handleSubmit(async (data) => {
//         try {
//           const res = await savePersonalDetails({
//             temp_user_id: defaultValues.temp_user_id,
//             event_id: "995c970ed24cb75e311dcbd9",
//             role_id: defaultValues.role_id,
//             form_data: {
//               first_name: data.firstName,
//               last_name: data.lastName,
//               gender: data.gender,
//               organisation: data.organization,
//               government_id_type: data.governmentIdType,
//               government_id_number:
//                 data.governmentIdNumber || data.passportNumber,
//               address: data.address,
//               state: data.state
//             }
//           });

//           toast.success("Registration completed successfully");

//           onNext({
//             registration_id: res.registration_id
//           });
//         } catch (error) {
//           toast.error(
//             error?.response?.data?.message || "Failed to save registration"
//           );
//         }
//       })}
//       className="space-y-6"
//     >
//       <div>
//         <h2 className="text-2xl font-bold text-gray-900 mb-2">Personal Information</h2>
//         <p className="text-gray-600 mb-6">Please provide your personal details</p>

//         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//           {/* First Name */}
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               First Name<span className="text-red-500">*</span>
//             </label>
//             <input
//               type="text"
//               placeholder="Enter your First Name"
//               {...register('firstName')}
//               className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] ${errors.firstName ? 'border-red-500' : 'border-gray-300'
//                 }`}
//             />
//             {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName.message}</p>}
//           </div>

//           {/* Last Name */}
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               Last Name<span className="text-red-500">*</span>
//             </label>
//             <input
//               type="text"
//               placeholder="Enter your Last Name"
//               {...register('lastName')}
//               className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] ${errors.lastName ? 'border-red-500' : 'border-gray-300'
//                 }`}
//             />
//             {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName.message}</p>}
//           </div>

//           {/* Gender - FOR BOTH Indian and Foreign */}
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               Gender<span className="text-red-500">*</span>
//             </label>
//             <select
//               {...register('gender')}
//               className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788]  bg-white ${errors.gender ? 'border-red-500' : 'border-gray-300'
//                 }`}
//             >
//               <option value="">Select Your Gender</option>
//               <option value="male">Male</option>
//               <option value="female">Female</option>
//               <option value="other">Other</option>
//             </select>
//             {errors.gender && <p className="text-red-500 text-sm mt-1">{errors.gender.message}</p>}
//           </div>

//           {/* Photo Upload */}
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               Upload {isIndian ? 'Photo' : 'Passport Photo'}<span className="text-red-500">*</span>
//             </label>
//             <div className="flex items-center gap-3">
//               <div className="flex-1 bg-blue-50 px-4 py-3 border border-blue-200 rounded-lg">
//                 <p className="text-sm text-blue-900 truncate">
//                   {uploadedFileName.slice(0,20) || `Upload Your ${isIndian ? 'Photo' : 'Passport Photo'}`}
//                 </p>
//               </div>
//               <label className="px-6 py-3 btn-primary-enabled text-white rounded-lg cursor-pointer font-medium flex items-center gap-2">
//                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
//                 </svg>
//                 Upload
//                 <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
//               </label>
//             </div>
//             {photoPreview && (
//               <div className="mt-3">
//                 <img src={photoPreview} alt="Preview" className="w-24 h-24 rounded-full object-cover border-4 border-blue-200" />
//               </div>
//             )}
//           </div>

//           {/* Organization */}
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               Organisation/Institution<span className="text-red-500">*</span>
//             </label>
//             <input
//               type="text"
//               placeholder="Enter your Organisation/Institution"
//               {...register('organization')}
//               className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] ${errors.organization ? 'border-red-500' : 'border-gray-300'
//                 }`}
//             />
//             {errors.organization && <p className="text-red-500 text-sm mt-1">{errors.organization.message}</p>}
//           </div>

//           {/* Government ID Type */}
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               Select Government ID<span className="text-red-500">*</span>
//             </label>
//             <select
//               {...register('governmentIdType')}
//               className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] bg-white ${errors.governmentIdType ? 'border-red-500' : 'border-gray-300'
//                 }`}
//             >
//               <option value="">Select your Government ID</option>
//               {governmentIdTypes.map((type) => (
//                 <option key={type.value} value={type.value}>{type.label}</option>
//               ))}
//             </select>
//             {errors.governmentIdType && <p className="text-red-500 text-sm mt-1">{errors.governmentIdType.message}</p>}
//           </div>

//           {/* Dynamic ID Number Field - Full Width */}
//           {selectedIdType && (
//             <div className="md:col-span-2">
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 {idFieldConfig.label}<span className="text-red-500">*</span>
//               </label>
//               <input
//                 type="text"
//                 placeholder={idFieldConfig.placeholder}
//                 {...register(isIndian && selectedIdType !== 'passport' ? 'governmentIdNumber' : 'passportNumber')}
//                 className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] ${(isIndian && selectedIdType !== 'passport' ? errors.governmentIdNumber : errors.passportNumber) ? 'border-red-500' : 'border-gray-300'
//                   }`}
//               />
//               {(isIndian && selectedIdType !== 'passport' ? errors.governmentIdNumber : errors.passportNumber) && (
//                 <p className="text-red-500 text-sm mt-1">
//                   {(isIndian && selectedIdType !== 'passport' ? errors.governmentIdNumber : errors.passportNumber).message}
//                 </p>
//               )}
//               <p className="text-xs text-gray-500 mt-1">Format: {idFieldConfig.placeholder}</p>
//             </div>
//           )}

//           {/* State */}
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               State<span className="text-red-500">*</span>
//             </label>
//             <input
//               type="text"
//               placeholder="Enter your State"
//               {...register('state')}
//               className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] ${errors.state ? 'border-red-500' : 'border-gray-300'
//                 }`}
//             />
//             {errors.state && <p className="text-red-500 text-sm mt-1">{errors.state.message}</p>}
//           </div>

//           {/* PIN Code */}
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               PIN code<span className="text-red-500">*</span>
//             </label>
//             <input
//               type="text"
//               placeholder="Enter your PIN Code"
//               {...register('pinCode')}
//               className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] ${errors.pinCode ? 'border-red-500' : 'border-gray-300'
//                 }`}
//             />
//             {errors.pinCode && <p className="text-red-500 text-sm mt-1">{errors.pinCode.message}</p>}
//           </div>

//           {/* Address - Full Width */}
//           <div className="md:col-span-2">
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               Address<span className="text-red-500">*</span>
//             </label>
//             <input
//               type="text"
//               placeholder="Enter your Address"
//               {...register('address')}
//               className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] ${errors.address ? 'border-red-500' : 'border-gray-300'
//                 }`}
//             />
//             {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address.message}</p>}
//           </div>
//         </div>
//       </div>

//       {/* Buttons */}
//       <div className="flex justify-end gap-3 pt-4">
//         <button type="button" onClick={onBack} className="secondary-button">
//           Back
//         </button>
//         <button type="submit" className="px-8 py-3 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed btn-primary-enabled">
//           Continue
//         </button>
//       </div>
//     </form>
//   );
// };

// export default StepThree;



import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import { FiEye, FiEyeOff } from 'react-icons/fi';

// ✅ Password validation schema
const passwordSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(14, 'Password must not exceed 14 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Must contain at least one number')
    .regex(/[@#$]/, 'Must contain at least one special character (@, #, $)'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const StepThree = ({ onNext, onBack, defaultValues }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: defaultValues || {
      password: '',
      confirmPassword: '',
    },
  });

  const password = watch('password');

  // Password strength validation indicators
  const validations = [
    { 
      text: 'Should be at least 8-14 characters',
      valid: password?.length >= 8 && password?.length <= 14 
    },
    { 
      text: 'At least one Uppercase',
      valid: /[A-Z]/.test(password) 
    },
    { 
      text: 'At least one Lowercase',
      valid: /[a-z]/.test(password) 
    },
    { 
      text: 'At least one Number',
      valid: /[0-9]/.test(password) 
    },
    { 
      text: 'At least one special character eg. \'@#$\'',
      valid: /[@#$]/.test(password) 
    },
  ];

  const handleContinue = (data) => {
    toast.success('Password set successfully!');
    onNext({
      password: data.password,
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <form onSubmit={handleSubmit(handleContinue)} className="space-y-6 max-w-lg mx-auto">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Set Password
          </h2>
          <p className="text-gray-600 mb-6 text-sm">
            Set a strong password to secure your account
          </p>

          <div className="space-y-6">
            {/* Enter Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter Password<span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter Password"
                  {...register('password')}
                  className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                </button>
              </div>
              
              {/* Password validation indicators */}
              <div className="mt-3 space-y-1  flex flex-wrap gap-1 items-center text-[#4A5565] ">
                {validations.map((validation, index) => (
                  <div key={index} className="flex flex-row items-center gap-2 text-xs">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      validation.valid ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                    <span className={validation.valid ? 'text-green-600' : 'text-gray-500  '}>
                      {validation.text}
                    </span>
                  </div>
                ))}
              </div>
              
              {errors.password && (
                <p className="text-red-500 text-sm mt-2">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password<span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm Password"
                  {...register('confirmPassword')}
                  className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] ${
                    errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onBack}
            className="secondary-button"
          >
            Back
          </button>
          <button
            type="submit"
            className="px-8 py-3 text-white rounded-lg transition-colors font-medium btn-primary-enabled"
          >
            Confirm & Continue
          </button>
        </div>
      </form>
    </div>
  );
};

export default StepThree;
