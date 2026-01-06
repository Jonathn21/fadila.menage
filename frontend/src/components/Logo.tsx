import React from "react";

const Logo = () => {
  return (
    <div className="flex items-center">
      <div className="w-10 h-10 relative">
        <img 
          src="/images/ceb-logo.png" 
          alt="CEB Logo" 
          className="w-full h-full object-contain"
        />
      </div>
      <span className="ml-3 text-xl font-bold text-gray-800 group-hover:text-red-600 transition-colors duration-300 tracking-tight">
        GESTAGES
      </span>
    </div>
  );
};

export default Logo;
