import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './student.css';
function StudentDashboard() {
  const [activeQuizzes, setActiveQuizzes] = useState([]);
  const [pastQuizzes, setPastQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('quizList'); // 'quizList', 'takeQuiz', 'results', 'leaderboard'
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [quizResults, setQuizResults] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [studentEmail, setStudentEmail] = useState(''); // Would be set from user authentication
  const [username, setUsername] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState('activeQuizzes'); // 'activeQuizzes' or 'quizHistory'
  const [submittedQuizIds, setSubmittedQuizIds] = useState(new Set());

  useEffect(() => {
    const userEmail = localStorage.getItem('email') || '';
    setStudentEmail(userEmail);
    
    // Fetch username based on email
    fetchUsername(userEmail);
    // Fetch quizzes
    fetchActiveQuizzes();
    fetchStudentProgress(userEmail);
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

  const fetchActiveQuizzes = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:8000/active-quizzes');
      setActiveQuizzes(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch active quizzes');
      setLoading(false);
    }
  };
  const isQuizExpired = (quiz) => {
    if (!quiz || !quiz.endTime) return false;
    const endTime = new Date(quiz.endTime).getTime();
    const now = new Date().getTime();
    return now > endTime;
  };
  const fetchStudentProgress = async (email) => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:8000/admin/student-progress/email/${email}`);
      setPastQuizzes(response.data);
      
      // Add this line to track submitted quiz IDs
      const submitted = new Set(response.data
        .filter(quiz => quiz.status === 'submitted')
        .map(quiz => quiz.id || quiz.quizId));
      setSubmittedQuizIds(submitted);
      
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch quiz history');
      setLoading(false);
    }
  };

  const fetchQuizResults = async (quizId) => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:8000/results/email/${studentEmail}/quizid/${quizId}`);
      setQuizResults(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch quiz results');
      setLoading(false);
    }
  };

  const fetchLeaderboard = async (quizId) => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:8000/leaderboard/${quizId}`);
      setLeaderboard(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch leaderboard');
      setLoading(false);
    }
  };

  const handleViewChange = (newView, quiz = null) => {
    setView(newView);
    setError(null);
    
    if (quiz) {
      setSelectedQuiz(quiz);
      
      if (newView === 'results') {
        fetchQuizResults(quiz.quizId || quiz.id);
      } else if (newView === 'leaderboard') {
        fetchLeaderboard(quiz.quizId || quiz.id);
      } else if (newView === 'takeQuiz') {
        // Check if quiz has expired
        if (isQuizExpired(quiz)) {
          setError('This quiz has expired and can no longer be taken.');
          setView('quizList');
          return;
        }
        
        // Check if already submitted
        checkSubmissionStatus(quiz.id);
      }
    }
  };

  const checkSubmissionStatus = async (quizId) => {
    try {
      const response = await axios.get(`http://localhost:8000/checkquizSubmission/${quizId}/${studentEmail}`);
      if (response.data.submitted) {
        // Already submitted, show results instead
        fetchQuizResults(quizId);
        setView('results');
      }
    } catch (err) {
      // Continue to take quiz view
    }
  };

  const refreshDashboard = () => {
    setRefreshKey(prevKey => prevKey + 1);
  };


  const renderActiveQuizzes = () => {
    if (loading) return <div className="loading">Loading your quizzes...</div>;
    if (error) return <div className="error">{error}</div>;
    
    return (
      <div className="active-quizzes">
        <h1>Active Quizzes</h1>
        {!Array.isArray(activeQuizzes) || activeQuizzes.length === 0 ? (
          <p>No active quizzes available right now</p>
        ) : (
          <div className="quiz-grid">
{activeQuizzes.map(quiz => {
  const expired = isQuizExpired(quiz);
  return (
    <div key={quiz.id} className="quiz-card">
      <h3>{quiz.title}</h3>
      <p>Questions: {quiz.questions?.length || 0}</p>
      <p>Ends: {new Date(quiz.endTime).toLocaleString()}</p>
      {expired ? (
        <button disabled className="expired-button">
          Expired
        </button>
      ) : submittedQuizIds.has(quiz.id) ? (
        <button onClick={() => handleViewChange('results', quiz)}>
          Show Results
        </button>
      ) : (
        <button onClick={() => handleViewChange('takeQuiz', quiz)}>
          Start Quiz
        </button>
      )}
    </div>
  );
})}
          </div>
        )}
      </div>
    );
  };
  
  const renderQuizHistory = () => {
    if (loading) return <div className="loading">Loading your quiz history...</div>;
    if (error) return <div className="error">{error}</div>;
    
    return (
      <div className="past-quizzes">
        <h1>Quiz History</h1>
        {pastQuizzes.length === 0 ? (
          <p>No quiz history available</p>
        ) : (
          <table className="history-table">
            <thead>
              <tr>
                <th>Quiz Title</th>
                <th>Status</th>
                <th>Score</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pastQuizzes.map((quiz, index) => (
                <tr key={index} className={quiz.status === 'missed' ? 'missed' : ''}>
                  <td>{quiz.title}</td>
                  <td>
                    <span className={`status-badge ${quiz.status}`}>
                      {quiz.status}
                    </span>
                  </td>
                  <td>{quiz.status === 'submitted' ? `${quiz.score}` : 'N/A'}</td>
                  <td>
                    {quiz.status === 'submitted' && (
                      <div className="button-group">
                        <button onClick={() => handleViewChange('results', quiz)}>
                          Results
                        </button>
                        <button onClick={() => handleViewChange('leaderboard', quiz)}>
                          Leaderboard
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  const renderQuizList = () => {
    return (
      <div >
        <h1>Quiz</h1>
        <div className="tab-buttons">
          <button 
            className={`tab-button ${activeTab === 'activeQuizzes' ? 'active' : ''}`}
            onClick={() => setActiveTab('activeQuizzes')}
          >
            Show Active Quizzes
          </button>
          <button 
            className={`tab-button ${activeTab === 'quizHistory' ? 'active' : ''}`}
            onClick={() => setActiveTab('quizHistory')}
          >
            Quiz History
          </button>
        </div>
        
        {activeTab === 'activeQuizzes' ? renderActiveQuizzes() : renderQuizHistory()}
      </div>
    );
  };

  const renderTakeQuiz = () => {
    if (!selectedQuiz) return <div className="loading">No quiz selected</div>;
    return <QuizTaker quiz={selectedQuiz} studentEmail={studentEmail} onComplete={() => {
      handleQuizComplete();
      refreshDashboard();
    }} />;
  };

  const handleQuizComplete = () => {
    // Refresh the student's progress and switch to quiz list view
    fetchStudentProgress(studentEmail);
    setView('quizList');
  };

  const renderQuizResults = () => {
    if (loading) return <div className="loading">Loading your results...</div>;
    if (!quizResults) return <div className="no-results">No results available</div>;
    
    if (!quizResults.submitted) {
      return (
        <div className="no-results">
          <h2>Quiz Results</h2>
          <p>You haven't submitted this quiz yet.</p>
          <button onClick={() => setView('quizList')}>Back to Quizzes</button>
        </div>
      );
    }
    
    return (
      <div className="quiz-results">
        <h2>Your Results: {selectedQuiz.title}</h2>
        <div className="score-summary">
          <h3>Score: {quizResults.score}</h3>
          <p>Submitted: {new Date(quizResults.submittedtime).toLocaleString()}</p>
        </div>
        
        <div className="question-results">
          <h3>Question Review</h3>
          {quizResults.answers.map((answer, index) => (
            <div key={index} className={`question ${answer.isCorrect ? 'correct' : 'incorrect'}`}>
              <p>
                <strong>Q{index + 1}:</strong> {answer.question}
              </p>
              <p>
                <strong>Your answer:</strong> {answer.userAnswer || 'Not answered'}
              </p>
              {!answer.isCorrect && (
                <p>
                  <strong>Correct answer:</strong> {answer.correctAnswer}
                </p>
              )}
            </div>
          ))}
        </div>
        
        <div className="actions">
          <button onClick={() => handleViewChange('leaderboard', selectedQuiz)}>
            View Leaderboard
          </button>
          <button onClick={() => setView('quizList')}>
            Back to Quizzes
          </button>
        </div>
      </div>
    );
  };

  const renderLeaderboard = () => {
    if (loading) return <div className="loading">Loading leaderboard...</div>;
    
    return (
      <div className="leaderboard-quiz">
        <h2>Leaderboard: {selectedQuiz.title}</h2>
        {leaderboard.length === 0 ? (
          <p>No submissions yet</p>
        ) : (
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Username</th>
                <th>Score</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry) => (
                <tr 
                  key={entry.email} 
                  className={entry.email === studentEmail ? 'current-user' : ''}
                >
                  <td>{entry.rank}</td>
                  <td>{entry.username}</td>
                  <td>{entry.score}</td>
                  <td>{entry.email === studentEmail ? '👤 You' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="actions">
          <button onClick={() => setView('quizList')}>Back to Quizzes</button>
        </div>
      </div>
    );
  };

  return (
    <div className="student-container">
      <main>
        {view === 'quizList' && renderQuizList()}
        {view === 'takeQuiz' && renderTakeQuiz()}
        {view === 'results' && renderQuizResults()}
        {view === 'leaderboard' && renderLeaderboard()}
      </main>
    </div>
  );
}

function QuizTaker({ quiz, studentEmail, onComplete }) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [score, setScore] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    // Save answers whenever they change
    if (Object.keys(answers).length > 0 && quiz?.id) {
      localStorage.setItem(`quiz-progress-${quiz.id}-${studentEmail}`, JSON.stringify({
        answers,
        currentQuestionIndex,
        quizId: quiz.id,
        timestamp: new Date().getTime()
      }));
    }
  }, [answers, currentQuestionIndex, quiz?.id, studentEmail]);

  // Add this to QuizTaker useEffect initialization
useEffect(() => {
  if (quiz?.id && studentEmail) {
    // Check for saved progress
    const savedProgress = localStorage.getItem(`quiz-progress-${quiz.id}-${studentEmail}`);
    if (savedProgress) {
      try {
        const progressData = JSON.parse(savedProgress);
        // Only restore if it's for the same quiz and not too old (e.g., within 24 hours)
        const isRecent = (new Date().getTime() - progressData.timestamp) < 24 * 60 * 60 * 1000;
        
        if (progressData.quizId === quiz.id && isRecent) {
          setAnswers(progressData.answers);
          setCurrentQuestionIndex(progressData.currentQuestionIndex);
          // Optional: Inform the user their progress was restored
        }
      } catch (err) {
        console.error("Error restoring quiz progress", err);
      }
    }
  }
}, [quiz?.id, studentEmail]);
  // ⏱️ Timer setup based on quiz end time
  useEffect(() => {
    if (!quiz || !quiz.endTime) return;

    const parsedEndTime = new Date(quiz.endTime);
    if (isNaN(parsedEndTime)) return;

    const endTime = parsedEndTime.getTime();
    const now = new Date().getTime();
    const difference = endTime - now;

    const initialTime = Math.max(0, Math.floor(difference / 1000));
    setTimeLeft(initialTime);

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [quiz]);

  // ⏰ Auto-submit only if time is up AND answers are filled AND not already submitted
  useEffect(() => {
    if (quiz && timeLeft === 0 && !submitted && Object.keys(answers).length > 0) {
      handleSubmit();
    }
  }, [timeLeft, submitted, quiz, answers]);

  const handleAnswerSelect = (questionIndex, selectedOption) => {
    setAnswers(prev => ({
      ...prev,
      [`q${questionIndex}`]: selectedOption
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const confirmSubmit = () => {
    const answeredCount = Object.keys(answers).length;
    const totalQuestions = quiz.questions.length;
    
    // If not all questions are answered, show confirmation
    if (answeredCount < totalQuestions) {
      setShowConfirmModal(true);
    } else {
      // All questions answered, submit directly
      handleSubmit();
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setShowConfirmModal(false);
    
    if (submitted || loading || !quiz?.id || !studentEmail) return;

    try {
      setLoading(true);
      const response = await axios.post('http://localhost:8000/submit-quiz', {
        quizId: quiz.id,
        studentId: studentEmail,
        answers: answers
      });

      setScore(response.data.score);
      setSubmitted(true);
      setLoading(false);

      setTimeout(() => {
        if (onComplete) onComplete(response.data.score);
      }, 3000);
      // Add this to handleSubmit function after successful submission
localStorage.removeItem(`quiz-progress-${quiz.id}-${studentEmail}`);
    } catch (err) {
      console.error("Submission error:", err);
      setError(err.response?.data?.error || 'Failed to submit quiz.');
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  const getTimeColor = () => {
    if (timeLeft <= 60) return 'time-critical';
    if (timeLeft <= 180) return 'time-warning';
    return '';
  };

  if (!quiz) return <div>No quiz data available</div>;
  if (!quiz.questions || !quiz.questions.length) return <div>This quiz has no questions.</div>;

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="quiz-taker">
        <h2>{quiz.title}</h2>
        <div className="quiz-progress">
          <span>Question {currentQuestionIndex + 1} of {quiz.questions.length}</span>
          <span>Answered: {answeredCount} of {quiz.questions.length}</span>
        </div>
        <div className={`timer ${getTimeColor()}`}>
          Time Left: {formatTime(timeLeft)}
        </div>

      {error && <div className="error">{error}</div>}
      
      {score !== null && (
        <div className="score-display">
          <h3>Quiz Submitted!</h3>
          <p>Your score: {score} out of {quiz.questions.length}</p>
        </div>
      )}

      {score === null && (
        <>
          <div className="question-container">
            <h3 className="question-text">{currentQuestion.question}</h3>
            <div className="options-list">
              {currentQuestion.options.map((option, index) => (
                <div
                  key={index}
                  className={`option ${answers[`q${currentQuestionIndex}`] === index ? 'selected' : ''}`}
                  onClick={() => handleAnswerSelect(currentQuestionIndex, index)}
                >
                  <label className="option-label">
                    <input
                      type="radio"
                      name={`question-${currentQuestionIndex}`}
                      checked={answers[`q${currentQuestionIndex}`] === index}
                      onChange={() => handleAnswerSelect(currentQuestionIndex, index)}
                    />
                    <span className="option-marker">{String.fromCharCode(65 + index)}</span>
                    <span className="option-text">{option}</span>
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="quiz-navigation">
            <button
              type="button"
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0}
              className={currentQuestionIndex === 0 ? 'disabled' : ''}
            >
              Previous
            </button>

            {currentQuestionIndex < quiz.questions.length - 1 ? (
              <button type="button" onClick={handleNextQuestion}>Next</button>
            ) : (
              <button
                type="button"
                onClick={confirmSubmit}
                disabled={loading}
                className="submit-button"
              >
                {loading ? 'Submitting...' : 'Submit Quiz'}
              </button>
            )}
          </div>

          <div className="question-navigator">
            {quiz.questions.map((_, index) => (
              <button
                type="button"
                key={index}
                className={`nav-dot ${index === currentQuestionIndex ? 'active' : ''} ${answers[`q${index}`] !== undefined ? 'answered' : ''}`}
                onClick={() => setCurrentQuestionIndex(index)}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Confirm Submission</h3>
            <p>You've only answered {Object.keys(answers).length} out of {quiz.questions.length} questions.</p>
            <p>Are you sure you want to submit?</p>
            <div className="modal-actions">
              <button onClick={() => setShowConfirmModal(false)} className="cancel-button">
                Cancel
              </button>
              <button onClick={handleSubmit} className="submit-button">
                Submit Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentDashboard;