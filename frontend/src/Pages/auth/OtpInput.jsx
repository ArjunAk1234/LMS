import React, { useState, useRef, useEffect } from "react";
import "./OtpInput.css";

const OtpInput = ({ length = 6, onOtpSubmit = () => {}, email, resendOtp = () => {} }) => {
  const [otp, setOtp] = useState(new Array(length).fill(""));
  const [timeLeft, setTimeLeft] = useState(60);
  const [isResendDisabled, setIsResendDisabled] = useState(true);
  const [error, setError] = useState("");
  const inputRefs = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    startResendTimer();
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);
  
  const startResendTimer = () => {
    setTimeLeft(60);
    setIsResendDisabled(true);
    
    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setIsResendDisabled(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  

  const handleChange = (index, e) => {
    const value = e.target.value;
    if (isNaN(value)) return;
    
    setError(""); // Clear any errors when user types
    
    const newOtp = [...otp];
    // Only keep the last character if multiple characters are entered
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    const combinedOtp = newOtp.join("");
    if (combinedOtp.length === length) {
      // animation delay
      setTimeout(() => {
        onOtpSubmit(combinedOtp);
      }, 300);
    }

    // Move to next input if current field is filled
    if (value && index < length - 1) {
      // Find the next empty field or focus on next field
      const nextEmptyIndex = findNextEmptyIndex(newOtp, index);
      if (nextEmptyIndex !== -1 && inputRefs.current[nextEmptyIndex]) {
        inputRefs.current[nextEmptyIndex].focus();
      }
    }
  };

  // Find the next empty input field
  const findNextEmptyIndex = (otpArray, currentIndex) => {
    // First look for empty fields after the current index
    for (let i = currentIndex + 1; i < length; i++) {
      if (!otpArray[i]) return i;
    }
    // If no empty fields after current, find any empty field
    for (let i = 0; i < length; i++) {
      if (!otpArray[i]) return i;
    }
    // If all fields are filled, return next index or last index
    return currentIndex < length - 1 ? currentIndex + 1 : -1;
  };

  const handleClick = (index) => {
    // If there's text, position cursor at end
    if (otp[index]) {
      inputRefs.current[index].setSelectionRange(1, 1);
    }
    
    // If clicking on an index but previous fields are empty, 
    // focus on the first empty field instead
    if (index > 0) {
      const emptyIndex = otp.indexOf("");
      if (emptyIndex !== -1 && emptyIndex < index) {
        inputRefs.current[emptyIndex].focus();
      }
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace - move to previous field when current is empty
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0 && inputRefs.current[index - 1]) {
        inputRefs.current[index - 1].focus();
      }
    }
    
    // Handle right arrow key - move to next field
    else if (e.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1].focus();
    }
    
    // Handle left arrow key - move to previous field
    else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  // Handle pasting OTP
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    if (!pastedData || isNaN(pastedData)) return;

    const newOtp = [...otp];
    for (let i = 0; i < Math.min(length, pastedData.length); i++) {
      if (!isNaN(pastedData[i])) {
        newOtp[i] = pastedData[i];
      }
    }
    
    setOtp(newOtp);
    
    // Find next empty field after paste
    const nextEmptyIndex = newOtp.indexOf("");
    if (nextEmptyIndex !== -1) {
      inputRefs.current[nextEmptyIndex].focus();
    } else {
      // If all filled, focus on last field
      inputRefs.current[length - 1].focus();
    }
    
    // Submit if complete
    const combinedOtp = newOtp.join("");
    if (combinedOtp.length === length) {
      setTimeout(() => {
        onOtpSubmit(combinedOtp);
      }, 300);
    }
  };

  const handleResendOtp = async () => {
    // Reset OTP fields
    setOtp(new Array(length).fill(""));
    
    // Call the resendOtp function passed as prop
    const success = await resendOtp();
    
    if (success) {
      // Only restart timer if resend was successful
      startResendTimer();
      
      // Focus on first input
      if (inputRefs.current[0]) {
        inputRefs.current[0].focus();
      }
    } else {
      setError("Failed to resend OTP. Please try again.");
      // Don't restart timer if resend failed
      setIsResendDisabled(false);
    }
  };

  // Format time as MM:SS
  const formatTime = (seconds) => {
    return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  return (
    <div className="otp-wrapper">
      <div className={`otp-input-container ${otp.every(val => val !== "") ? "complete" : ""}`}>
        {otp.map((value, index) => (
          <input
            key={index}
            type="text"
            inputMode="numeric"
            ref={(input) => (inputRefs.current[index] = input)}
            value={value}
            onChange={(e) => handleChange(index, e)}
            onClick={() => handleClick(index)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={index === 0 ? handlePaste : null} // Only allow paste on first input
            maxLength={1}
            className="otpInput"
            autoComplete="off"
          />
        ))}
      </div>
      
      {error && <p className="otp-error">{error}</p>}
      
      <div className="resend-otp">
        {isResendDisabled ? (
          <>Resend OTP in <span className="resend-timer">{formatTime(timeLeft)}</span></>
        ) : (
          <>Didn't receive? <a href="#" onClick={handleResendOtp}>Resend OTP</a></>
        )}
      </div>
      
      <button className="otp-submit-btn" 
        onClick={() => onOtpSubmit(otp.join(""))}
        disabled={otp.includes("")}>
        Verify OTP
      </button>
    </div>
  );
};

export default OtpInput;