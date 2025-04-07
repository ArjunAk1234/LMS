import React, { useState, useEffect } from "react";
import axios from "axios";

const Assignment = () => {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [assignments, setAssignments] = useState([]); // Ensure it starts as an array
  const [isAdmin, setIsAdmin] = useState(false);
  const [newAssignment, setNewAssignment] = useState({ name: "", description: "", due_date: "", pdf: null });
  const [showCreateAssignment, setShowCreateAssignment] = useState(false);
  const [file, setFile] = useState(null);
  const [studentName, setStudentName] = useState("");
  const [submissions, setSubmissions] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [gradeData, setGradeData] = useState({ grade: "", feedback: "" });

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
      setCourses(res.data);
    } catch (error) {
      console.error("Error fetching courses:", error);
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

  const selectCourse = async (course) => {
    setSelectedCourse(course);
    try {
      const res = await axios.get(`http://localhost:8000/students/courses/${course.name}/assignments`);
      setAssignments(res.data.assignments || []);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      setAssignments([]);
    }
  };
const createAssignment = async () => {
    if (!newAssignment.name || !newAssignment.description || !newAssignment.due_date) {
      alert("Please fill in all fields.");
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
        `http://localhost:8000/admin/courses/${selectedCourse.name}/assignments`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
  
      setNewAssignment({ name: "", description: "", due_date: "", pdf: null });
      setShowCreateAssignment(false);
      selectCourse(selectedCourse);
    } catch (error) {
      console.error("Error creating assignment:", error);
    }
  };
  
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const uploadAssignment = async (assignment) => {
    if (!file) {
      alert("Please select a file.");
      return;
    }

    if (!studentName) {
      alert("Student name not found. Please log in.");
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
      alert("Assignment submitted successfully!");
    } catch (error) {
      console.error("Error uploading assignment:", error);
    }
  };

  const getSubmissions = async (assignment) => {
    try {
      const res = await axios.get(`http://localhost:8000/admin/courses/${selectedCourse.name}/assignments/${assignment.name}/submissions`);
      setSubmissions(res.data.submissions || []);
      setSelectedAssignment(assignment);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      setSubmissions([]);
    }
  };

  const handleGradeChange = (e) => {
    const { name, value } = e.target;
    setGradeData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const submitGrade = async (student) => {
    try {
      const { grade, feedback } = gradeData;
      await axios.post(
        `http://localhost:8000/admin/courses/${selectedCourse.name}/assignments/${selectedAssignment.name}/students/${student}/grade`,
        { grade, feedback }
      );
      alert("Grade and feedback submitted!");
      setGradeData({ grade: "", feedback: "" });
      getSubmissions(selectedAssignment);
    } catch (error) {
      console.error("Error submitting grade:", error);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Assignment Management</h1>

      {isAdmin && (
        <button className="bg-blue-500 text-white px-4 py-2 mb-4" onClick={() => setShowCreateAssignment(true)}>
          Create Assignment
        </button>
      )}

      {showCreateAssignment && (
        <div className="p-4 border rounded mb-4">
          <input
            type="text"
            placeholder="Assignment Name"
            value={newAssignment.name}
            onChange={(e) => setNewAssignment({ ...newAssignment, name: e.target.value })}
            className="border p-2 mr-2"
          />
          <textarea
            placeholder="Description"
            value={newAssignment.description}
            onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
            className="border p-2 mr-2 w-full"
          ></textarea>
          <input
            type="date"
            value={newAssignment.due_date}
            onChange={(e) => setNewAssignment({ ...newAssignment, due_date: e.target.value })}
            className="border p-2 mr-2"
          />
          <input
            type="file"
            onChange={handleFileChange}
            className="border p-2"
          />
          <button className="bg-green-500 text-white px-4 py-2 mt-2" onClick={createAssignment}>
            Add Assignment
          </button>
        </div>
      )}

<div className="grid grid-cols-3 gap-4">
  {courses?.length > 0 ? (
    courses.map((course) => (
      <div
        key={course.name}
        className="border p-4 cursor-pointer hover:bg-gray-100"
        onClick={() => selectCourse(course)}
      >
        {course.name}
      </div>
    ))
  ) : (
    <p>No courses available</p> // Handle empty state
  )}
</div>

      {selectedCourse && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold">Assignments for {selectedCourse.name}</h2>
          {assignments && assignments.length > 0 ? (
            <ul>
              {assignments.map((assignment) => (
                <li key={assignment.name} className="border p-4 mb-2 rounded">
                  <h3 className="font-bold">{assignment.name}</h3>
                  <p>{assignment.description}</p>
                  <p className="text-gray-600">Due Date: {assignment.due_date}</p>
                  {assignment.pdf && (
                    <a
                      href={`http://localhost:8000/course/${selectedCourse.name}/assignment/${assignment.name}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 underline"
                    >
                      Download PDF
                    </a>
                  )}
                  {!isAdmin && (
                    <div className="mt-2">
                      <input type="file" onChange={handleFileChange} className="border p-2" />
                      <button
                        className="bg-blue-500 text-white px-4 py-2 mt-2 rounded hover:bg-blue-600"
                        onClick={() => uploadAssignment(assignment)}
                      >
                        Submit Assignment
                      </button>
                    </div>
                  )}

                  {isAdmin && (
                    <button
                      className="bg-blue-500 text-white px-4 py-2 mt-2"
                      onClick={() => getSubmissions(assignment)}
                    >
                      View Submissions
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 mt-2">No assignments available for this course.</p>
          )}

          {selectedAssignment && isAdmin && (
            <div className="mt-4">
              <h3 className="font-bold">Submissions for {selectedAssignment.name}</h3>
              {submissions.length > 0 ? (
                // <ul>
                //   {submissions.map((submission) => (
                //     <li key={submission.student} className="border p-4 mb-2 rounded">
                //       <h4 className="font-semibold">{submission.student}</h4>
                //       {submission.filePath && (
                //         <a
                //           href={`http://localhost:8000/${submission.filePath}`}
                //           target="_blank"
                //           rel="noopener noreferrer"
                //           className="text-blue-500 underline"
                //         >
                //           Download Submitted File
                //         </a>
                //       )}
                //       <div className="mt-2">
                //         <input
                //           type="text"
                //           placeholder="Grade"
                //           name="grade"
                //           value={gradeData.grade}
                //           onChange={handleGradeChange}
                //           className="border p-2 mr-2"
                //         />
                //         <textarea
                //           placeholder="Feedback"
                //           name="feedback"
                //           value={gradeData.feedback}
                //           onChange={handleGradeChange}
                //           className="border p-2 mr-2 w-full"
                //         ></textarea>
                //         <button
                //           className="bg-green-500 text-white px-4 py-2 mt-2"
                //           onClick={() => submitGrade(submission.student)}
                //         >
                //           Submit Grade
                //         </button>
                //       </div>
                //     </li>
                //   ))}
                // </ul>
                <ul>
   {submissions.map((submission, index) => (
    
    <li key={`${submission.student}-${submission.Grade}-${submission.assignmentName || index}`} className="border p-4 mb-2 rounded">
    
      <h4 className="font-semibold">{submission.Student || 'Unknown Student'}</h4>
      <h4 className="font-semibold">{submission.Grade}</h4>
      
      {submission.FilePath && (
        <a
        //   href={`http://localhost:8000/${submission.FilePath}`}

          href={`http://localhost:8000/${submission.FilePath.replace(/\\/g, '/')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 underline"
        >
          Download Submitted File
        </a>
      )}
      
      {/* <div className="mt-2">
        <input
          type="text"
          placeholder="Grade"
          name="grade"
          value={gradeData.grade}
          onChange={handleGradeChange}
          className="border p-2 mr-2"
        />
        <textarea
          placeholder="Feedback"
          name="feedback"
          value={gradeData.feedback}
          onChange={handleGradeChange}
          className="border p-2 mr-2 w-full"
        ></textarea>
        <button
          className="bg-green-500 text-white px-4 py-2 mt-2"
          onClick={() => submitGrade(submission.Student)}
        >
          Submit Grade
        </button>
      </div> */}
      {submission.Grade === "not graded" ? (
  <div className="mt-2">
    <input
      type="text"
      placeholder="Grade"
      name="grade"
      value={gradeData.grade}
      onChange={handleGradeChange}
      className="border p-2 mr-2"
    />
    <textarea
      placeholder="Feedback"
      name="feedback"
      value={gradeData.feedback}
      onChange={handleGradeChange}
      className="border p-2 mr-2 w-full"
    ></textarea>
    <button
      className="bg-green-500 text-white px-4 py-2 mt-2"
      onClick={() => submitGrade(submission.Student)}
    >
      Submit Grade
    </button>
  </div>
) : (
  <div className="mt-2">
    <h3>Current Grade: {submission.Grade}</h3>
    <p><strong>Feedback:</strong> {submission.Feedback}</p>
    {/* If the submission is already graded, allow updates */}
    <h4>Update Grade and Feedback</h4>
    <input
      type="text"
      placeholder="Update Grade"
      name="grade"
      value={gradeData.grade}
      onChange={handleGradeChange}
      className="border p-2 mr-2"
    />
    <textarea
      placeholder="Update Feedback"
      name="feedback"
      value={gradeData.feedback}
      onChange={handleGradeChange}
      className="border p-2 mr-2 w-full"
    ></textarea>
    <button
      className="bg-blue-500 text-white px-4 py-2 mt-2"
      onClick={() => updateGrade(submission.Student)} // Assuming updateGrade is your update function
    >
      Update Grade
    </button>
  </div>
)}

    
   

    </li>
  ))}
</ul>

              ) : (
                <p>No submissions yet.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Assignment;
