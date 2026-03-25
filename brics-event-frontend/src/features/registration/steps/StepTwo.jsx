import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getUserDetails, sendRegisterOtp, verifyRegisterOtp } from "../../../services/auth";
import { toast } from "react-toastify";
import { useNavigate } from 'react-router-dom';

// ✅ Email schema
const emailSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const StepTwo = ({ onNext, onBack, defaultValues }) => {
  const [showOTP, setShowOTP] = useState(false);
  const [emailForOtp, setEmailForOtp] = useState("");
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tempUserId, setTempUserId] = useState(null);
  const otpRefs = useRef([]);

  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm({
    resolver: zodResolver(emailSchema),
    defaultValues: defaultValues || { email: '' },
  });

  const email = watch('email');

  /* ================= TIMER ================= */
  useEffect(() => {
    if (showOTP && timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [showOTP, timer]);

  /* ================= SEND OTP ================= */
  const handleSendOTP = async (data) => {
    try {
      setIsLoading(true);
      setEmailForOtp(data.email);

      const res = await sendRegisterOtp({
        email: data.email,
        role_id: defaultValues?.role_id
      });

      toast.success("OTP sent successfully to your email");
      setTempUserId(res.temp_user_id);
      setShowOTP(true);
      setTimer(60);
      setCanResend(false);

      setTimeout(() => {
        otpRefs.current[0]?.focus();
      }, 100);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to send OTP. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  /* ================= OTP INPUT ================= */
  const handleOtpChange = (index, value) => {
    if (!/^[0-9]*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  /* ================= VERIFY OTP ================= */
  const handleVerifyOTP = async () => {
    const otpValue = otp.join("");
    if (otpValue.length !== 6) {
      toast.error("Please enter complete OTP");
      return;
    }

    try {
      setIsLoading(true);

      const response = await verifyRegisterOtp({
        email: emailForOtp,
        otp: otpValue
      });

      toast.success("OTP verified successfully!");

      // ✅ ONLY TOKEN STORED
      localStorage.setItem('token', response.token);
      // ❌ user NOT stored

      /* ================= PROFILE COMPLETION CHECK ================= */
      try {
        const profileRes = await getUserDetails();

        const percentage =
          profileRes?.profile_completion?.percentage ||
          profileRes?.user?.profile_completion?.percentage ||
          0;

        if (percentage < 10) {
          toast.info("Please complete your profile");
          navigate("/profile");
        } else {
          navigate("/dashboard");
        }
      } catch (err) {
        navigate("/dashboard");
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Invalid OTP. Please try again."
      );
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  /* ================= RESEND OTP ================= */
  const handleResendOTP = async () => {
    try {
      setIsLoading(true);

      await sendRegisterOtp({
        email: emailForOtp,
        role_id: defaultValues?.role_id
      });

      toast.success("OTP resent successfully!");
      setTimer(60);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } catch (error) {
      toast.error("Failed to resend OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <form onSubmit={handleSubmit(handleSendOTP)} className="space-y-6 max-w-lg mx-auto">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Email Verification
          </h2>
          <p className="text-gray-600 mb-6 text-sm">
            Please enter the Email ID on which the registration invite will be shared
          </p>

          <div className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email ID<span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                placeholder="Enter Your email ID"
                {...register('email')}
                disabled={showOTP}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4788] ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                } ${showOTP ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>

            {/* OTP */}
            {showOTP && (
              <div className="space-y-4 pt-4">
                <p className="text-sm font-medium text-gray-700">
                  Enter the 6 digit OTP sent to your email ID
                </p>

                <div className="flex justify-between gap-2 sm:gap-3">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (otpRefs.current[index] = el)}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="w-10 h-10 sm:w-12 sm:h-12 text-center text-xl font-bold border-2 border-gray-300 rounded-lg focus:border-[#1e4788] focus:outline-none focus:ring-2 focus:ring-[#1e4788]"
                    />
                  ))}
                </div>

                <div className="text-end">
                  {canResend ? (
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      disabled={isLoading}
                      className="text-[#1e4788] font-medium text-sm disabled:opacity-50"
                    >
                      Resend OTP
                    </button>
                  ) : (
                    <p className="text-gray-600 text-sm">
                      Resend OTP in{" "}
                      <span className="font-semibold text-gray-900">
                        00:{timer.toString().padStart(2, '0')}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onBack}
            className="secondary-button"
            disabled={isLoading}
          >
            Back
          </button>

          {!showOTP ? (
            <button
              type="submit"
              disabled={!email || !!errors.email || isLoading}
              className="px-8 py-3 text-white rounded-lg font-medium disabled:opacity-50 btn-primary-enabled"
            >
              {isLoading ? 'Sending...' : 'Continue'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleVerifyOTP}
              disabled={otp.join('').length !== 6 || isLoading}
              className="px-8 py-3 text-white rounded-lg font-medium disabled:opacity-50 btn-primary-enabled"
            >
              {isLoading ? 'Verifying...' : 'Continue'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default StepTwo;
