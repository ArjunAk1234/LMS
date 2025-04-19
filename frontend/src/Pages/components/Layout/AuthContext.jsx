import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null); // { email, role }
    const [loading, setLoading] = useState(false); // Loading state for user fetching
    const [error, setError] = useState(null); // Error state
    const [profilePhotoUrl, setProfilePhotoUrl] = useState(null); // Profile photo URL
    const [updateTimestamp, setUpdateTimestamp] = useState(Date.now()); // Add timestamp for cache busting

    useEffect(() => {
        const email = localStorage.getItem("email"); // Retrieve email from localStorage
        const token = localStorage.getItem("token"); // Retrieve token from localStorage

        if (email && token) {
            checkUserRole(email); // If email and token exist, check the user's role
            fetchProfilePhoto(email); // Also fetch the profile photo if available
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

    // Fetch profile photo for the user
    const fetchProfilePhoto = async (email) => {
        try {
            const encodedEmail = encodeURIComponent(email);
            const detailsResponse = await axios.get(`http://localhost:8000/userdetails/${encodedEmail}`);
            
            if (detailsResponse.data.details && detailsResponse.data.details.photo_path) {
                const timestamp = Date.now();
                const photoUrl = `http://localhost:8000/uploads/${encodeURIComponent(email.replace('@', '_at_').replace('.', '_dot_'))}/photo.jpg?t=${timestamp}`;
                setProfilePhotoUrl(photoUrl);
                setUpdateTimestamp(timestamp);
            }
        } catch (error) {
            console.error("Failed to fetch profile photo:", error);
            // Don't set error state as this isn't critical
        }
    };

    // Update profile photo URL with cache busting
    const updateProfilePhoto = (photoUrl) => {
        const timestamp = Date.now();
        
        // If photoUrl already contains a timestamp parameter, replace it
        if (photoUrl && photoUrl.includes('?t=')) {
            photoUrl = photoUrl.split('?t=')[0] + `?t=${timestamp}`;
        } 
        // If photoUrl doesn't contain a timestamp yet, add it
        else if (photoUrl) {
            photoUrl = `${photoUrl}?t=${timestamp}`;
        }
        
        setProfilePhotoUrl(photoUrl);
        setUpdateTimestamp(timestamp);
    };

    const logout = () => {
        setUser(null);
        setError(null); // Clear any previous error when logging out
        setProfilePhotoUrl(null); // Clear profile photo URL
        localStorage.removeItem("token"); // Remove token and email from localStorage
        localStorage.removeItem("email");
    };

    return (
        <AuthContext.Provider value={{ 
            user, 
            checkUserRole, 
            logout, 
            loading, 
            error, 
            profilePhotoUrl,
            updateTimestamp, 
            updateProfilePhoto 
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);