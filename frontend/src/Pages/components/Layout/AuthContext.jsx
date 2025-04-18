import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null); // { email, role }
    const [loading, setLoading] = useState(false); // Loading state for user fetching
    const [error, setError] = useState(null); // Error state

    useEffect(() => {
        const email = localStorage.getItem("email"); // Retrieve email from localStorage
        const token = localStorage.getItem("token"); // Retrieve token from localStorage

        if (email && token) {
            checkUserRole(email); // If email and token exist, check the user's role
        }
    }, []);

    // Check the role of the logged-in user
    const checkUserRole = async (email) => {
        setLoading(true);
        setError(null); // Reset any previous errors

        try {
            // Fetch user role from the backend using check-role API
            const roleRes = await axios.post("http://localhost:8000/check-role", { email });
            console.log("Role API Response:", roleRes.data);
            const isAdmin = roleRes.data?.isAdmin === true;

            // Set the user state with the email and role
            setUser({
                email: email,
                role: isAdmin ? "admin" : "student",
            });
        } catch (error) {
            console.error("Role check failed:", error);
            setError("Failed to fetch user role. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        setUser(null);
        setError(null); // Clear any previous error when logging out
        localStorage.removeItem("token"); // Remove token and email from localStorage
        localStorage.removeItem("email");
    };

    return (
        <AuthContext.Provider value={{ user, checkUserRole, logout, loading, error }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
