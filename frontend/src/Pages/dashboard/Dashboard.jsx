import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Award, BookOpen, Calendar, Clock, Loader2, CheckSquare } from 'lucide-react';
import './Dashboard.css';

const Dashboard = () => {
  const [coursesSummary, setCoursesSummary] = useState({ count: 0, names: [] });
  const [assignmentsSummary, setAssignmentsSummary] = useState({ count: 0, assignments: [] });
  const [activeQuizzes, setActiveQuizzes] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [username, setUsername] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [studentEmail, setStudentEmail] = useState(''); // Would be set from user authentication
  const navigate = useNavigate();

  useEffect(() => {
    document.body.classList.add("dashboard-body");
    return () => {
      document.body.classList.remove("dashboard-body");
    };
  }, []);
  useEffect(() => {
    const userEmail = localStorage.getItem('email') || '';
    setStudentEmail(userEmail);

    // Fetch username based on email
    fetchUsername(userEmail);
  }, [refreshKey]);
  const fetchUsername = async (email) => {
    try {
      const response = await axios.get(`http://localhost:8000/username/email/${email}`);
      setUsername(response.data.username);
    } catch (err) {
      // Handle error silently or set a default username
      setUsername('Student');
    }
  };
  useEffect(() => {
    // Fetch courses summary
    axios.get('http://localhost:8000/courses/summary')
      .then(res => {
        console.log("Courses API Response: ", res.data);
        const data = res.data || {};
        setCoursesSummary({
          count: data.count || 0,
          names: Array.isArray(data.names) ? data.names : []
        });
      })
      .catch(err => {
        console.error("Error fetching courses data: ", err);
        setCoursesSummary({ count: 0, names: [] });
      })
      .finally(() => setLoadingCourses(false));

    // Fetch assignments summary
    axios.get('http://localhost:8000/assignments')
      .then(res => {
        console.log("Assignments API Response: ", res.data);
        const data = res.data || {};
        setAssignmentsSummary({
          count: data.count || 0,
          assignments: Array.isArray(data.assignments) ? data.assignments : []
        });
      })
      .catch(err => {
        console.error("Error fetching assignments data: ", err);
        setAssignmentsSummary({ count: 0, assignments: [] });
      })
      .finally(() => setLoadingAssignments(false));

    // Fetch active quizzes
    axios.get('http://localhost:8000/active-quizzes')
      .then(res => {
        console.log("Active Quizzes API Response: ", res.data);
        setActiveQuizzes(Array.isArray(res.data) ? res.data : []);
      })
      .catch(err => {
        console.error("Error fetching active quizzes: ", err);
        setActiveQuizzes([]);
      })
      .finally(() => setLoadingQuizzes(false));

    // Fetch current user's leaderboard stats
    axios.get('http://localhost:8000/leaderboard/me', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    })
      .then(res => {
        console.log("User Stats API Response: ", res.data);
        setUserStats(res.data);
      })
      .catch(err => {
        console.error("Error fetching user stats: ", err);
        setUserStats(null);
      })
      .finally(() => setLoadingStats(false));
  }, []);

  // Function to render leaderboard position with color
  const renderRankBadge = (rank) => {
    if (rank === 1) return <span className="rank-badge gold"><Award className="icon-small" /> 1st</span>;
    if (rank === 2) return <span className="rank-badge silver"><Award className="icon-small" /> 2nd</span>;
    if (rank === 3) return <span className="rank-badge bronze"><Award className="icon-small" /> 3rd</span>;
    return <span className="rank-badge default">{rank}th</span>;
  };

  // Function to calculate remaining time
  const calculateRemainingTime = (endTime) => {
    const end = new Date(endTime);
    const now = new Date();
    const diffMs = end - now;

    // If time has passed
    if (diffMs <= 0) {
      return "Expired";
    }

    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHrs > 0) {
      return `${diffHrs}h ${diffMins}m remaining`;
    }
    return `${diffMins}m remaining`;
  };

  const LoadingSpinner = () => (
    <div className="loading-spinner">
      <Loader2 className="spinner-icon" />
    </div>
  );

  return (
    <div className="dashboard">
      <div className="dashboard-container">
        <div className='title-container'>
        <h1 className="dashboard-title">
          Hi, {username} let's make today count!</h1>
        </div>
        <div className="dashboard-grid">
          {/* Courses Summary Card */}
          {/* Courses Card */}
          <div className="dashboard-card">
            <div className="card-header">
              <h3 className="card-title">Your Courses</h3>
              <div className="icon-container green">
                <BookOpen className="card-icon" />
              </div>
            </div>

            {loadingCourses ? (
              <LoadingSpinner />
            ) : coursesSummary.count === 0 ? (
              <div className="empty-message">
                <p>No courses available yet.</p>
              </div>
            ) : (
              <>
                <div className="summary-badge green">
                  <p className="summary-count">{coursesSummary.count} Courses</p>
                </div>
                <div className="card-content">
                  <div className="scrollable-list">
                    {coursesSummary.names.map((name, idx) => (
                      <div key={idx} className="content-card">
                        <p className="content-title">{name}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="card-footer">
                  <div className="admin-create-course-btn">
                    <button onClick={() => navigate('/course')}>
                      View All Courses
                    </button>

                  </div>
                </div>
              </>
            )}
          </div>

          {/* Active Quizzes Card */}
          <div className="dashboard-card">
            <div className="card-header">
              <h3 className="card-title">Active Quizzes</h3>
              <div className="icon-container purple">
                <CheckSquare className="card-icon" />
              </div>
            </div>

            {loadingQuizzes ? (
              <LoadingSpinner />
            ) : activeQuizzes.length === 0 ? (
              <div className="empty-message">
                <p>No active quizzes at the moment.</p>
              </div>
            ) : (
              <>
                <div className="summary-badge purple">
                  <p className="summary-count">{activeQuizzes.length} Active Quiz{activeQuizzes.length !== 1 ? 'zes' : ''}</p>
                </div>
                <div className="card-content">
                  <div className="scrollable-list">
                    {activeQuizzes.map((quiz, idx) => (
                      <div
                        key={idx}
                        className="content-card"
                      >
                        <p className="content-title">{quiz.title}</p>
                        <div className="content-footer">
                          <p className="content-subtitle">{quiz.course || 'General Quiz'}</p>
                          <p className="time-remaining purple">
                            <Clock className="icon-small" />
                            {calculateRemainingTime(quiz.endTime)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="card-footer">
                  <div className="admin-create-course-btn">
                    <button onClick={() => navigate('/quiz')}>
                      View All Quizzes
                    </button>

                  </div>
                </div>
              </>
            )}
          </div>

          {/* Assignments Card */}
          <div className="dashboard-card">
            <div className="card-header">
              <h3 className="card-title">Assignments</h3>
              <div className="icon-container amber">
                <Calendar className="card-icon" />
              </div>
            </div>

            {loadingAssignments ? (
              <LoadingSpinner />
            ) : assignmentsSummary.count === 0 ? (
              <div className="empty-message">
                <p>No assignments available yet.</p>
              </div>
            ) : (
              <>
                <div className="summary-badge amber">
                  <p className="summary-count">{assignmentsSummary.count} Assignments</p>
                </div>
                <div className="card-content">
                  <div className="scrollable-list">
                    {assignmentsSummary.assignments.map((assignment, idx) => (
                      <div
                        key={idx}
                        className="content-card"
                      >
                        <p className="content-title">{assignment.name}</p>
                        <div className="content-footer">
                          <p className="content-subtitle">{assignment.course}</p>
                          <p className="time-remaining red">
                            <Clock className="icon-small" />
                            {assignment.due_date}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="card-footer">
                  <div className="admin-create-course-btn">
                    <button onClick={() => navigate('/assignment')}>
                      View All Assignments
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* User Stats Card */}
          <div className="dashboard-card">
            <div className="card-header">
              <h3 className="card-title mb-4">Your Stats</h3>
              <div className="icon-container blue mb-4">
                <Award className="card-icon" />
              </div>
            </div>

            {loadingStats ? (
              <LoadingSpinner />
            ) : !userStats ? (
              <div className="error-message">
                <p>Please log in to view your stats</p>
              </div>
            ) : (
              <div className="stats-content">
                <div className="stat-item">
                  <span className="stat-label">Your Rank:</span>
                  <div>{renderRankBadge(userStats.rank)}</div>
                </div>

                <div className="stat-item">
                  <span className="stat-label">Points:</span>
                  <span className="points-value">{userStats.stats.points}</span>
                </div>

                <div className="stat-item">
                  <span className="stat-label">Total Users:</span>
                  <span className="medium-text">{userStats.totalUsers}</span>
                </div>

                <div className="card-footer">
                  <div className="dashboard-view-btn">
                    <button onClick={() => navigate('/leaderboard')}>
                      View Leaderboard
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;