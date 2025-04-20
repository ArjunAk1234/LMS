import React, { useState, useEffect } from "react";
import axios from "axios";
import "./assignment.css";
import { toast } from "react-toastify";
import Swal from 'sweetalert2';


const Assignment = () => {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newAssignment, setNewAssignment] = useState({ name: "", description: "", due_date: "", pdf: null, courseName: "" });
  const [showCreateAssignment, setShowCreateAssignment] = useState(false);
  const [file, setFile] = useState(null);
  const [studentName, setStudentName] = useState("");
  const [submissions, setSubmissions] = useState({});
  const [expandedAssignments, setExpandedAssignments] = useState({});
  const [gradeData, setGradeData] = useState({});
  const [submissionStatuses, setSubmissionStatuses] = useState({});
  const [searchUngraded, setSearchUngraded] = useState({});
  const [searchGraded, setSearchGraded] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    document.body.classList.add("assignment-body");
    return () => {
      document.body.classList.remove("assignment-body");
    };
  }, []);

  useEffect(() => {
    fetchCourses();
    const email = localStorage.getItem("email");
    checkAdmin(email);
    const fetchUsername = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          console.error("No token found. Please log in.");
          return;
        }
        const response = await axios.get("http://localhost:8000/username", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.data && response.data.loggedIn) {
          setStudentName(response.data.loggedIn);
          localStorage.setItem("studentName", response.data.loggedIn);
        } else {
          console.error("Username not found in response");
        }
      } catch (error) {
        console.error("Error fetching username:", error);
      }
    };

    fetchUsername();
  }, []);

  const fetchCourses = async () => {
    try {
      const res = await axios.get("http://localhost:8000/courses");
      // Safeguard: ensure courses is an array
      setCourses(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Error fetching courses:", error);
      setCourses([]);
    }
  };

  const checkAdmin = async (email) => {
    try {
      const res = await axios.post("http://localhost:8000/check-role", { email });
      setIsAdmin(res.data.isAdmin);
    } catch (error) {
      console.error("Error checking admin role:", error);
      setIsAdmin(false);
    }
  };

  const deleteAssignment = (courseName, assignmentName) => {
    // Use SweetAlert for confirmation
    Swal.fire({
      title: 'Are you sure?',
      html: `Do you want to delete the assignment <strong>"${assignmentName}"</strong> from course <strong>"${courseName}"</strong>?<br><br>This action cannot be undone and will delete all student submissions.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        // User confirmed, proceed with deletion
        fetch(`http://localhost:8000/admin/course/${courseName}/deleteassignment/${assignmentName}`, {
          method: 'DELETE',
        })
          .then(response => {
            if (!response.ok) {
              throw new Error('Failed to delete assignment');
            }
            return response.json();
          })
          .then(data => {
            // Show success message with SweetAlert
            Swal.fire({
              title: 'Deleted!',
              text: 'Assignment has been deleted successfully.',
              icon: 'success',
              confirmButtonColor: '#3085d6'
            });
            
            // Remove the assignment from the assignments array
            setAssignments(assignments.filter(a => a.name !== assignmentName));
  
            // Clear any related state
            const newSubmissions = { ...submissions };
            delete newSubmissions[assignmentName];
            setSubmissions(newSubmissions);
  
            const newExpandedAssignments = { ...expandedAssignments };
            delete newExpandedAssignments[assignmentName];
            setExpandedAssignments(newExpandedAssignments);
  
            // Clear any other assignment-specific state
            const newGradeData = { ...gradeData };
            delete newGradeData[assignmentName];
            setGradeData(newGradeData);
  
            const newSearchGraded = { ...searchGraded };
            delete newSearchGraded[assignmentName];
            setSearchGraded(newSearchGraded);
  
            const newSearchUngraded = { ...searchUngraded };
            delete newSearchUngraded[assignmentName];
            setSearchUngraded(newSearchUngraded);
          })
          .catch(error => {
            console.error('Error deleting assignment:', error);
            
            toast.error("Error deleting assignment")
          });
      }
    });
  };

  const selectCourse = async (course) => {
    // Set loading state to true
    setIsLoading(true);

    // Reset all assignment-related states first
    setAssignments([]);
    setExpandedAssignments({});
    setSubmissions({});
    setGradeData({});
    setSubmissionStatuses({});
    setSearchUngraded({});
    setSearchGraded({});

    // Then set the selected course
    setSelectedCourse(course);

    try {
      const res = await axios.get(`http://localhost:8000/students/courses/${course.name}/assignments`);
      const assignmentsData = Array.isArray(res.data.assignments) ? res.data.assignments : [];
      setAssignments(assignmentsData);

      if (!isAdmin && studentName) {
        const newStatuses = {};
        for (const assignment of assignmentsData) {
          const status = await checkSubmissionStatus(course.name, assignment.name);
          newStatuses[assignment.name] = status;
        }
        setSubmissionStatuses(newStatuses);
      }
    } catch (error) {
      console.error("Error fetching assignments:", error);
      setAssignments([]);
    } finally {
      // Set loading state to false when done
      setIsLoading(false);
    }
  };

  const checkSubmissionStatus = async (courseName, assignmentName) => {
    try {
      const response = await axios.post(
        `http://localhost:8000/students/${studentName}/courses/${courseName}/assignments/${assignmentName}/checksubmission`
      );
      if (response.data.message === "Submitted") {
        return {
          submitted: true,
          grade: response.data.grade || "Not Graded",
          feedback: response.data.feedback || "",
        };
      } else {
        return {
          submitted: false,
          grade: null,
          feedback: null,
        };
      }
    } catch (error) {
      console.error(`Error checking submission status for ${assignmentName}:`, error);
      return {
        submitted: false,
        grade: null,
        feedback: null,
      };
    }
  };

  const createAssignment = async () => {
    if (!newAssignment.name || !newAssignment.description || !newAssignment.due_date || !newAssignment.courseName) {
      toast.error("Please fill in all fields and select a course.");
      return;
    }

    const formData = new FormData();
    formData.append("name", newAssignment.name);
    formData.append("description", newAssignment.description);
    formData.append("due_date", newAssignment.due_date);

    // Only append the PDF if a file is selected
    if (newAssignment.pdf) {
      formData.append("pdf", newAssignment.pdf);
    }

    try {
      await axios.post(
        `http://localhost:8000/admin/courses/${newAssignment.courseName}/assignments`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      setNewAssignment({ name: "", description: "", due_date: "", pdf: null, courseName: "" });
      setShowCreateAssignment(false);

      // If the course with this name is currently selected, refresh assignments
      if (selectedCourse && selectedCourse.name === newAssignment.courseName) {
        selectCourse(selectedCourse);
      }

      toast.success("Assignment created successfully")
    } catch (error) {
      console.error("Error creating assignment:", error);
      toast.error("Error creating assignment. Please try again.");
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const uploadAssignment = async (assignment) => {
    if (!file) {
      toast.error("Please select a file.");
      return;
    }

    if (!studentName) {
      toast.error("Student name not found. Please log in.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      await axios.post(
        `http://localhost:8000/students/${studentName}/courses/${selectedCourse.name}/assignments/${assignment.name}/upload`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      toast.success("Assignment submitted successfully!");

      // After successful submission, update the submission status
      const status = await checkSubmissionStatus(selectedCourse.name, assignment.name);
      setSubmissionStatuses((prev) => ({
        ...prev,
        [assignment.name]: status,
      }));

      // Clear the file input
      setFile(null);
    } catch (error) {
      console.error("Error uploading assignment:", error);
    }
  };

  const getSubmissions = async (assignment) => {
    try {
      const res = await axios.get(`http://localhost:8000/admin/courses/${selectedCourse.name}/assignments/${assignment.name}/submissions`);

      // Store submissions by assignment name
      setSubmissions(prev => ({
        ...prev,
        [assignment.name]: Array.isArray(res.data.submissions) ? res.data.submissions : []
      }));

      // Initialize search state for this assignment if it doesn't exist
      if (!searchUngraded[assignment.name]) {
        setSearchUngraded(prev => ({ ...prev, [assignment.name]: "" }));
      }
      if (!searchGraded[assignment.name]) {
        setSearchGraded(prev => ({ ...prev, [assignment.name]: "" }));
      }

      // Toggle expanded state for this assignment
      setExpandedAssignments(prev => ({
        ...prev,
        [assignment.name]: !prev[assignment.name]
      }));
    } catch (error) {
      console.error("Error fetching submissions:", error);
      setSubmissions(prev => ({ ...prev, [assignment.name]: [] }));
    }
  };

  const handleGradeChange = (assignmentName, studentName, field, value) => {
    setGradeData(prev => ({
      ...prev,
      [assignmentName]: {
        ...prev[assignmentName],
        [studentName]: {
          ...(prev[assignmentName]?.[studentName] || {}),
          [field]: value
        }
      }
    }));
  };

  const submitGrade = async (assignmentName, studentName) => {
    try {
      const gradeInfo = gradeData[assignmentName]?.[studentName] || { grade: "", feedback: "" };
      await axios.post(
        `http://localhost:8000/admin/courses/${selectedCourse.name}/assignments/${assignmentName}/students/${studentName}/grade`,
        { grade: gradeInfo.grade, feedback: gradeInfo.feedback }
      );
      toast.success("Grade and feedback submitted!");

      // Clear the grade data for this student
      setGradeData(prev => {
        const newData = { ...prev };
        if (newData[assignmentName]) {
          const assignmentData = { ...newData[assignmentName] };
          delete assignmentData[studentName];
          newData[assignmentName] = assignmentData;
        }
        return newData;
      });

      // Refresh submissions for this assignment
      const res = await axios.get(`http://localhost:8000/admin/courses/${selectedCourse.name}/assignments/${assignmentName}/submissions`);
      setSubmissions(prev => ({
        ...prev,
        [assignmentName]: Array.isArray(res.data.submissions) ? res.data.submissions : []
      }));
    } catch (error) {
      console.error("Error submitting grade:", error);
    }
  };

  const updateGrade = async (assignmentName, studentName) => {
    try {
      const gradeInfo = gradeData[assignmentName]?.[studentName] || { grade: "", feedback: "" };
      await axios.post(
        `http://localhost:8000/admin/courses/${selectedCourse.name}/assignments/${assignmentName}/students/${studentName}/grade`,
        { grade: gradeInfo.grade, feedback: gradeInfo.feedback }
      );
      toast.success("Grade and feedback updated!");

      // Clear the grade data for this student
      setGradeData(prev => {
        const newData = { ...prev };
        if (newData[assignmentName]) {
          const assignmentData = { ...newData[assignmentName] };
          delete assignmentData[studentName];
          newData[assignmentName] = assignmentData;
        }
        return newData;
      });

      // Refresh submissions for this assignment
      const res = await axios.get(`http://localhost:8000/admin/courses/${selectedCourse.name}/assignments/${assignmentName}/submissions`);
      setSubmissions(prev => ({
        ...prev,
        [assignmentName]: Array.isArray(res.data.submissions) ? res.data.submissions : []
      }));
    } catch (error) {
      console.error("Error updating grade:", error);
    }
  };

  const handleSearchChange = (assignmentName, type, value) => {
    if (type === 'ungraded') {
      setSearchUngraded(prev => ({ ...prev, [assignmentName]: value }));
    } else {
      setSearchGraded(prev => ({ ...prev, [assignmentName]: value }));
    }
  };

  return (
    <div className="assignment-container p-6">

      <h1 className="text-2xl font-bold mb-4">Assignments</h1>

      {isAdmin && (
        <div className="admin-create-assignment-btn">
          <button className="bg-blue-500 text-white px-4 py-2 mb-4 rounded hover:bg-blue-600" onClick={() => setShowCreateAssignment(!showCreateAssignment)}>
            {showCreateAssignment ? "Cancel" : "Create Assignment"}
          </button>
        </div>
      )}

      {showCreateAssignment && (
        <div className="create-assignment-form p-4 border rounded mb-4 bg-gray-50">
          <h2 className="text-lg font-semibold mb-3">Create New Assignment</h2>

          {/* Course dropdown */}
          <div className="mb-3">
            <label className="block text-gray-700 mb-1">Select Course:</label>
            <select
              value={newAssignment.courseName}
              onChange={(e) => setNewAssignment({ ...newAssignment, courseName: e.target.value })}
              className="border p-2 w-full rounded"
            >
              <option value="">Select a course</option>
              {courses.map((course) => (
                <option key={course.name} value={course.name}>
                  {course.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-3">
            <label className="block text-gray-700 mb-1">Assignment Name:</label>
            <input
              type="text"
              placeholder="Assignment Name"
              value={newAssignment.name}
              onChange={(e) => setNewAssignment({ ...newAssignment, name: e.target.value })}
              className="border p-2 w-full rounded"
            />
          </div>

          <div className="mb-3">
            <label className="block text-gray-700 mb-1">Description:</label>
            <textarea
              placeholder="Description"
              value={newAssignment.description}
              onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
              className="border p-2 w-full rounded min-h-[100px]"
            ></textarea>
          </div>

          <div className="mb-3">
            <label className="block text-gray-700 mb-1">Due Date:</label>
            <input
              type="date"
              value={newAssignment.due_date}
              onChange={(e) => setNewAssignment({ ...newAssignment, due_date: e.target.value })}
              className="border p-2 w-full rounded"
            />
          </div>

          <div className="mb-3">
            <label className="block text-gray-700 mb-1">Assignment PDF (Optional):</label>
            <input
              type="file"
              onChange={(e) => setNewAssignment({ ...newAssignment, pdf: e.target.files[0] })}
              className="border p-2 w-full rounded"
            />
          </div>

          <button
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            onClick={createAssignment}
          >
            Add Assignment
          </button>
        </div>
      )}

      <div className="course-list grid grid-cols-3 gap-x-1 gap-y-12">
        {/* Guarding against courses being null using optional chaining */}
        {courses?.map((course) => (
          <div
            key={course.name}
            className={`course-card border p-4 cursor-pointer rounded ${selectedCourse && selectedCourse.name === course.name
              ? 'bg-blue-100 border-blue-500'
              : 'hover:bg-gray-100'
              }`}
            onClick={() => selectCourse(course)}
          >
            {course.name}
          </div>
        ))}
      </div>

      {isLoading && (
        <div className="loading-indicator mt-6 text-center">
          <p className="text-gray-500">Loading assignments...</p>
        </div>
      )}
      {courses.length === 0 && (
  <div className="empty-courses-message text-center p-10">
    <img 
  src="assignment.gif" 
  alt="No courses available" 
  className="mx-auto mb-4 w-1/2 h-1/2 object-contain"
/>

    <p className="no-courses-text text-xl font-bold text-gray-700">
      No assignments here yet — they'll show up once your courses begin!
    </p>
  </div>
)}
      {selectedCourse && !isLoading && (
        <div className="selected-course mt-6">
          <div className="assignment-section">
            <h2 className="text-xl font-semibold mb-4">Assignments for {selectedCourse.name}</h2>
            {assignments && assignments.length > 0 ? (
              <ul className="assignment-list">
                {assignments.map((assignment) => (
                  <li key={assignment.name} className="assignment-item border p-4 mb-4 rounded shadow">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-bold text-lg">{assignment.name}</h3>
                      {isAdmin && (
                        <button
                          onClick={() => deleteAssignment(selectedCourse.name, assignment.name)}
                          className="bg-red-500 hover:bg-red-700 text-white px-4 py-2 rounded"
                        >
                          Delete Assignment
                        </button>
                      )}
                    </div>
                    <p>{assignment.description}</p>
                    <p className="text-gray-600">Due Date: {assignment.due_date}</p>
                    <br />
                    {assignment.pdf && (
                      <button
                        onClick={() => {
                          window.open(`http://localhost:8000/uploads/courses/${selectedCourse.name}/assignments/${assignment.name}/assignment.pdf`, '_blank');
                        }}
                        className="download-pdf-btn bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded mr-2"
                      >
                        Download PDF
                      </button>
                    )}
                    {!isAdmin && (
                      <div className="student-submission mt-2">
                        {/* Show submission status if available */}
                        {submissionStatuses[assignment.name] && submissionStatuses[assignment.name].submitted ? (
                          <div className="submission-status bg-gray-100 p-3 mb-3 rounded">
                            <p className="font-medium">
                              Submission Status: <span className="text-green-600">Submitted</span>
                            </p>
                            {submissionStatuses[assignment.name].grade ? (
                              <div>
                                <p className="font-medium">
                                  Grade: <span className="font-bold">{submissionStatuses[assignment.name].grade}</span>
                                </p>
                                {submissionStatuses[assignment.name].feedback && (
                                  <p>
                                    <strong>Feedback:</strong> {submissionStatuses[assignment.name].feedback}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p className="text-orange-500">Not graded yet</p>
                            )}
                          </div>
                        ) : (
                          <div className="submission-status bg-gray-100 p-3 mb-3 rounded">
                            <p className="font-medium">
                              Submission Status: <span className="text-red-600">Not Submitted</span>
                            </p>
                          </div>
                        )}

                        {(!submissionStatuses[assignment.name] || !submissionStatuses[assignment.name].submitted) && (
                          <>
                            <input type="file" onChange={handleFileChange} className="border p-2" />
                            <button
  className="submit-assignment-btn bg-blue-500 text-white px-4 py-2 mt-2 rounded hover:bg-blue-600"
  onClick={() => {
    const isResubmission = submissionStatuses[assignment.name] && 
                           submissionStatuses[assignment.name].submitted;
    
    Swal.fire({
      title: isResubmission ? 'Resubmit Assignment?' : 'Submit Assignment?',
      text: isResubmission 
        ? `Are you sure you want to resubmit your work for "${assignment.name}"? This will replace your previous submission.` 
        : `Are you sure you want to submit your work for "${assignment.name}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: isResubmission ? 'Yes, resubmit' : 'Yes, submit'
    }).then((result) => {
      if (result.isConfirmed) {
        uploadAssignment(assignment);
      }
    });
  }}
>
  {submissionStatuses[assignment.name] && submissionStatuses[assignment.name].submitted
    ? "Resubmit Assignment"
    : "Submit Assignment"}
</button>
                          </>
                        )}
                      </div>
                    )}
                    <br />
                    {isAdmin && (
                      <button
                        className="view-submissions-btn bg-blue-500 text-white px-4 py-2 mt-2 rounded hover:bg-blue-600"
                        onClick={() => getSubmissions(assignment)}
                      >
                        {expandedAssignments[assignment.name] ? "Hide Submissions" : "View Submissions"}
                      </button>
                    )}

                    {/* Submissions section for each assignment */}
                    {isAdmin && expandedAssignments[assignment.name] && (
                      <div className="submissions-section mt-4 p-4 bg-gray-50 rounded">
                        <h3 className="submissions-title font-bold mb-4 text-lg">Submissions for {assignment.name}</h3>

                        {/* Search Bars */}
                        <div className="search-bars flex gap-4 mb-4">
                          <input
                            type="text"
                            placeholder="Search ungraded submissions..."
                            value={searchUngraded[assignment.name] || ""}
                            onChange={(e) => handleSearchChange(assignment.name, 'ungraded', e.target.value)}
                            className="ungraded-search border p-2 flex-1 rounded"
                          />
                          <input
                            type="text"
                            placeholder="Search graded submissions..."
                            value={searchGraded[assignment.name] || ""}
                            onChange={(e) => handleSearchChange(assignment.name, 'graded', e.target.value)}
                            className="graded-search border p-2 flex-1 rounded"
                          />
                        </div>

                        {/* Side-by-side container */}
                        <div className="submissions-container flex gap-4">
                          {/* Not Graded Section */}
                          <div className="ungraded-submissions w-1/2">
                            <h4 className="section-title text-lg font-semibold mb-2">Not Graded</h4>
                            <ul className="submission-list">
                              {(Array.isArray(submissions[assignment.name]) ? submissions[assignment.name] : [])
                                .filter(
                                  (s) =>
                                    (s.Grade === "not graded" || s.Grade === "Not Graded") &&
                                    (s.Student?.toLowerCase() || "").includes((searchUngraded[assignment.name] || "").toLowerCase())
                                )
                                .map((submission, index) => (
                                  <li key={`ungraded-${submission.Student}-${index}`} className="submission-item border p-4 mb-2 rounded bg-white shadow-sm">
                                    <h4 className="student-name font-semibold">{submission.Student}</h4>
                                    {submission.FilePath && (
                                      <a
                                        href={`http://localhost:8000/${submission.FilePath.replace(/\\/g, "/")}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="download-link text-blue-500 underline block mb-2"
                                      >
                                        Download Submitted File
                                      </a>
                                    )}
                                    <div className="grading-form mt-2">
                                      <input
                                        type="text"
                                        placeholder="Grade"
                                        value={gradeData[assignment.name]?.[submission.Student]?.grade || ""}
                                        onChange={(e) => handleGradeChange(assignment.name, submission.Student, 'grade', e.target.value)}
                                        className="grade-input border p-2 mr-2 w-full rounded"
                                      />
                                      <textarea
                                        placeholder="Feedback"
                                        value={gradeData[assignment.name]?.[submission.Student]?.feedback || ""}
                                        onChange={(e) => handleGradeChange(assignment.name, submission.Student, 'feedback', e.target.value)}
                                        className="feedback-input border p-2 w-full mt-2 rounded"
                                      ></textarea>
                                      <button
                                        className="submit-grade-btn bg-green-500 text-white px-4 py-2 mt-2 rounded hover:bg-green-600"
                                        onClick={() => submitGrade(assignment.name, submission.Student)}
                                      >
                                        Submit Grade
                                      </button>
                                    </div>
                                  </li>
                                ))}
                              {(Array.isArray(submissions[assignment.name]) ? submissions[assignment.name] : [])
                                .filter(s => s.Grade === "not graded" || s.Grade === "Not Graded").length === 0 && (
                                  <p className="text-gray-500 p-2">No ungraded submissions found.</p>
                                )}
                            </ul>
                          </div>

                          {/* Graded Section */}
                          <div className="graded-submissions w-1/2">
                            <h4 className="section-title text-lg font-semibold mb-2">Graded</h4>
                            <ul className="submission-list">
                              {(Array.isArray(submissions[assignment.name]) ? submissions[assignment.name] : [])
                                .filter(
                                  (s) =>
                                    s.Grade !== "not graded" &&
                                    s.Grade !== "Not Graded" &&
                                    (s.Student?.toLowerCase() || "").includes((searchGraded[assignment.name] || "").toLowerCase())
                                )
                                .map((submission, index) => (
                                  <li key={`graded-${submission.Student}-${index}`} className="submission-item border p-4 mb-2 rounded bg-white shadow-sm">
                                    <h4 className="student-name font-semibold">{submission.Student}</h4>
                                    <p>
                                      <strong>Grade:</strong> {submission.Grade}
                                    </p>
                                    <p>
                                      <strong>Feedback:</strong> {submission.Feedback}
                                    </p>
                                    {submission.FilePath && (
                                      <a
                                        href={`http://localhost:8000/${submission.FilePath.replace(/\\/g, "/")}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="download-link text-blue-500 underline block mb-2"
                                      >
                                        Download Submitted File
                                      </a>
                                    )}
                                    <div className="update-grade-form mt-2">
                                      <h4 className="update-title font-semibold mb-1">Update Grade and Feedback</h4>
                                      <input
                                        type="text"
                                        placeholder="Update Grade"
                                        value={gradeData[assignment.name]?.[submission.Student]?.grade || ""}
                                        onChange={(e) => handleGradeChange(assignment.name, submission.Student, 'grade', e.target.value)}
                                        className="grade-input border p-2 mr-2 w-full rounded"
                                      />
                                      <textarea
                                        placeholder="Update Feedback"
                                        value={gradeData[assignment.name]?.[submission.Student]?.feedback || ""}
                                        onChange={(e) => handleGradeChange(assignment.name, submission.Student, 'feedback', e.target.value)}
                                        className="feedback-input border p-2 w-full mt-2 rounded"
                                      ></textarea>
                                      <button
                                        className="update-grade-btn bg-blue-500 text-white px-4 py-2 mt-2 rounded hover:bg-blue-600"
                                        onClick={() => updateGrade(assignment.name, submission.Student)}
                                      >
                                        Update Grade
                                      </button>
                                    </div>
                                  </li>
                                ))}
                              {(Array.isArray(submissions[assignment.name]) ? submissions[assignment.name] : [])
                                .filter(s => s.Grade !== "not graded" && s.Grade !== "Not Graded").length === 0 && (
                                  <p className="text-gray-500 p-2">No graded submissions found.</p>
                                )}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-assignments-message text-center p-10">
                <p className="no-courses-text text-xl font-bold text-gray-700">
      No assignments for this course yet!
    </p>

                <p className="no-assignments-text text-xl font-bold text-gray-700">
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Assignment;