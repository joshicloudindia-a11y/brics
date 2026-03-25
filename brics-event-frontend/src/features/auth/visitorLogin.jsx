import React, { useEffect, useState, useRef } from "react"; 
import { ArrowLeft, Lock, Mail, Check, Download, X } from "lucide-react"; 
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { sendLoginOtp, verifyLoginOtp } from "../../services/auth";
import { encryptPayloadClient } from "../../utils/otpEncryption";

import logo from "../../assets/images/logo1.svg";
import vector2 from "../../assets/images/vector2.svg";

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
  const [timer, setTimer] = useState(300);
  const [emailError, setEmailError] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  const otpInputsRef = useRef([]);
  const navigate = useNavigate();

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidOtp = otp.length === 6;

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") console.log("User accepted PWA install");
    setDeferredPrompt(null);
    setShowInstallBtn(false);
  };

  useEffect(() => {
    const interval = setInterval(() => setCurrentSlide((p) => (p + 1) % slides.length), 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!otpSent || timer === 0) return;
    const interval = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [otpSent, timer]);

  useEffect(() => {
    if (otpSent && otpInputsRef.current[0]) otpInputsRef.current[0].focus();
  }, [otpSent]);

  const handleSendOtp = async () => {
    if (!isValidEmail) { setEmailError("Please enter a valid email address"); return; }
    try {
      setLoading(true);
      await sendLoginOtp({ email });
      toast.success("OTP sent successfully");
      setOtpSent(true);
      setTimer(300);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to send OTP");
    } finally { setLoading(false); }
  };

  const handleVerifyOtp = async () => {
    if (!isValidOtp) return;
    try {
      setLoading(true);
      const encryptedPayload = encryptPayloadClient({ email, otp });
      const res = await verifyLoginOtp({ encryptedPayload });
      toast.success("OTP verified successfully");
      localStorage.setItem("token", res.token);
      
      const userRole = res.user?.role?.name?.toLowerCase().trim();
      if (userRole === "super admin" || userRole === "event manager") {
        navigate("/admin/dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Invalid OTP");
    } finally { setLoading(false); }
  };

  const handleResendOtp = async () => {
    if (timer !== 0) return;
    try {
      setLoading(true);
      await sendLoginOtp({ email });
      toast.success("OTP resent successfully");
      setOtp("");
      setTimer(300);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to resend OTP");
    } finally { setLoading(false); }
  };

  return (
    <div className="bg-gradient-orange lg:bg-white w-full flex flex-col lg:flex-row overflow-hidden relative">
      
      {showInstallBtn && (
        <div className="fixed top-0 left-0 w-full z-[100] animate-in slide-in-from-top duration-500">
          <div className="bg-[#1F4788] text-white px-4 py-3 flex items-center justify-between shadow-lg border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="bg-white p-1 rounded-md hidden sm:block">
                <img src={logo} alt="icon" className="h-6 w-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold leading-none">BRICS India 2026 App</span>
                <span className="text-[10px] opacity-80 mt-1">Install for a seamless mobile experience & notifications</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowInstallBtn(false)} 
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
              <button 
                onClick={handleInstallClick}
                className="bg-[#F4C430] text-[#1F4788] font-bold text-xs px-5 py-2 rounded-lg flex items-center gap-2 shadow-md hover:bg-[#eab308] transition-all"
              >
                <Download size={14} /> INSTALL
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`flex justify-center items-center w-full lg:w-[60%] lg:h-screen relative transition-all duration-300 ${showInstallBtn ? 'pt-14 lg:pt-0' : ''}`}>
        <div className="w-full h-[360px] sm:h-[420px] lg:h-full flex flex-col items-center justify-center bg-gradient-orange relative sm:px-8 pt-4 lg:pt-0">
          <div className="fixed lg:absolute bottom-0 left-0 w-24 h-24 sm:w-32 sm:h-32 md:w-48 md:h-48 z-40">
            <img src={vector2} alt="art" className="rotate-[90deg]" />
          </div>

          <div className="w-full max-w-[320px] sm:max-w-[480px] lg:max-w-[650px] aspect-[16/9] rounded-[16px] overflow-hidden relative bg-gray-200 shadow-lg border-4 border-white/20">
            {slides.map((img, index) => (
              <img
                key={img}
                src={img}
                alt="Slide"
                onError={(e) => { e.target.src = "https://via.placeholder.com/800x500/1F4788/FFFFFF?text=BRICS+India+2026"; }}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${index === currentSlide ? "opacity-100" : "opacity-0"}`}
              />
            ))}
          </div>

          <div className="flex gap-3 mt-4">
            {slides.map((_, index) => (
              <span key={index} className={`h-[3px] w-[24px] rounded-full transition-all duration-300 ${index === currentSlide ? "bg-[#1F4788] w-[32px]" : "bg-[#D0D5DD]"}`} />
            ))}
          </div>

          <div className="w-[90%] max-w-[520px] mt-4 text-center">
            <p className="text-base sm:text-lg lg:text-3xl tracking-wide leading-snug lg:leading-[40px] font-bold text-[#1F4788]">
              Building for Resilience, Innovation, Cooperation and Sustainability
            </p>
          </div>

          <div className="fixed lg:absolute bottom-0 left-0 right-0 w-full h-[4px] flex z-50">
            <span className="flex-1 bg-[#1F4788]" /><span className="flex-1 bg-[#F4C430]" /><span className="flex-1 bg-[#f69434]" /><span className="flex-1 bg-[#2FA84F]" /><span className="flex-1 bg-[#E63946]" />
          </div>
        </div>
      </div>

      <div className={`flex flex-col justify-start lg:justify-center items-center sm:px-6 lg:px-10 w-full lg:w-[40%] lg:min-h-screen py-6 pb-8 lg:pb-0 lg:py-0 rounded-t-3xl lg:rounded-none shadow-2xl lg:shadow-none relative bg-white transition-all duration-300 ${showInstallBtn ? 'mt-4 lg:mt-0' : ''}`}>
        <div className="w-full max-w-md sm:max-w-lg lg:max-w-none lg:px-16 bg-white lg:bg-transparent p-6 sm:p-8 lg:p-0">
          <div className="text-center mb-6">
            <div className="flex justify-center items-center gap-3 mb-4">
              <img src={import.meta.env.VITE_BRICS_LOGO_URL || logo} alt="BRICS India 2026" className="h-14 sm:h-20" />
            </div>
            <h1 className="text-lg sm:text-2xl font-semibold text-[#101828] py-2">Login to your Account</h1>
          </div>

          <div className="text-left space-y-5">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Email <span className="text-red-500">*</span></label>
              <input
                type="email"
                value={email}
                disabled={otpSent}
                onChange={(e) => { setEmail(e.target.value); if (isValidEmail) setEmailError(""); }}
                onKeyPress={(e) => e.key === "Enter" && !otpSent && !loading && handleSendOtp()}
                placeholder="Enter your Email"
                className="w-full h-[48px] px-4 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#1F4788] focus:border-transparent outline-none disabled:bg-gray-50 transition-all"
              />
              {emailError && <p className="text-xs text-red-500 mt-1 font-medium">{emailError}</p>}
            </div>

            {!otpSent ? (
              <button 
                onClick={handleSendOtp} 
                disabled={!isValidEmail || loading} 
                className={`w-full h-[48px] rounded-lg font-bold text-white transition-all ${!isValidEmail || loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#1F4788] hover:bg-[#163463] shadow-md active:scale-[0.98]'}`}
              >
                {loading ? "Sending..." : "Send OTP"}
              </button>
            ) : (
              <div className="space-y-6 animate-in fade-in duration-500">
                <p className="text-sm text-[#6F7D94]">Enter the 6 digit OTP sent to your email ID</p>
                <div className="flex justify-between gap-2">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <input
                      key={index}
                      ref={(el) => (otpInputsRef.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={otp[index] || ""}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        if (val.length <= 1) {
                          const newOtp = otp.split("");
                          newOtp[index] = val;
                          setOtp(newOtp.join(""));
                          if (val && index < 5) otpInputsRef.current[index + 1]?.focus();
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Backspace") {
                          if (!otp[index] && index > 0) otpInputsRef.current[index - 1]?.focus();
                          else { const newOtp = otp.split(""); newOtp[index] = ""; setOtp(newOtp.join("")); }
                        } else if (e.key === "Enter" && isValidOtp && !loading) handleVerifyOtp();
                      }}
                      className="w-full h-[52px] rounded-lg border border-gray-300 text-center text-lg font-bold text-[#101828] focus:ring-2 focus:ring-[#1F4788] outline-none"
                    />
                  ))}
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Didn't get the code?</span>
                  {timer > 0 ? (
                    <span className="text-[#1F4788] font-medium">Resend in {Math.floor(timer/60)}:{(timer%60).toString().padStart(2,"0")}</span>
                  ) : (
                    <button onClick={handleResendOtp} className="text-[#1F4788] font-bold underline hover:text-blue-800 transition-colors">Resend OTP</button>
                  )}
                </div>
                <button 
                  onClick={handleVerifyOtp} 
                  disabled={!isValidOtp || loading} 
                  className={`w-full h-[48px] rounded-lg font-bold text-white shadow-lg active:scale-[0.98] transition-all ${!isValidOtp || loading ? 'bg-gray-400' : 'bg-[#1F4788] hover:bg-[#163463]'}`}
                >
                  {loading ? "Verifying..." : "Verify & Continue"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisitorLogin;