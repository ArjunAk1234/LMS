import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './leaderboard.css'
const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [searchUsername, setSearchUsername] = useState('');
  const [searchedStudent, setSearchedStudent] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
    useEffect(() => {
      document.body.classList.add("leaderboard-body");
      return () => {
        document.body.classList.remove("leaderboard-body");
      };
    }, []);
  const checkAdmin = async (email) => {
    try {
      const res = await axios.post("http://localhost:8000/check-role", { email });
      setIsAdmin(res.data.isAdmin);
    } catch (error) {
      console.error("Error checking admin role:", error);
      setIsAdmin(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const endpoint = isAdmin
        ? "http://localhost:8000/admin/leaderboard"
        : "http://localhost:8000/leaderboard";
      const res = await axios.get(endpoint);
      setLeaderboard(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Failed to load leaderboard:", error);
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    try {
      const res = await axios.get(`http://localhost:8000/admin/leaderboard/search/${searchUsername}`);
      if (res.data && typeof res.data === 'object') {
        setSearchedStudent(res.data);
      } else {
        setSearchedStudent(null);
      }
    } catch (error) {
      alert("Student not found!");
      setSearchedStudent(null);
    }
  };

  const modifyPoints = async (username, action) => {
    try {
      await axios.post(`http://localhost:8000/admin/leaderboard/${action}point/${username}`);
      fetchLeaderboard();
    } catch (error) {
      alert("Failed to modify points");
    }
  };

  useEffect(() => {
    const userEmail = localStorage.getItem("email");
    if (userEmail) {
      checkAdmin(userEmail).then(fetchLeaderboard);
    }
  }, []);

  if (loading) return <div className="leaderboard-loading">Loading leaderboard...</div>;

  return (
    <div className="leaderboard-container">
      <div className="leaderboard-header">
        <h2 className="leaderboard-title">🏆 Leaderboard</h2>
      </div>
      {isAdmin && (
        <div className="admin-tools">
          <div className="search-container">
            <h3 className="search-title">🔍 Search Student</h3>
            <div className="search-input-group">
              <input
                type="text"
                className="search-input"
                placeholder="Enter Name"
                value={searchUsername}
                onChange={(e) => setSearchUsername(e.target.value)}
              />
              <button 
                className="search-button"
                onClick={handleSearch}
              >
                Search
              </button>
            </div>
          </div>

          {searchedStudent && (
            <div className="student-card">
              <div className="student-info">
                <p><strong>Name:</strong> {searchedStudent.username}</p>
                <p><strong>Points:</strong> {searchedStudent.points}</p>
              </div>
              <div className="student-actions">
                <button 
                  className="action-button add-points"
                  onClick={() => modifyPoints(searchedStudent.username, 'add')}
                >
                  ➕ Add 10 Points
                </button>
                <button 
                  className="action-button deduct-points"
                  onClick={() => modifyPoints(searchedStudent.username, 'delete')}
                >
                  ➖ Deduct 10 Points
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      <div className="leaderboard-table-container">
        <table className="leaderboard-table">
          <thead className="leaderboard-table-header">
            <tr>
              <th className="rank-column">Rank</th>
              <th className="name-column">Name</th>
              <th className="points-column">Points</th>
              {isAdmin && <th className="actions-column">Actions</th>}
            </tr>
          </thead>
          <tbody className="leaderboard-table-body">
            {Array.isArray(leaderboard) && leaderboard.map((user, index) => (
              <tr key={user.username} className="leaderboard-row">
                <td className="rank-cell">{index + 1}</td>
                <td className="name-cell">{user.username}</td>
                <td className="points-cell">{user.points}</td>
                {isAdmin && (
                  <td className="actions-cell">
                    <button 
                      className="points-button add-points"
                      onClick={() => modifyPoints(user.username, 'add')}
                    >
                      ➕
                    </button>
                    <button 
                      className="points-button deduct-points"
                      onClick={() => modifyPoints(user.username, 'delete')}
                    >
                      ➖
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Leaderboard;