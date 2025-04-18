import { useState } from "react";
import { BsEnvelope, BsLock, BsEye, BsEyeSlash, BsArrowLeft } from "react-icons/bs";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../components/Layout/AuthContext";  // Import useAuth
import "./Login.css";
import OtpInput from "./OtpInput";

function LogIn() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const { checkUserRole } = useAuth();  // Access checkUserRole from AuthContext

  function handleUserInput(e) {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  }

  // Login User
  async function handleLogin(event) {
    event.preventDefault();
    setError("");
    setIsLoading(true);
    
    try {
      const res = await axios.post("http://localhost:8000/login", {
        email: formData.email,
        password: formData.password,
      });

      if (res.data && res.data.token) {
        const authToken = res.data.token;
        setToken(authToken);
        localStorage.setItem("token", authToken);
        localStorage.setItem("email", formData.email);

        // Request OTP after successful login
        const otpRes = await axios.post(
          "http://localhost:8000/request-otp1",
          { email: formData.email },
          { headers: { Authorization: `Bearer ${authToken}` } }
        );

        if (otpRes.data) {
          setShowOtpInput(true);
        }

        // Check the role of the user (after OTP)
        await checkUserRole(formData.email); // This will set the user state and role
      } else {
        setError("Invalid credentials!");
      }
    } catch (err) {
      setError("Login failed! Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  }

  const resendOtp = async () => {
    setIsLoading(true);
    try {
      // This is the same API call you use when initially requesting an OTP
      const otpRes = await axios.post(
        "http://localhost:8000/request-otp1",
        { email: formData.email },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      return !!otpRes.data; // Return true if successful
    } catch (err) {
      setError("Failed to resend OTP. Please try again.");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setShowOtpInput(false);
  };

  const onOtpSubmit = async (otp) => {
    setIsLoading(true);
    try {
      // Verify OTP
      const verifyRes = await axios.post(
        "http://localhost:8000/verify-otp1",
        { email: formData.email, otp },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (verifyRes.data) {
        // Add success animation or notification here
        setTimeout(() => {
          navigate("/dashboard"); // Redirect after short delay for animation
        }, 500);
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
    <div className="login-container">
      {!showOtpInput ? (
        <form onSubmit={handleLogin} className="login-form">
          {/* Left side with form inputs */}
          <div className="form-content">
            <div>
              <h1>Log In</h1>
            </div>
            <hr />

            <div className="input-group">
              <label htmlFor="email">
                <BsEnvelope />
              </label>
              <input
                type="email"
                name="email"
                id="email"
                placeholder="Enter Email"
                value={formData.email}
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
                value={formData.password}
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

            {error && <p className="error-text">{error}</p>}

            <button 
              type="submit" 
              className="login-btn"
              disabled={isLoading}
            >
              {isLoading ? "Logging In..." : "Log In"}
            </button>
            <p className="footer-text">
              Don't have an account?{" "}
              <Link to={"/signup"}>Signup</Link> here
            </p>
          </div>

          {/* Right side welcome message */}
          <div className="welcome-message">
            <h1>Welcome to Summer School!</h1>
          </div>
        </form>
      ) : (
        <div className="otp-container">
          <button className="otp-back-btn" onClick={handleBackToLogin}>
            <BsArrowLeft /> Back to Login
          </button>
          
          <h1>Verification Required</h1>
          <p>We've sent a verification code to <strong>{formData.email}</strong></p>
          
          <OtpInput 
            length={6} 
            onOtpSubmit={onOtpSubmit} 
            email={formData.email}
            resendOtp={resendOtp} 
          />
          
          {error && <p className="otp-error">{error}</p>}
        </div>
      )}
    </div>
  );
}

export default LogIn;
