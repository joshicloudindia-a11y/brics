import React, { useState } from 'react';
import StepOne from './steps/StepOne';
import StepTwo from './steps/StepTwo';
import StepThree from './steps/StepThree';
import StepFour from './steps/StepFour';
import BricsHeader from '../../components/ui/BricsHeader';
import line_bar from "../../assets/images/line_bar.svg";
import vector1 from "../../assets/images/vector1.svg";
import vector2 from "../../assets/images/vector2.svg";

import { FaUserGroup } from "react-icons/fa6";
import { MdVerifiedUser } from "react-icons/md";
import { IoMdLock } from "react-icons/io";
import { ImUserCheck } from "react-icons/im";
import StepFive from './steps/StepFive';




const EventRegistration = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [registrationData, setRegistrationData] = useState({});

  const steps = [
    { id: 1, name: 'Select Category', icon: <FaUserGroup size={24}/> },
    { id: 2, name: 'Verification', icon: <MdVerifiedUser size={24}/> },
    // { id: 3, name: 'Set Password', icon: <IoMdLock size={24}/> },
    // { id: 3, name: 'Complete Profile', icon: <ImUserCheck size={24}/> },
    // { id: 4, name: 'Registration Complete', icon: <ImUserCheck size={24}/> },
  ];

  const handleNext = (data) => {
    setRegistrationData((prev) => ({ ...prev, ...data }));
    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };
const StepIndicator = ({ step, isActive, isCompleted, isLast, index }) => (
  <div 
    className="flex-1 relative bg-transparent" 
    style={{ 
      zIndex: isActive ? 30 : isCompleted ? 20 : 10,
      marginRight: !isLast ? '-20px' : '0'
    }}
  >
    <div 
      className={`
        relative h-12 md:h-14 flex items-center justify-center gap-1 md:gap-2 
        px-2 sm:px-4 md:px-6 mx-1 md:mx-2
        font-medium text-xs sm:text-sm transition-all duration-200 
        ${isActive 
          ? 'bg-orange-500 text-white shadow-md rounded-tr-xl border-2 border-orange-400 z-20' 
          : isCompleted 
          ? 'bg-white text-green-600 border-2 border-orange-400 z-10 -mr-4 md:-mr-6 shadow-2xl shadow-gray-900' 
          : 'bg-white text-gray-500 border-2 border-orange-400 -ml-4 md:-ml-6'
        }
        ${isLast ? 'rounded-t-2xl' : 'rounded-2xl'}
      `}
    >
      {/* Icon */}
      {isCompleted ? (
        <svg className="w-4 h-4 md:w-5 md:h-5 mb-1 md:mb-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path 
            fillRule="evenodd" 
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
            clipRule="evenodd" 
          />
        </svg>
      ) : isActive ? (
        <span className='mb-1 md:mb-2 text-white font-bold flex-shrink-0 text-lg md:text-xl'>
          {step.icon}
        </span>
      ) : (
        <span className='mb-1 md:mb-2 text-gray-500 flex-shrink-0 text-lg md:text-xl'>
          {step.icon}
        </span>
      )}
      
      {/* Step Name - Desktop */}
      <span className="hidden sm:inline whitespace-nowrap mb-1 md:mb-2 text-xs md:text-base">
        {step.name}
      </span>
      
      {/* Step Number - Mobile Only */}
      <span className="sm:hidden text-[14px] mr-6 font-semibold">
        {step.id}
      </span>
    </div>
  </div>
);

// Update usage:
{steps.map((step, index) => (
  <StepIndicator
    key={step.id}
    step={step}
    index={index}
    isActive={currentStep === step.id}
    isCompleted={currentStep > step.id}
    isLast={index === steps.length - 1}
  />
))}

  return (
    <div className="bg-gradient-orange h-screen overflow-hidden relative flex flex-col">
      {/* Header - No top margin/padding */}
      <div className="fixed top-0 w-full inset-x-0 max-w-[1440px] left-1/2 -translate-x-1/2 z-50 pt-4 px-4">
        <BricsHeader />
      </div>

      {/* Main Content - Scrollable Area */}
      <main className="flex-1 overflow-y-auto pt-24 pb-16">
        <div className="flex items-center justify-center min-h-full px-4">
          <div className="max-w-4xl mx-auto w-full">
            {/* Title Section */}
            <div className="text-center mb-8 relative">
              <h1 className="text-5xl font-bold text-gray-900 mb-2">Login</h1>
              {/* <p className="text-gray-600">BRICS India 2026</p> */}
              {/* <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                <img src={vector1} alt="" className="w-[144px] h-[144px]" />
              </div> */}
            </div>

            {/* Step Indicator and Form */}
            <div className="rounded-2xl relative z-20 mt-16">
              {/* Step Indicators */}
              <div className="flex bg-transparent absolute inset-x-0 -top-10 -z-20">
                {steps.map((step, index) => (
                  <StepIndicator
                    key={step.id}
                    step={step}
                    isActive={currentStep === step.id}
                    isCompleted={currentStep > step.id}
                    isLast={index === steps.length - 1}
                  />
                ))}
              </div>
              
              <div className='border-[1px] border-orange-400 rounded-2xl overflow-hidden z-10'>
                {/* Form Content - Fixed Height with Internal Scroll */}
                {/* h-[560px] overflow-y-auto */}
                <div className="p-8 bg-white rounded-b-2xl w-full min-h-[505px]">
                  {currentStep === 1 && (
                    <StepOne onNext={handleNext} defaultValues={registrationData} />
                  )}
                  {currentStep === 2 && (
                    <StepTwo 
                      onNext={handleNext} 
                      onBack={handleBack}
                      defaultValues={registrationData} 
                    />
                  )}
                  {/* {currentStep === 3 && (
                    <StepThree 
                      onNext={handleNext} 
                      onBack={handleBack}
                      defaultValues={registrationData}
                      participantType={registrationData.participantType}
                      country={registrationData.country}
                    />
                  )} */}
                  {/* {currentStep === 3 && (
                    <StepFour  
                      onNext={handleNext} 
                      onBack={handleBack}
                      defaultValues={registrationData} />
                  )}

                  {currentStep === 4 && (
                    <StepFive registrationData={registrationData} />
                  )} */}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Decorative Vectors */}
      <div className="absolute bottom-0 left-0 rotate-[100deg] max-w-[230px] hidden md:block pointer-events-none">
        <img src={vector2} alt="" />
      </div>
      <div className="absolute right-0 bottom-0 max-w-[330px] hidden md:block pointer-events-none">
        <img src={vector2} alt="" className="w-full" />
      </div>

      {/* Bottom Progress Bar */}
      <div className="w-full absolute bottom-0 pointer-events-none">
        <img src={line_bar} alt="" className="w-full" />
      </div>
    </div>
  );
};

export default EventRegistration;
