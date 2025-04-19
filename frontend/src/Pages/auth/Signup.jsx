import { useState } from "react";
import { BsEnvelope, BsLock, BsPerson, BsEye, BsEyeSlash, BsArrowLeft } from "react-icons/bs";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "./Signup.css";
import OtpInput from "./OtpInput";

function SignUp() {
  const [signUpData, setSignUpData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  function handleUserInput(e) {
    const { name, value } = e.target;
    setSignUpData({ ...signUpData, [name]: value });
  }

  async function handleSignUp(event) {
    event.preventDefault();
    setError("");
    
    if (signUpData.password !== signUpData.confirmPassword) {
      setError("Passwords do not match!");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Request OTP
      const otpRes = await axios.post("http://localhost:8000/request-otp1", {
        email: signUpData.email,
      });

      if (otpRes.data) {
        setShowOtpInput(true);
      } else {
        setError("Failed to send OTP. Please try again later.");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }
  
  const resendOtp = async () => {
    setIsLoading(true);
    try {
      const otpRes = await axios.post(
        "http://localhost:8000/request-otp1",
        { email: signUpData.email }
      );
      
      return !!otpRes.data; // Return true if successful
    } catch (err) {
      setError("Failed to resend OTP. Please try again.");
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleBackToSignup = () => {
    setShowOtpInput(false);
  };

  const onOtpSubmit = async (otp) => {
    setIsLoading(true);
    try {
      // Verify OTP
      const verifyRes = await axios.post(
        "http://localhost:8000/verify-otp1",
        { email: signUpData.email, otp }
      );
      
      if (verifyRes.data) {
        // Register the user after OTP verification
        const registerRes = await axios.post("http://localhost:8000/register", {
          username: signUpData.name,
          email: signUpData.email,
          password: signUpData.password,
        });

        if (registerRes.data.success) {
          // Add success animation or notification here
          setTimeout(() => {
            console.log("Registration success. Redirecting to login...");

            navigate("/login"); // Redirect to login after successful registration
          }, 500);
        } else {
          setError(registerRes.data.message || "Registration failed. Please try again.");
        }
      } else {
        setError("Invalid OTP! Please try again.");
      }
    } catch (err) {
      setError("OTP verification failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="signup-container">
      {!showOtpInput ? (
        <form onSubmit={handleSignUp} className="signup-form">
          {/* Left side with form inputs */}
          <div className="form-content">
            <div>
              <h1>Sign Up</h1>
            </div>
            <hr />

            <div className="input-group">
              <label htmlFor="name">
                <BsPerson />
              </label>
              <input
                type="textbox"
                name="name"
                id="name"
                placeholder="Enter Name"
                value={signUpData.name}
                onChange={handleUserInput}
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="email">
                <BsEnvelope />
              </label>
              <input
                type="email"
                name="email"
                id="email"
                placeholder="Enter Email"
                value={signUpData.email}
                onChange={handleUserInput}
                required
              />
            </div>

            <div className="input-group password-field">
              <label htmlFor="password">
                <BsLock />
              </label>
              <input
                type={showPassword ? "textbox" : "password"}
                name="password"
                id="password"
                placeholder="Enter Password"
                value={signUpData.password}
                onChange={handleUserInput}
                required
              />
              <span
                onClick={() => setShowPassword(!showPassword)}
                style={{ cursor: "pointer", marginLeft: "10px" }}
              >
                {showPassword ? <BsEyeSlash size={24} /> : <BsEye size={24} />}
              </span>
            </div>

            <div className="input-group password-field">
              <label htmlFor="confirmPassword">
                <BsLock />
              </label>
              <input
                type={showPassword ? "textbox" : "password"}
                name="confirmPassword"
                id="confirmPassword"
                placeholder="Enter Password"
                value={signUpData.confirmPassword}
                onChange={handleUserInput}
                required
              />
              <span
                onClick={() => setShowPassword(!showPassword)}
                style={{ cursor: "pointer", marginLeft: "10px" }}
              >
                {showPassword ? <BsEyeSlash size={24} /> : <BsEye size={24} />}
              </span>
            </div>

            {error && <p className="error-message">{error}</p>}

            <button
              type="submit" 
              className="signup-btn"
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : "Sign Up"}
            </button>
            <p className="footer-text">
              Already have an account? <Link to="/login">Login</Link> here
            </p>
          </div>

          {/* Right side welcome message */}
          <div className="welcome-message">
            <h1>New here? Create your account now!</h1>
          </div>
        </form>
      ) : (
        <div className="otp-container">
          <button className="otp-back-btn" onClick={handleBackToSignup}>
            <BsArrowLeft /> Back to Signup
          </button>
          
          <h1>Verification Required</h1>
          <p>We've sent a verification code to <strong>{signUpData.email}</strong></p>
          
          <OtpInput 
            length={6} 
            onOtpSubmit={onOtpSubmit} 
            email={signUpData.email}
            resendOtp={resendOtp} 
          />
          
          {error && <p className="otp-error">{error}</p>}
        </div>
      )}
    </div>
  );
}

export default SignUp;