import React from "react";
import logo1 from "../assets/images/logo1.svg";
import national from "../assets/images/national-emblem.svg";
import open_in_new from "../assets/images/open_in_new.svg";
import { IoArrowBack } from "react-icons/io5";
import { useNavigate } from "react-router-dom";

const BricsHeader = () => {
  const navigate = useNavigate();
  const frontendUrl = import.meta.env.VITE_FRONTEND_URL;
  return (
    <div className="w-full h-[80px] mx-auto flex items-center justify-center  px-2 sm:px-0">
      <div className="mx-auto w-full max-w-[1400px] flex items-center justify-between px-8 py-4 bg-transparent rounded-full inset-x-0">
        <div className="flex gap-3 items-center">
          <img
            src={logo1}
            alt=""
            className="w-[46px] h-[38px] md:w-[78px] md:h-[57px]"
          />
        </div>
        <div
          className="flex items-center gap-3 sm:gap-2 cursor-pointer text-[#1F4788]"
          target="_blank"
          onClick={() => {}}
        >
          <div
            className="flex items-center justify-center gap-1 group"
            onClick={() => navigate(frontendUrl)}
          >
            <IoArrowBack
              size={22}
              className="group-hover:-translate-x-1 transition-all duration-200"
            />
            <p className=" text-sm sm:text-xl  group-hover:underline">Home</p>
          </div>
          {/* <div>
              <button className='secondary-button' onClick={() => navigate('/login')}>Login</button>
            </div> */}
        </div>
      </div>
    </div>
  );
};

export default BricsHeader;
