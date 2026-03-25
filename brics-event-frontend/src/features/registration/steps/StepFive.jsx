import React, { useState,useEffect } from 'react';
import axios from "axios";
const StepFive = ({ registrationData }) => {
  const [copied, setCopied] = useState(false);
  const [registrationId, setRegistrationId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const handleCopy = () => {
    navigator.clipboard.writeText(registrationId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };


  useEffect(() => {
    if (registrationData?.user_code) {
      setRegistrationId(registrationData.user_code);
      setLoading(false);
    }
  }, [registrationData]);


  return (
    <div className="space-y-8 py-8">
      {/* Success Animation */}
      <div className="flex justify-center">
        <div className="relative">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center animate-pulse">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          {/* Decorative dots */}
          <div className="absolute -top-2 -left-2 w-3 h-3 bg-orange-400 rounded-full animate-bounce"></div>
          <div className="absolute -top-2 -right-2 w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="absolute -bottom-2 -left-2 w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <div className="absolute -bottom-2 -right-2 w-3 h-3 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
        </div>
      </div>

      {/* Thank You Message */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">Thank You!</h1>
        <p className="text-lg text-gray-700 font-medium">
          Your Details have been submitted successfully.
        </p>
      </div>

      {/* Registration ID */}
      <div className="flex flex-col items-center space-y-3">
        <p className="text-sm text-gray-600 font-medium">Your Registration ID</p>
        <div className="flex items-center gap-3 bg-orange-50 border-2 border-orange-300 rounded-lg px-6 py-4">
          <span className="text-2xl font-bold text-orange-600 tracking-wider">
            {registrationId}
          </span>
          <button
            onClick={handleCopy}
            className="p-2 hover:bg-orange-100 rounded transition-colors"
            title="Copy to clipboard"
          >
            {copied ? (
              <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Explore Button */}
      <div className="flex justify-center">
        <button className="px-8 py-3 border-2 border-[#1e4788] text-[#1e4788] rounded-lg hover:bg-blue-50 font-medium transition-colors">
          Explore BRICS India 2026
        </button>
      </div>

      {/* Disclaimer */}
      <div className="max-w-3xl mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <p className="text-sm text-gray-700 text-center leading-relaxed">
            Issuance of Entry Passes are subject to approval from the secretariat. A separate 
            communication will be sent with entry passes (if approved) at you registered email ID
          </p>
        </div>
      </div>

      {/* Additional Actions */}
      {/* <div className="flex justify-center gap-4 pt-4">
        <button 
          onClick={() => window.print()}
          className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print
        </button>
        <button 
          onClick={() => window.location.href = 'mailto:?subject=My BRICS Registration&body=My Registration ID: ' + registrationId}
          className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Email
        </button>
      </div> */}
    </div>
  );
};

export default StepFive;