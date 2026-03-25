import React from "react";
import { ClipLoader } from "react-spinners";

const PageLoader = () => {
  return (
    <div
      style={{
        height: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
      }}
    >
      <ClipLoader size={45} color="#F97316" />
    </div>
  );
};

export default PageLoader;
