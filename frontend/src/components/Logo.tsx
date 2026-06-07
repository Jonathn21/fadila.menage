import React from "react";

const Logo = () => {
  return (
    <div className="flex items-center">
      <div className="w-14 h-14 relative">
        <img 
          src="/images/ceb-logo.png" 
          alt="CEB Logo" 
          className="w-full h-full object-contain"
        />
      </div>
      
    </div>
  );
};

export default Logo;
