import React, { useEffect, useState, useRef } from "react";
import { ArrowLeft, Lock, Mail, Check } from "lucide-react";
import axios from "axios";
import { toast } from "react-toastify";
import bricsIndia from "../../assets/images/brics_india.png";
import logo from "../../assets/images/logo1.svg";
import emblem from "../../assets/images/national-emblem.svg";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { sendLoginOtp, verifyLoginOtp } from "../../services/auth";
import { encryptPayloadClient } from "../../utils/otpEncryption";
import vector2 from "../../assets/images/vector2.svg";
import vector1 from "../../assets/images/vector1.svg";

/* ================= CAROUSEL IMAGES ================= */
const slides = [
  "https://d2jiw2zrmmyqt8.cloudfront.net/wp-content/uploads/2025/12/25151015/Sustainability-2048x1365.jpg",
  "https://d2jiw2zrmmyqt8.cloudfront.net/wp-content/uploads/2025/12/29160230/business-people-silhouettes-against-orange-sky-with-planter-network-sketch-near-it-elements-this-image-furnished-by-nasa-toned-image-1-2048x1306.jpg",
  "https://d2jiw2zrmmyqt8.cloudfront.net/wp-content/uploads/2025/12/25150901/Innovation.jpg",
  "https://d2jiw2zrmmyqt8.cloudfront.net/wp-content/uploads/2025/12/25152306/Resilience-2-scaled.jpg",
];

const VisitorLogin = () => {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [timer, setTimer] = useState(300); // 5 minutes
  const [emailError, setEmailError] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const otpInputsRef = useRef([]);

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidOtp = otp.length === 6;

  const navigate = useNavigate();

  /* ================= AUTO SLIDE ================= */
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  /* ---------- TIMER ---------- */
  useEffect(() => {
    if (!otpSent || timer === 0) return;

    const interval = setInterval(() => {
      setTimer((t) => t - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [otpSent, timer]);

  /* ---------- AUTO FOCUS FIRST OTP INPUT ---------- */
  useEffect(() => {
    if (otpSent && otpInputsRef.current[0]) {
      otpInputsRef.current[0].focus();
    }
  }, [otpSent]);

  /* ---------- SEND OTP ---------- */
  const handleSendOtp = async () => {
    if (!isValidEmail) {
      setEmailError("Please enter a valid email address");
      return;
    }
    try {
      setEmailError("");
      setLoading(true);

      await sendLoginOtp({ email });

      toast.success("OTP sent successfully");
      setOtpSent(true);
      setTimer(300);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  /* ---------- VERIFY OTP ---------- */
  const handleVerifyOtp = async () => {
    if (!isValidOtp) return;
    try {
      setLoading(true);
      // Encrypt entire payload (email + otp) before sending to backend
      const encryptedPayload = encryptPayloadClient({
        email,
        otp,
      });

      const res = await verifyLoginOtp({
        encryptedPayload,
      });

      toast.success("OTP verified successfully");

      localStorage.setItem("token", res.token);
      
      // Role-based redirect
      const userRole = res.user?.role?.name?.toLowerCase().trim();
      const isAdminRole = userRole === "super admin" || userRole === "event manager";
      
      if (isAdminRole) {
        navigate("/admin/dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  /* ---------- RESEND OTP ---------- */
  const handleResendOtp = async () => {
    if (timer !== 0) return;

    try {
      setLoading(true);

      await sendLoginOtp({ email });

      toast.success("OTP resent successfully");
      setOtp(""); // Clear OTP fields
      setTimer(300);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
<div className="bg-gradient-orange lg:bg-white w-full flex flex-col lg:flex-row overflow-hidden">

  {/* ================= LEFT SECTION ================= */}
  <div className="flex justify-center items-center w-full lg:w-[60%] lg:h-screen relative ">
    <div
      className="
        w-full
        h-[360px] sm:h-[420px] lg:h-full
        flex flex-col
        items-center
        justify-center
        bg-gradient-orange
        relative
        sm:px-8
        pt-4 lg:pt-0
      "
    >
      {/* VECTOR IMAGE */}
      <div
        className="
          fixed lg:absolute
          bottom-0 left-0
          w-24 h-24 sm:w-32 sm:h-32 md:w-48 md:h-48
          z-40"
      >
        <img src={vector2} alt="art" className="rotate-[90deg]" />
      </div>

      {/* SLIDER */}
      <div className=" w-full
  max-w-[320px] sm:max-w-[480px] lg:max-w-[650px]
  aspect-[16/9]
  rounded-[16px]
  overflow-hidden
  relative
  bg-gray-200
  shadow-lg">
        {slides.map((img, index) => (
          <img
            key={img}
            src={img}
            alt="Slide"
            onError={(e) => {
              e.target.src =
                "https://via.placeholder.com/800x500/1F4788/FFFFFF?text=BRICS+India+2026";
            }}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
              index === currentSlide ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
      </div>

      {/* DASH INDICATOR */}
      <div className="flex gap-3 mt-3">
        {slides.map((_, index) => (
          <span
            key={index}
            className={`h-[3px] w-[24px] rounded-full ${
              index === currentSlide ? "bg-[#1F4788]" : "bg-[#D0D5DD]"
            }`}
          />
        ))}
      </div>

      {/* HEADING */}
      <div className="w-[90%] max-w-[520px] mt-3 text-center">
        <p className="text-base sm:text-lg lg:text-3xl tracking-wide leading-snug lg:leading-[40px] font-bold text-[#1F4788]">
          Building for Resilience, Innovation, Cooperation and Sustainability
        </p>
      </div>

      {/* COLOR STRIP */}
      <div
        className="
          fixed lg:absolute
          bottom-0 left-0 right-0
          w-full h-[4px] flex
          z-50
        "
      >
        <span className="flex-1 bg-[#1F4788]" />
        <span className="flex-1 bg-[#F4C430]" />
        <span className="flex-1 bg-[#f69434]" />
        <span className="flex-1 bg-[#2FA84F]" />
        <span className="flex-1 bg-[#E63946]" />
      </div>
    </div>
  </div>

  {/* ================= RIGHT SECTION ================= */}
  <div className="flex flex-col justify-start lg:justify-center items-center sm:px-6 lg:px-10 w-full lg:w-[40%] lg:min-h-screen py-6 pb-8 lg:pb-0 lg:py-0 rounded-t-3xl lg:rounded-none shadow-2xl lg:shadow-none relative overflow-hidden bg-white">

    {/* LOGIN CARD */}
    <div
      className="
        w-full
        max-w-md sm:max-w-lg
        lg:max-w-none lg:px-16
        bg-white lg:bg-transparent
        p-6 sm:p-8 lg:p-0
        rounded-t-2xl lg:rounded-none
      "
    >
      {/* HEADER */}
      <div className="text-center mb-6">
        <div className="flex justify-center items-center gap-3 mb-4">
          <img
            src={import.meta.env.VITE_BRICS_LOGO_URL || logo}
            alt="BRICS India 2026"
            className="h-14 sm:h-20"
          />
        </div>

        <h1 className="text-lg sm:text-2xl font-semibold text-[#101828] py-2 sm:py-4">
          Login to your Account
        </h1>
      </div>

      {/* FORM (UNCHANGED) */}
      <div className="text-left">
        <div className="mb-4 sm:mb-6">
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
            Email <span className="text-red-500">*</span>
          </label>

          <input
            type="email"
            value={email}
            disabled={otpSent}
            onChange={(e) => {
              setEmail(e.target.value);
              if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value)) {
                setEmailError("");
              }
            }}
            onKeyPress={(e) => {
              if (e.key === "Enter" && !otpSent && !loading) {
                handleSendOtp();
              }
            }}
            placeholder="Enter your Email"
            className="w-full h-[44px] px-3 sm:px-4 text-sm rounded-md border border-gray-300 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
          />

          {emailError && (
            <p className="text-xs text-red-500 mt-1">{emailError}</p>
          )}
        </div>

        {!otpSent && (
          <button
            onClick={handleSendOtp}
            onKeyDown={(e) => e.key === "Enter" && isValidEmail && !loading && handleSendOtp()}
            disabled={!isValidEmail || loading}
            className="btn-primary btn-primary-enabled disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Sending..." : "Send OTP"}
          </button>
        )}

        {otpSent && (
          <>
            <p className="mt-3 sm:mt-4 mb-3 sm:mb-4 text-sm sm:text-[16px] leading-6 sm:leading-[28px] font-normal text-[#6F7D94]">
              Enter the 6 digit OTP sent to your email ID
            </p>

            <div className="flex justify-between gap-1 sm:gap-2 mb-4 sm:mb-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <input
                  key={index}
                  ref={(el) => (otpInputsRef.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={otp[index] || ""}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    if (value.length <= 1) {
                      const newOtp = otp.split("");
                      newOtp[index] = value;
                      setOtp(newOtp.join(""));
                      
                      // Move to next input if value entered
                      if (value && index < 5) {
                        otpInputsRef.current[index + 1]?.focus();
                      }
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace") {
                      // Only move to previous if current input is empty
                      if (!otp[index] && index > 0) {
                        otpInputsRef.current[index - 1]?.focus();
                      } else {
                        // Delete current value
                        const newOtp = otp.split("");
                        newOtp[index] = "";
                        setOtp(newOtp.join(""));
                      }
                    } else if (e.key === "Enter" && isValidOtp && !loading) {
                      handleVerifyOtp();
                    }
                  }}
                  onPaste={(e) => {
                    e.preventDefault();
                    const pastedData = e.clipboardData
                      .getData("text")
                      .replace(/\D/g, "")
                      .slice(0, 6);
                    
                    if (pastedData) {
                      setOtp(pastedData);
                      // Focus the last filled input or the 6th input
                      const focusIndex = Math.min(pastedData.length - 1, 5);
                      otpInputsRef.current[focusIndex]?.focus();
                    }
                  }}
                  className="w-[44px] sm:w-[56px] h-[44px] sm:h-[56px] rounded-[8px] border border-[#D0D5DD] text-center text-base sm:text-[18px] font-medium text-[#101828] focus:outline-none focus:border-[#1D4ED8] focus:ring-1 focus:ring-[#1D4ED8]"
                />
              ))}
            </div>

            <div className="text-right text-xs sm:text-[14px] text-[#6F7D94] mb-4 sm:mb-6">
              {timer > 0 ? (
                <span>
                  Resend OTP in {Math.floor(timer / 60).toString().padStart(2, "0")}:{(timer % 60).toString().padStart(2, "0")}
                </span>
              ) : (
                <button type="button" onClick={handleResendOtp}
                className="text-[#1F4788] underline hover:scale-105 transition-all duration-200"
                >
                  Resend OTP
                </button>
              )}
            </div>

            <button
              onClick={handleVerifyOtp}
              onKeyDown={(e) => e.key === "Enter" && isValidOtp && !loading && handleVerifyOtp()}
              disabled={!isValidOtp || loading}
              className="btn-primary btn-primary-enabled disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Verifying..." : "Verify & Continue"}
            </button>
          </>
        )}
      </div>
    </div>
  </div>
</div>




  );
};

export default VisitorLogin;
