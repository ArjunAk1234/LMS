import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import './admin.css'

function AdminDashboard() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('allQuizzes');
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [studentEmail, setStudentEmail] = useState('');
  const [studentProgress, setStudentProgress] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    document.body.classList.add("admin-body");
    return () => {
      document.body.classList.remove("admin-body");
    };
  }, []);
  useEffect(() => {
    fetchAllQuizzes();
  }, []);

  const fetchAllQuizzes = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:8000/admin/quizzes');
      setQuizzes(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch quizzes');
      setLoading(false);
    }
  };

  const fetchSubmissions = async (quizId) => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:8000/admin/submissions/quiz/${quizId}`);
      setSubmissions(response.data.submissions || []);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch submissions');
      setLoading(false);
    }
  };

  const fetchStudentProgress = async () => {
    if (!studentEmail) {
      setError('Please enter a student email');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:8000/admin/student-progress/email/${studentEmail}`);
      setStudentProgress(response.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch student progress');
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

      if (newView === 'submissions') {
        fetchSubmissions(quiz.id);
      } else if (newView === 'leaderboard') {
        fetchLeaderboard(quiz.id);
      }
    }
  };

  const renderQuizList = () => {
    if (loading) return <div className="loading">Loading quizzes...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
      <div className="quiz-list">
        <h2>All Quizzes</h2>
        {quizzes.length === 0 ? (
          <div>No quizzes available. Create a quiz to get started.</div>
        ) : (
<div className="quiz-table-container">
  <table className="quiz-table">
    <thead className="quiz-table-head">
      <tr className="quiz-table-head-row">
        <th className="quiz-table-header-cell">Title</th>
        <th className="quiz-table-header-cell">Start Time</th>
        <th className="quiz-table-header-cell">End Time</th>
        <th className="quiz-table-header-cell">Questions</th>
        <th className="quiz-table-header-cell">Actions</th>
      </tr>
    </thead>
    <tbody className="quiz-table-body">
      {quizzes.map((quiz) => (
        <tr key={quiz.id} className="quiz-table-row">
          <td className="quiz-table-cell">{quiz.title}</td>
          <td className="quiz-table-cell">{new Date(quiz.startTime).toLocaleString()}</td>
          <td className="quiz-table-cell">{new Date(quiz.endTime).toLocaleString()}</td>
          <td className="quiz-table-cell">{quiz.questions.length}</td>
          <td className="quiz-table-cell">
            <button className="quiz-action-button" onClick={() => handleViewChange('submissions', quiz)}>
              Submissions
            </button>
            <button className="quiz-action-button" onClick={() => handleViewChange('leaderboard', quiz)}>
              Leaderboard
            </button>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>

        )}
      </div>
    );
  };

  const renderSubmissions = () => {
    if (!selectedQuiz) return <div>No quiz selected</div>;
    if (loading) return <div className="loading">Loading submissions...</div>;

    return (
      <div className="submissions">
        <h2>Submissions: {selectedQuiz.title}</h2>
        {submissions.length === 0 ? (
          <p>No submissions yet</p>
        ) : (
          <table className='progress-table'>
            <thead>
              <tr>
                <th>Email</th>
                <th>Username</th>
                <th>Score</th>
                <th>Submitted At</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub, index) => (
                <tr key={index}>
                  <td>{sub.studentId}</td>
                  <td>{sub.studentname}</td>
                  <td>{sub.score} / {selectedQuiz.questions.length}</td>
                  <td>{new Date(sub.submitted_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <button
  onClick={() => handleViewChange('allQuizzes')}
  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 mt-4"
>
  Back to Quizzes
</button>

      </div>
    );
  };

  const renderStudentProgress = () => {
    return (
      <div className="student-progress">
        <h2>Student Progress</h2>
        <div className="search-bar">
          <input
            type="email"
            placeholder="Enter student email"
            value={studentEmail}
            onChange={(e) => setStudentEmail(e.target.value)}
          />
          <button onClick={fetchStudentProgress}>Search</button>
        </div>

        {loading ? (
          <div className="loading">Loading progress...</div>
        ) : studentProgress.length > 0 ? (
          <table className="progress-table">
            <thead>
              <tr>
                <th>Quiz Title</th>
                <th>Status</th>
                <th>Score</th>
                <th>Submitted At</th>
              </tr>
            </thead>
            <tbody>
              {studentProgress.map((item, index) => (
                <tr key={index} className={item.status === 'missed' ? 'missed' : ''}>
                  <td>{item.title}</td>
                  <td>{item.status}</td>
                  <td>{item.status === 'submitted' ? `${item.score}` : 'N/A'}</td>
                  <td>
                    {item.submittedAt
                      ? new Date(item.submittedAt).toLocaleString()
                      : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : error ? (
          <div className="error">{error}</div>
        ) : (
          <p>Enter student email to view progress</p>
        )}
      </div>
    );
  };

  const renderLeaderboard = () => {
    if (!selectedQuiz) return <div>No quiz selected</div>;
    if (loading) return <div className="loading">Loading leaderboard...</div>;

    return (
      <div className="leaderboard">
        <h2>Leaderboard: {selectedQuiz.title}</h2>
        {leaderboard.length === 0 ? (
          <p>No submissions yet</p>
        ) : (
          <table className='progress-table'>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Username</th>
                <th>Score</th>
                <th>Submitted At</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry) => (
                <tr key={entry.email}>
                  <td>{entry.rank}</td>
                  <td>{entry.username}</td>
                  <td>{entry.score} / {selectedQuiz.questions.length}</td>
                  <td>{new Date(entry.submittedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
<button
  onClick={() => handleViewChange('allQuizzes')}
  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 mt-4"
>
  Back to Quizzes
</button>      </div>
    );
  };

  return (
    <div className="admin-container">
      <div className="header">
        <h1 className='admin-h1'>Quiz Admin Dashboard</h1>
        <nav>
          <button onClick={() => handleViewChange('allQuizzes')}>All Quizzes</button>
          <button onClick={() => handleViewChange('createQuiz')}>Create Quiz</button>
          <button onClick={() => handleViewChange('progress')}>Student Progress</button>
        </nav>
      </div>


      <main>
        {view === 'allQuizzes' && renderQuizList()}
        {view === 'createQuiz' && <QuizCreator onQuizCreated={fetchAllQuizzes} />}
        {view === 'submissions' && renderSubmissions()}
        {view === 'progress' && renderStudentProgress()}
        {view === 'leaderboard' && renderLeaderboard()}
      </main>
    </div>
  );
}

// Quiz Creator Component
function QuizCreator({ onQuizCreated }) {
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [questions, setQuestions] = useState([{ question: '', options: ['', '', '', ''], answer: '' }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const addQuestion = () => {
    setQuestions([...questions, { question: '', options: ['', '', '', ''], answer: '' }]);
  };

  const updateQuestion = (index, field, value) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index][field] = value;
    setQuestions(updatedQuestions);
  };

  const updateOption = (questionIndex, optionIndex, value) => {
    const updatedQuestions = [...questions];
    updatedQuestions[questionIndex].options[optionIndex] = value;
    setQuestions(updatedQuestions);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    // Validate form first
    if (!title || !startTime || !endTime) {
      Swal.fire({
        title: 'Missing Information',
        text: 'Please fill all required fields',
        icon: 'warning',
        confirmButtonColor: '#3085d6'
      });
      return;
    }
  
    if (questions.some(q => !q.question || q.options.some(opt => !opt) || !q.answer)) {
      Swal.fire({
        title: 'Incomplete Questions',
        text: 'Please complete all questions with options and answers',
        icon: 'warning',
        confirmButtonColor: '#3085d6'
      });
      return;
    }
  
    // If validation passes, show confirmation dialog
    Swal.fire({
      title: 'Create Quiz?',
      text: `Are you sure you want to create the quiz "${title}" with ${questions.length} question(s)?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, create it!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          setLoading(true);
          // Format dates to RFC3339
          const formattedStartTime = new Date(startTime).toISOString();
          const formattedEndTime = new Date(endTime).toISOString();
  
          await axios.post('http://localhost:8000/admin/create-quiz', {
            title,
            questions,
            startTime: formattedStartTime,
            endTime: formattedEndTime
          });
  
          // Show success message
          Swal.fire({
            title: 'Success!',
            text: 'Quiz has been created successfully',
            icon: 'success',
            confirmButtonColor: '#3085d6'
          });
  
          // Reset form
          setTitle('');
          setStartTime('');
          setEndTime('');
          setQuestions([{ question: '', options: ['', '', '', ''], answer: '' }]);
          setError(null);
  
          // Notify parent component
          onQuizCreated();
          setLoading(false);
        } catch (err) {
          Swal.fire({
            title: 'Error!',
            text: 'Failed to create quiz',
            icon: 'error',
            confirmButtonColor: '#3085d6'
          });
          setLoading(false);
        }
      }
    });
  };

  return (
    <div className="quiz-creator">
      <h2>Create New Quiz</h2>
      {error && <div className="error">{error}</div>}

      <form className='quiz-form' onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Quiz Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter quiz title"
            required
          />
        </div>

        <div className="form-group">
          <label>Start Time</label>
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>End Time</label>
          <input
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
          />
        </div>

        <h3>Questions</h3>
        {questions.map((q, qIndex) => (
          <div key={qIndex} className="question-block">
            <h4>Question {qIndex + 1}</h4>
            <input
              type="text"
              placeholder="Enter question"
              value={q.question}
              onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
              required
            />

            <div className="options">
              {q.options.map((option, oIndex) => (
                <div key={oIndex} className="option">
                  <input
                    type="text"
                    placeholder={`Option ${oIndex + 1}`}
                    value={option}
                    onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                    required
                  />
                  <input
                    type="radio"
                    name={`correct-${qIndex}`}
                    checked={q.answer === option}
                    onChange={() => updateQuestion(qIndex, 'answer', option)}
                    disabled={!option}
                  />
                  <label>Correct</label>
                </div>
              ))}
            </div>
          </div>
        ))}

        <button type="button" onClick={addQuestion}>Add Question</button>
        <button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Quiz'}
        </button>
      </form>
    </div>
  );
}

export default AdminDashboard;