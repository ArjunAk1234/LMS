import React from "react";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './Pages/auth/Login';
import Signup from './Pages/auth/Signup';
import Dashboard from "./Pages/dashboard/Dashboard";
import Course from './Pages/courses/course';
import Assignment from "./Pages/assiginment/assignment";
import Layout from "./Pages/components/Layout/Layout";
import PrivateRoute from "./Pages/auth/PrivateRoute";
import PublicRoute from "./Pages/auth/PublicRoute"; // 
import './App.css';
import "bootstrap/dist/css/bootstrap.min.css";

const App = () => {
    return (
        <Router>
            <Routes>
                {/* Public-only routes (blocked if already logged in) */}
                <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
                <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
                <Route path="/" element={<PublicRoute>
                    <div>
                        <h1>Hello, world</h1>
                        <p>Welcome to React</p>
                    </div>
                </PublicRoute>} />

                {/* Private routes (only accessible when logged in) */}
                <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/course" element={<Course />} />
                    <Route path="/assignment" element={<Assignment />} />
                </Route>
            </Routes>
        </Router>
    );
};

export default App;
