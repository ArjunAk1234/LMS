import React from "react";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './Pages/auth/Login';
import Signup from './Pages/auth/Signup';
import Dashboard from "./Pages/dashboard/Dashboard";
import Course from './Pages/courses/course';
import Assignment from "./Pages/assiginment/assignment";
import Leaderboard from "./Pages/leaderboard/leaderboard";
import Landing from "./Pages/LandingPage/Landing";
import Layout from "./Pages/components/Layout/Layout";
import UserProfile from "./Pages/components/UserProfile/UserProfile";
import PrivateRoute from "./Pages/auth/PrivateRoute";
import PublicRoute from "./Pages/auth/PublicRoute";
import { AuthProvider,useAuth } from "./Pages/components/Layout/AuthContext"; // 
import RoleBasedQuiz from './Pages/quiz/RoleBasedQuiz'; // Import RoleBasedQuiz
import './App.css';
import "bootstrap/dist/css/bootstrap.min.css";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const App = () => {
    return (
        <AuthProvider> {/* ✅ Wrap the entire app */}
            <Router>
                <Routes>
                    {/* Public-only routes (blocked if already logged in) */}
                    <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
                    <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
                    <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />

                    {/* Private routes (only accessible when logged in) */}
                    <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/course" element={<Course />} />
                        <Route path="/assignment" element={<Assignment />} />
                        <Route path="/leaderboard" element={<Leaderboard />} />
                        <Route path="/userprofile" element={<UserProfile />} />
                        {/* Role-Based Quiz Route */}
                        <Route path="/quiz" element={<RoleBasedQuiz />} /> {/* This handles admin/student routes */}
                    </Route>
                </Routes>
                <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop />

            </Router>
        </AuthProvider>
    );
};

export default App;
