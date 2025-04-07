import React from "react";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './Pages/auth/Login';   // Correct
import Signup from './Pages/auth/Signup'; // FIXED: Should be Signup, not Login
import Dashboard from "./Pages/dashboard/Dashboard";
import Course from './Pages/courses/course'; // Added a new component for the course page
import Assignment  from "./Pages/assiginment/assignment";
import Layout from "./Pages/components/Layout/Layout";
import './App.css';
import "bootstrap/dist/css/bootstrap.min.css";

const App = () => {
    return (
        <Router>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route element={<Layout/>}>
                    <Route path="/dashboard" element={<Dashboard/>}/>
                    <Route path="/course" element={<Course />} />
                    <Route path="/assignment" element={<Assignment />} />
                </Route>
                
                <Route path="/" element={
                    <div>
                        <h1>Hello, world</h1>
                        <p>Welcome to React</p>
                    </div>
                } />
            </Routes>
        </Router>
    );
};

export default App;
