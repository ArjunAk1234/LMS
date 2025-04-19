import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../Layout/AuthContext';
import axios from 'axios';
import './UserProfile.css';

export default function UserProfile() {
  const { user, updateProfilePhoto } = useAuth();
  const [userDetails, setUserDetails] = useState(null);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddDetails, setShowAddDetails] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [editMode, setEditMode] = useState(false);
  
  // Form state for adding/editing user details
  const [formData, setFormData] = useState({
    full_name: '',
    age: '',
    address: '',
    phone: '',
    father_name: '',
    mother_name: '',
    parent_contact: '',
    school_name: '',
    grade: '',
  });

  // Form submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    // Only fetch data if user is logged in
    if (user && user.email) {
      fetchUserData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const fetchUserData = async () => {
    setLoading(true);
    try {
      // Fetch user details
      console.log(`Fetching user details for email: ${user.email}`);
      const encodedEmail = encodeURIComponent(user.email);
      const detailsResponse = await axios.get(`http://localhost:8000/userdetails/${encodedEmail}`);
      console.log('User details fetched successfully:', detailsResponse.data);
      setUserDetails(detailsResponse.data.details);

      // Populate form data with user details for editing
      if (detailsResponse.data.details) {
        const details = detailsResponse.data.details;
        setFormData({
          full_name: details.full_name || '',
          age: details.age || '',
          address: details.address || '',
          phone: details.phone || '',
          father_name: details.father_name || '',
          mother_name: details.mother_name || '',
          parent_contact: details.parent_contact || '',
          school_name: details.school_name || '',
          grade: details.grade || '',
        });

        // Set photo preview if available
        if (details.photo_path) {
          const photoUrl = `http://localhost:8000/uploads/${encodeURIComponent(user.email.replace('@', '_at_').replace('.', '_dot_'))}/photo.jpg`;
          setPhotoPreview(photoUrl);
          
          // ADD THIS LINE - Update the profile photo in AuthContext
          updateProfilePhoto(photoUrl);
        } else {
          // ADD THIS LINE - Clear the profile photo in AuthContext if none exists
          updateProfilePhoto(null);
        }
      }

      // Fetch username
      console.log(`Fetching username for email: ${user.email}`);
      const usernameResponse = await axios.get(`http://localhost:8000/username/email/${encodedEmail}`);
      console.log('Username fetched successfully:', usernameResponse.data);
      setUsername(usernameResponse.data.username);

      setError(null);
    } catch (err) {
      console.error('Error fetching user data:', err);
      if (err.response && err.response.status === 404) {
        // User details not found, show add details form
        setShowAddDetails(true);
        setError(null);
      } else {
        setError('Failed to load user data. Please try again later.');
      }
    } finally {
      setLoading(false);
      console.log('Finished loading user data');
    }
  };
  const handleEditProfile = () => {
    setEditMode(true);
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    // Reset form data to current user details
    if (userDetails) {
      setFormData({
        full_name: userDetails.full_name || '',
        age: userDetails.age || '',
        address: userDetails.address || '',
        phone: userDetails.phone || '',
        father_name: userDetails.father_name || '',
        mother_name: userDetails.mother_name || '',
        parent_contact: userDetails.parent_contact || '',
        school_name: userDetails.school_name || '',
        grade: userDetails.grade || '',
      });
    }
    setProfilePhoto(null);
    // Reset photo preview to current photo or null
    if (userDetails && userDetails.photo_path) {
      setPhotoPreview(`http://localhost:8000/uploads/${encodeURIComponent(user.email.replace('@', '_at_').replace('.', '_dot_'))}/photo.jpg`);
    } else {
      setPhotoPreview(null);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError('');
    setSubmitSuccess('');

    try {
      // Create FormData object for the multipart/form-data submission
      const formDataToSend = new FormData();

      // Add email from user context
      formDataToSend.append('email', user.email);

      // Add all form fields that the backend handles
      Object.entries(formData).forEach(([key, value]) => {
        formDataToSend.append(key, value);
      });

      // Add photo if selected
      if (profilePhoto) {
        formDataToSend.append('photo', profilePhoto);
      }

      // Use the appropriate endpoint based on whether we're adding or updating
      const endpoint = showAddDetails ? 'add-details' : 'update-details';
      const response = await axios.post(`http://localhost:8000/${endpoint}`, formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      console.log('Details submitted successfully:', response.data);
      setSubmitSuccess('Details submitted successfully!');

      // Set photoPreview immediately with a timestamp to force refresh
      if (profilePhoto) {
        const timestamp = new Date().getTime();
        const photoUrl = `http://localhost:8000/uploads/${encodeURIComponent(user.email.replace('@', '_at_').replace('.', '_dot_'))}/photo.jpg?t=${timestamp}`;
        setPhotoPreview(photoUrl);
        
        // ADD THIS LINE - Update the profile photo in AuthContext
        updateProfilePhoto(photoUrl);
      }


      setTimeout(() => {
        setShowAddDetails(false);
        setEditMode(false);
        fetchUserData(); // Refresh data
      }, 2000);
    } catch (err) {
      console.error('Error submitting user details:', err);
      setSubmitError(err.response?.data?.error || 'Failed to submit details');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-text">Loading profile data...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="not-logged-in">
        <h2>Please log in to view your profile</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p className="error-title">Error</p>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-content">
        <div className="profile-header">
          <h1>User Profile</h1>
          <div className="profile-actions">
            {!showAddDetails && !editMode && (
              <>
                <button onClick={handleEditProfile} className="edit-profile-btn">
                  Edit Profile
                </button>

              </>
            )}
            {editMode && (
              <button onClick={handleCancelEdit} className="cancel-edit-btn">
                Cancel
              </button>
            )}
          </div>
        </div>

        {showAddDetails || editMode ? (
          <div className="add-details-container">
            <h2>{showAddDetails ? 'Complete Your Profile' : 'Edit Your Profile'}</h2>
            <p className="details-msg">
              {showAddDetails
                ? 'Please provide your details to continue'
                : 'Update your profile information'}
            </p>

            <form onSubmit={handleFormSubmit} className="details-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="full_name">Full Name*</label>
                  <input
                    id="full_name"
                    name="full_name"
                    type="text"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    placeholder="Your full name"
                    required
                  />
                </div>
                <div className="form-group photo-upload">
                  <label htmlFor="photo">Profile Photo {photoPreview ? '(Change)' : '(Optional)'}</label>
                  <input
                    id="photo"
                    name="photo"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                  />
                  {photoPreview && (
                    <div className="photo-preview">
                      <img src={photoPreview} alt="Profile preview" />
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label htmlFor="age">Age*</label>
                  <input
                    id="age"
                    name="age"
                    type="number"
                    value={formData.age}
                    onChange={handleInputChange}
                    placeholder="Your age"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="address">Address*</label>
                <textarea
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Your complete address"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone Number*</label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Your contact number"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="father_name">Father's Name*</label>
                  <input
                    id="father_name"
                    name="father_name"
                    type="text"
                    value={formData.father_name}
                    onChange={handleInputChange}
                    placeholder="Father's full name"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="mother_name">Mother's Name*</label>
                  <input
                    id="mother_name"
                    name="mother_name"
                    type="text"
                    value={formData.mother_name}
                    onChange={handleInputChange}
                    placeholder="Mother's full name"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="parent_contact">Parent's Contact*</label>
                <input
                  id="parent_contact"
                  name="parent_contact"
                  type="tel"
                  value={formData.parent_contact}
                  onChange={handleInputChange}
                  placeholder="Parent's contact number"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="school_name">School Name*</label>
                  <input
                    id="school_name"
                    name="school_name"
                    type="text"
                    value={formData.school_name}
                    onChange={handleInputChange}
                    placeholder="Your school name"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="grade">Grade/Class*</label>
                  <input
                    id="grade"
                    name="grade"
                    type="text"
                    value={formData.grade}
                    onChange={handleInputChange}
                    placeholder="Your current grade"
                    required
                  />
                </div>
              </div>
              {submitError && <div className="submit-error">{submitError}</div>}
              {submitSuccess && <div className="submit-success">{submitSuccess}</div>}

              <div className="form-actions">
                <button
                  type="submit"
                  className="submit-details-btn"
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : (showAddDetails ? 'Submit Details' : 'Update Details')}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="user-info">
            <div className="avatar-container">
              {userDetails && userDetails.photo_path ? (
                <div className="avatar-img">
                  <img
                    src={`http://localhost:8000/uploads/${encodeURIComponent(user.email.replace('@', '_at_').replace('.', '_dot_'))}/photo.jpg?t=${new Date().getTime()}`}
                    alt="Profile"
                  />
                </div>
              ) : (
                <div className="avatar">
                  <span>
                    {username ? username.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            <div className="info-container">
              <div className="info-grid">
                <div className="info-item">
                  <h3>Username</h3>
                  <p>{username || 'N/A'}</p>
                </div>

                <div className="info-item">
                  <h3>Email</h3>
                  <p>{user.email}</p>
                </div>

                <div className="info-item">
                  <h3>Role</h3>
                  <p className="capitalize">{user.role || 'User'}</p>
                </div>

                {userDetails && (
                  <>
                    {Object.entries(userDetails).map(([key, value]) => {
                      // Skip internal MongoDB fields and already displayed fields
                      if (key.startsWith('_') || key === 'email' || key === 'password' ||
                        key.endsWith('_path')) {
                        return null;
                      }

                      return (
                        <div key={key} className="info-item">
                          <h3 className="capitalize">
                            {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()}
                          </h3>
                          <p>
                            {typeof value === 'object' ? JSON.stringify(value) : value.toString()}
                          </p>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}