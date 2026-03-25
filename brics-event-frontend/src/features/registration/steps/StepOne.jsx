import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getRoles } from "../../../services/roles";
import Visitor from "../../../assets/images/visitor.svg?react";
import MediaIcon from "../../../assets/images/media.svg?react";
import AcademiaIcon from "../../../assets/images/academia.svg?react";
import DelegateIcon from "../../../assets/images/delegate.svg?react";
import VipIcon from "../../../assets/images/vip.svg?react";
import SpecialInviteeIcon from "../../../assets/images/special_invitation.svg?react";
import Dao from "../../../assets/images/DAO.svg?react";


const stepOneSchema = z.object({
  participantType: z.string().min(1, "Please select a participant type"),
  consentDataProcessing: z.boolean().refine((val) => val === true, {
    message: "You must consent to data processing",
  }),
  consentDataRetention: z.boolean().refine((val) => val === true, {
    message: "You must consent to data retention policy",
  }),
});

/* ---------------------- Icon Mapper ---------------------- */
const roleIconMap = {
  DAO: <Dao />,
  DELEGATE: <DelegateIcon />,
};
const StepOne = ({ onNext, defaultValues }) => {
  const [participantTypes, setParticipantTypes] = useState([]);
  const [loading, setLoading] = useState(true);

 const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(stepOneSchema),
    defaultValues: defaultValues || {
      participantType: "",
      consentDataProcessing: false,
      consentDataRetention: false,
    },
  });

  const selectedType = watch("participantType");
  const selectAll = watch("consentDataProcessing") && watch("consentDataRetention");

  /* ---------------------- Fetch Roles ---------------------- */
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const data = await getRoles();

        const formatted = data.map((role) => ({
          id: role.id,
          label: role.name,
          icon: roleIconMap[role.name] || null,
        }));

        setParticipantTypes(formatted);
      } catch (error) {
        // Handle error silently
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, []);

  const handleSelectAll = (checked) => {
    setValue("consentDataProcessing", checked);
    setValue("consentDataRetention", checked);
  };

  return (
    <form
      onSubmit={handleSubmit((data) => {
        onNext({
          role_id: data.participantType
        });
      })}
      className="space-y-8"
    >

      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Select Your Participant Type
        </h2>
        <p className="text-gray-600 mb-6 text-base">
          Choose the category that best describes you
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {participantTypes.map((type) => (
            <label
              key={type.id}
              className={`relative flex items-center  gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all h-[60px] ${
                selectedType === type.id
                  ? "border-[#1e4788] "
                  : "border-gray-200 hover:border-blue-300 bg-white"
              }`}
            >
              <input
                type="radio"
                value={type.id}
                {...register("participantType")}
                className="sr-only "
              />

              <div
                className={` ${
                  selectedType === type.id ? "text-[#1e4788]" : "text-gray-600"
                }`}
              >
                {type.icon}
              </div>

              <span
                className={`font-light text-sm ${
                  selectedType === type.id ? "text-blue-900" : "text-gray-700"
                }`}
              >
                {type.label}
              </span>
              {selectedType === type.id && (
                <div className="absolute top-4 right-3 w-6 h-6 bg-[#1e4788] rounded-full flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </label>
          ))}
        </div>
        {errors.participantType && (
          <p className="text-red-500 text-sm mt-2">
            {errors.participantType.message}
          </p>
        )}
      </div>

      {/* Consent Section */}
      <div className="space-y-4 pt-6 border-t border-gray-200">
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={selectAll}
            onChange={(e) => handleSelectAll(e.target.checked)}
            className="w-5 h-5 border-gray-300   focus:ring-[#1e4788] mt-0.5 cursor-pointer"
            style={{ accentColor: "#1e4788" }}
          />
          <span className="text-xs font-semibold text-[#1e4788]  mt-1">
            Select All
          </span>
        </label>

        <label className="flex items-start gap-3 cursor-pointer group">
          <div>
            <input
              type="checkbox"
              {...register("consentDataProcessing")}
              className="w-5 h-5 border-gray-300 rounded focus:ring-[#1e4788] mt-0.5 cursor-pointer"
              style={{ accentColor: "#1e4788" }}
            />
          </div>
          <span className="text-xs text-gray-700">
            I hereby consent to the collection and processing of my personal
            information (name, email, organization, contact number, and
            designation) solely for registration and communication purposes
            only. I confirm that the information provided is accurate, and I
            understand this data will not be shared with third parties or used
            for any other purpose.
          </span>
        </label>
        {errors.consentDataProcessing && (
          <p className="text-red-500 text-xs ml-8">
            {errors.consentDataProcessing.message}
          </p>
        )}

        <label className="flex items-start gap-3 cursor-pointer group">
          <div>
            <input
              type="checkbox"
              {...register("consentDataRetention")}
              className="w-5 h-5 border-gray-300 rounded focus:ring-[#1e4788] mt-0.5 cursor-pointer"
              style={{ accentColor: "#1e4788" }}
            />
          </div>
          <span className="text-xs text-gray-700 mt-1">
            Your data will be saved for a duration of only 365 days from end of
            the event. After that your data would be deleted.
          </span>
        </label>
        {errors.consentDataRetention && (
          <p className="text-red-500 text-sm ml-8">
            {errors.consentDataRetention.message}
          </p>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end ">
        <button
          type="submit"
          className="px-8 py-3  text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed btn-primary-enabled"
        >
          Continue
        </button>
      </div>
    </form>
  );
};

export default StepOne;
