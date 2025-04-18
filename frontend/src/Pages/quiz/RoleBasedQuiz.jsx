import React from 'react';
import { useAuth } from '../components/Layout/AuthContext';
import AdminDashboard from './admin';
import StudentDashboard from './student';

const RoleBasedQuiz = () => {
    const { user, loading, error } = useAuth();

    // Handle loading state
    if (loading) return <p>Loading...</p>;

    // Handle error state
    if (error) return <p>{error}</p>;

    // Handle the case where no user is logged in
    if (!user) return <p>You are not logged in. Please log in to access the quiz.</p>;

    // Render based on user role
    return user.role === "admin" ? <AdminDashboard /> : <StudentDashboard />;
};

export default RoleBasedQuiz;
