import { useState } from "react";
import { BsEnvelope, BsLock, BsEye, BsEyeSlash, BsArrowLeft } from "react-icons/bs";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../components/Layout/AuthContext";
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
  const { checkUserRole } = useAuth();
  
  // Forgot password states
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetOtpPurpose, setResetOtpPurpose] = useState(""); // "verify_email" or "reset_password"
  
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
          setResetOtpPurpose("verify_email");
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
      const email = resetOtpPurpose === "reset_password" ? forgotPasswordEmail : formData.email;
      const headers = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      
      const otpRes = await axios.post(
        "http://localhost:8000/request-otp1",
        { email },
        headers
      );
      
      return !!otpRes.data;
    } catch (err) {
      setError("Failed to resend OTP. Please try again.");
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  const handleBackToLogin = () => {
    setShowOtpInput(false);
    setShowForgotPassword(false);
    setShowResetForm(false);
    setResetSuccess("");
    setError("");
  };

  const onOtpSubmit = async (otp) => {
    setIsLoading(true);
    try {
      const email = resetOtpPurpose === "reset_password" ? forgotPasswordEmail : formData.email;
      const headers = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      
      const verifyRes = await axios.post(
        "http://localhost:8000/verify-otp1",
        { email, otp },
        headers
      );
      
      if (verifyRes.data) {
        if (resetOtpPurpose === "reset_password") {
          setShowResetForm(true); // Show the password reset form
          setShowOtpInput(false);
        } else {
          // Login flow
          setTimeout(() => {
            navigate("/dashboard");
          }, 500);
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

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    
    try {
      // Use the existing OTP endpoint
      const response = await axios.post("http://localhost:8000/request-otp1", {
        email: forgotPasswordEmail
      });
      
      if (response.data) {
        setResetOtpPurpose("reset_password");
        setShowOtpInput(true); // Show OTP input for verification
      } else {
        setError("Failed to send OTP. Please check your email address.");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to process request. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle password reset submission
// Handle password reset submission
const handlePasswordReset = async (e) => {
  e.preventDefault();
  setError("");
  setIsLoading(true);
  
  // Validate passwords
  if (!newPassword || newPassword.length < 6) {
    setError("Password must be at least 6 characters");
    setIsLoading(false);
    return;
  }

  if (newPassword !== confirmPassword) {
    setError("Passwords do not match");
    setIsLoading(false);
    return;
  }
  
  try {
    // Make sure the API call matches exactly what the backend expects
    const response = await axios.post("http://localhost:8000/forgotpassword", {
      email: forgotPasswordEmail,
      newPassword: newPassword
    });
    
    // Check for success property in the response
    if (response.data && response.data.message === "Password reset successful") {
      setResetSuccess("Password reset successful! You can now login with your new password.");
      
      // Clear form data
      setNewPassword("");
      setConfirmPassword("");
      
      // Show login form after a delay
      setTimeout(() => {
        handleBackToLogin();
      }, 3000);
    } else {
      setError("Failed to reset password. Please try again.");
    }
  } catch (err) {
    console.error("Password reset error:", err);
    setError(err.response?.data?.error || "Failed to reset password. Please try again.");
  } finally {
    setIsLoading(false);
  }
};

  return (
    <div className="login-container">
      {showOtpInput ? (
        <div className="otp-container">
          <button className="otp-back-btn" onClick={handleBackToLogin}>
            <BsArrowLeft /> Back to {resetOtpPurpose === "reset_password" ? "Forgot Password" : "Login"}
          </button>
          
          <h1>Verification Required</h1>
          <p>We've sent a verification code to <strong>{resetOtpPurpose === "reset_password" ? forgotPasswordEmail : formData.email}</strong></p>
          
          <OtpInput 
            length={6} 
            onOtpSubmit={onOtpSubmit} 
            email={resetOtpPurpose === "reset_password" ? forgotPasswordEmail : formData.email}
            resendOtp={resendOtp} 
          />
          
          {error && <p className="otp-error">{error}</p>}
        </div>
      ) : (
        <form onSubmit={showForgotPassword ? (showResetForm ? handlePasswordReset : handleForgotPassword) : handleLogin} className="login-form">
          {/* Left side with form inputs */}
          <div className="form-content">
            <div>
              <h1>{showForgotPassword ? (showResetForm ? "Reset Password" : "Forgot Password") : "Log In"}</h1>
            </div>
            <hr />

            {showForgotPassword ? (
              showResetForm ? (
                // Reset Password Form
                <>
                  <div className="input-group password-field">
                    <label htmlFor="newPassword">
                      <BsLock />
                    </label>
                    <input
                      type={showPassword ? "textbox" : "password"}
                      id="newPassword"
                      placeholder="New Password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
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
                      id="confirmPassword"
                      placeholder="Confirm Password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </>
              ) : (
                // Forgot Password Email Form
                <div className="input-group">
                  <label htmlFor="forgotEmail">
                    <BsEnvelope />
                  </label>
                  <input
                    type="email"
                    id="forgotEmail"
                    placeholder="Enter Your Email"
                    value={forgotPasswordEmail}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    required
                  />
                </div>
              )
            ) : (
              // Regular Login Form
              <>
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
              </>
            )}

            {error && <p className="error-text">{error}</p>}
            {resetSuccess && <p className="success-text">{resetSuccess}</p>}

            <button 
              type="submit" 
              className="login-btn"
              disabled={isLoading}
            >
              {isLoading 
                ? (showForgotPassword 
                    ? (showResetForm ? "Updating..." : "Sending...") 
                    : "Logging In...") 
                : (showForgotPassword 
                    ? (showResetForm ? "Reset Password" : "Send Reset Code") 
                    : "Log In")}
            </button>
            
            {!showForgotPassword && (
              <p className="footer-text">
                <a href="#" onClick={(e) => {
                  e.preventDefault();
                  setShowForgotPassword(true);
                  setForgotPasswordEmail("");
                  setError("");
                }}>Forgot Password?</a>
              </p>
            )}
            
            {showForgotPassword && (
              <p className="footer-text">
                <a href="#" onClick={(e) => {
                  e.preventDefault();
                  handleBackToLogin();
                }}>Back to Login</a>
              </p>
            )}
            
            {!showForgotPassword && (
              <p className="footer-text">
                Don't have an account?{" "}
                <Link to={"/signup"}>Signup</Link> here
              </p>
            )}
          </div>

          {/* Right side message */}
          <div className="welcome-message">
            {showForgotPassword ? (
              showResetForm ? (
                <>
                  <p>Choose a strong password that you haven't used before.</p>
                  <p>Your password should be at least 6 characters long and include a mix of numbers, letters, and symbols for better security.</p>
                </>
              ) : (
                <>
                  <p>Enter your email address to receive a verification code.</p>
                  <p>We'll send you a code to verify your identity before you can reset your password.</p>
                </>
              )
            ) : (
              <h1>Welcome to Summer School!</h1>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

export default LogIn;