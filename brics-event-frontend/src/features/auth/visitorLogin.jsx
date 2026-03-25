import React, { useEffect, useState, useRef } from "react"; 
import { Lock, Mail, Check, Download, X } from "lucide-react"; 
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { sendLoginOtp, verifyLoginOtp } from "../../services/auth";
import { encryptPayloadClient } from "../../utils/otpEncryption";

import logo from "../../assets/images/logo1.svg";
import vector2 from "../../assets/images/vector2.svg";

const slides = [
  "/01.svg",
  "/02.svg",
  "/03.svg",
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
    <div className="bg-[#f2f4f7] lg:bg-white w-full min-h-screen flex flex-col lg:flex-row relative overflow-x-hidden overflow-y-auto">
      
      {showInstallBtn && (
        <div className="fixed top-0 left-0 w-full z-[100] animate-in slide-in-from-top duration-500">
          <div className="bg-[#1F4788] text-white px-4 py-3 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2">
              <div className="bg-white p-1 rounded hidden sm:block">
                <img src={logo} alt="icon" className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold leading-none">BRICS 2026 App</span>
                <span className="text-[10px] opacity-80">Install for best experience</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowInstallBtn(false)} className="p-1"><X size={16} /></button>
              <button onClick={handleInstallClick} className="bg-[#F4C430] text-[#1F4788] font-bold text-[10px] px-3 py-1.5 rounded-md flex items-center gap-1">
                <Download size={12} /> INSTALL
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`hidden lg:flex flex-col justify-center items-center lg:w-[55%] lg:min-h-screen relative bg-[#FFF9F2] transition-all duration-300 ${showInstallBtn ? 'pt-16 lg:pt-0' : ''}`}>
        
        <div className="absolute bottom-10 left-0 w-64 h-64 opacity-20 pointer-events-none">
          <img src={vector2} alt="art" className="w-full h-full object-contain" />
        </div>

        <div className="w-full h-full flex flex-col items-center justify-center relative px-8 z-10">
          <div className="w-full max-w-[600px] aspect-[16/10] rounded-2xl overflow-hidden relative shadow-lg bg-white">
            {slides.map((img, index) => (
              <img
                key={img}
                src={img}
                alt={`Slide ${index + 1}`}
                onError={(e) => { e.target.src = "https://via.placeholder.com/800x500/1F4788/FFFFFF?text=BRICS+India+2026"; }}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${index === currentSlide ? "opacity-100" : "opacity-0"}`}
              />
            ))}
          </div>
          
          <div className="flex gap-2 mt-6">
            {slides.map((_, index) => (
              <span key={index} className={`h-[4px] rounded-full transition-all duration-300 ${index === currentSlide ? "bg-[#1F4788] w-[30px]" : "bg-[#D0D5DD] w-[16px]"}`} />
            ))}
          </div>

          <div className="w-[90%] max-w-[500px] mt-6 text-center">
            <p className="text-[28px] leading-[36px] font-bold text-[#1F4788]">
              Building for Resilience, Innovation, Cooperation and Sustainability
            </p>
          </div>
        </div>
      </div>

      <div className={`flex flex-col items-center justify-start lg:justify-center w-full lg:w-[45%] bg-[#FAF5F0] lg:bg-white min-h-screen relative ${showInstallBtn ? 'pt-16 lg:pt-0' : ''}`}>
        
        <div className="w-full flex justify-center items-center gap-4 pt-10 pb-6 lg:pt-0 lg:pb-8">
          <img src="/04.svg" alt="Govt of India" className="h-12 lg:h-16 object-contain" />
          <div className="h-10 w-[1px] bg-gray-300 hidden lg:block"></div>
          <img src={import.meta.env.VITE_BRICS_LOGO_URL || logo} alt="BRICS India 2026" className="h-12 lg:h-16 object-contain" />
        </div>

        <div className="w-full max-w-md px-6 py-10 pb-40 lg:pb-10 bg-white rounded-t-[40px] lg:rounded-none shadow-[0_-8px_30px_rgba(0,0,0,0.05)] lg:shadow-none flex-1 lg:flex-none">
          
          <h1 className="text-xl lg:text-[22px] font-bold text-center text-[#101828] mb-8">Login to your Account</h1>

          <div className="space-y-6">
            <div className="text-left">
              <label className="block text-sm font-semibold text-[#344054] mb-2">Email</label>
              <input
                type="email"
                value={email}
                disabled={otpSent}
                onChange={(e) => { setEmail(e.target.value); if (isValidEmail) setEmailError(""); }}
                onKeyPress={(e) => e.key === "Enter" && !otpSent && !loading && handleSendOtp()}
                placeholder="Enter your Email"
                className="w-full h-[46px] px-4 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#1F4788] focus:border-transparent outline-none disabled:bg-gray-50 transition-all placeholder:text-gray-400"
              />
              {emailError && <p className="text-xs text-red-500 mt-1">{emailError}</p>}
            </div>

            {!otpSent ? (
              <button 
                onClick={handleSendOtp} 
                disabled={!isValidEmail || loading} 
                className={`w-full h-[46px] rounded-lg font-medium text-white transition-all shadow-sm active:scale-[0.98] ${!isValidEmail || loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#1F4788] hover:bg-[#163463]'}`}
              >
                {loading ? "Sending..." : "Send OTP"}
              </button>
            ) : (
              <div className="space-y-5 animate-in fade-in duration-500">
                <p className="text-sm text-[#475467]">Enter the 6 digit OTP sent to your email ID</p>
                
                <div className="flex justify-between gap-2 sm:gap-3">
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
                        if (e.key === "Backspace" && !otp[index] && index > 0) otpInputsRef.current[index - 1]?.focus();
                        else if (e.key === "Enter" && isValidOtp && !loading) handleVerifyOtp();
                      }}
                      className="w-[45px] sm:w-[50px] h-[50px] rounded-lg border border-gray-300 text-center text-lg font-bold text-[#101828] focus:ring-2 focus:ring-[#1F4788] outline-none"
                    />
                  ))}
                </div>
                
                <div className="flex justify-end items-center text-xs mt-2">
                    <span className="text-[#667085]">
                        {timer > 0 ? `Resend OTP in 00:${(timer%60).toString().padStart(2,"0")}` : 
                        <button onClick={handleResendOtp} className="text-[#1F4788] font-bold">Resend OTP</button>}
                    </span>
                </div>

                <button 
                    onClick={handleVerifyOtp} 
                    disabled={!isValidOtp || loading} 
                    className={`w-full h-[46px] rounded-lg font-medium text-white shadow-sm active:scale-[0.98] transition-all mt-4 ${!isValidOtp || loading ? 'bg-[#98A2B3]' : 'bg-[#1F4788] hover:bg-[#163463]'}`}
                >
                    {loading ? "Verifying..." : "Verify & Continue"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 w-full flex h-[6px] z-50 pointer-events-none">
        <span className="flex-1 bg-[#1F4788]" />
        <span className="flex-1 bg-[#F4C430]" />
        <span className="flex-1 bg-[#f69434]" />
        <span className="flex-1 bg-[#2FA84F]" />
        <span className="flex-1 bg-[#E63946]" />
      </div>

    </div>
  );
};

export default VisitorLogin;