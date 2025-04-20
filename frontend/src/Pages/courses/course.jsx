import React, { useState, useEffect } from "react";
import axios from "axios";
import "./course.css";
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';

export default function CourseManagement() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [resources, setResources] = useState([]);
  const [notes, setNotes] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newCourse, setNewCourse] = useState("");
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [resourceFile, setResourceFile] = useState(null);
  const [noteName, setNoteName] = useState("");
  const [noteContent, setNoteContent] = useState("");
  useEffect(() => {
    document.body.classList.add("course-body");
    return () => {
      document.body.classList.remove("course-body");
    };
  }, []);
  useEffect(() => {
    fetchCourses();
    const email = localStorage.getItem("email");
    checkAdmin(email);
  }, []);

  const fetchCourses = async () => {
    try {
      const res = await axios.get("http://localhost:8000/courses");
      setCourses(res.data || []);
    } catch (error) {
      console.error("Error fetching courses:", error);
      setCourses([]);
    }
  };

  const checkAdmin = async (email) => {
    try {
      const res = await axios.post("http://localhost:8000/check-role", { email });
      setIsAdmin(res.data?.isAdmin || false);
    } catch (error) {
      console.error("Error checking admin role:", error);
      setIsAdmin(false);
    }
  };
  const deleteCourse = (courseName) => {
    // Using SweetAlert2
    Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to delete the course "${courseName}"? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        // User confirmed, proceed with deletion
        let fetchOptions = {
          method: 'DELETE',
        };
        const authToken = localStorage.getItem('authToken');
        if (authToken) {
          fetchOptions.headers = { 'Authorization': `Bearer ${authToken}` };
        }
        
        fetch(`http://localhost:8000/admin/deletecourse/${courseName}`, fetchOptions)
          .then(response => {
            if (!response.ok) {
              throw new Error('Failed to delete course');
            }
            return response.json();
          })
          .then(data => {
            // Show success message with SweetAlert
            Swal.fire(
              'Deleted!',
              'Course has been deleted successfully.',
              'success'
            );
            
            setCourses(courses.filter(course => course.name !== courseName));
            setSelectedCourse(null);
            setResources([]);
            setNotes([]);
          })
          .catch(error => {
            console.error('Error deleting course:', error);
            
            // Show error message with SweetAlert
            Swal.fire(
              'Error!',
              'Failed to delete the course. Please try again.',
              'error'
            );
          });
      }
    });
  };
  const selectCourse = async (course) => {
    setSelectedCourse(course);
    try {
      const res = await axios.get(`http://localhost:8000/course/${course.name}/resources`);
      setResources(res.data?.resources || []);
      setNotes(res.data?.notes || []);
    } catch (error) {
      console.error("Error fetching resources:", error);
      setResources([]);
      setNotes([]);
    }
  };

  const createCourse = async () => {
    try {
      await axios.post("http://localhost:8000/admin/course", { name: newCourse });
      setNewCourse("");
      setShowCreateCourse(false);
      fetchCourses();
      toast.success("Course created Successfully")
    } catch (error) {
      console.error("Error creating course:", error);
      toast.error("Error creating course")
    }
  };

  const uploadResource = async () => {
    if (!resourceFile || !selectedCourse) return;
    const formData = new FormData();
    formData.append("file", resourceFile);

    try {
      await axios.post(
        `http://localhost:8000/admin/course/${selectedCourse.name}/resource`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      toast.success("Resource uploaded successfully!");
    selectCourse(selectedCourse);
  } catch (error) {
    toast.error("Failed to upload resource.");
    console.error("Error uploading resource:", error);
  }
  };

  const uploadNote = async () => {
    if (!noteName.trim() || !noteContent.trim() || !selectedCourse) {
      toast.error("Please enter both note name and content.");
      return;
    }

    const noteData = {
      name: noteName.trim(),
      content: noteContent.trim(),
    };

    try {
      await axios.post(
        `http://localhost:8000/admin/courses/${selectedCourse.name}/uploadTextNote`,
        noteData,
        { headers: { "Content-Type": "application/json" } }
      );
      toast.success("Note uploaded successfully!");
      setNoteName("");
      setNoteContent("");
      selectCourse(selectedCourse);
    } catch (error) {
      console.error("Error uploading note:", error);
      toast.error("Failed to upload note.");

    }
  };

  return (
<div className="course-container p-6">
<h1 className="text-2xl font-bold mb-4">Course</h1>

      {isAdmin && (
        <div className="admin-create-course-btn">
          <button className="bg-blue-500 text-white px-4 py-2 mb-4" onClick={() => setShowCreateCourse(true)}>
            Create Course
          </button>
        </div>
      )}

      {showCreateCourse && (
        <div className="create-course-form p-4 border rounded mb-4">
          <input
            type="text"
            placeholder="Course Name"
            value={newCourse}
            onChange={(e) => setNewCourse(e.target.value)}
            className="border p-2 mr-2"
          />
          <button className="bg-green-500 text-white px-4 py-2" onClick={createCourse}>
            Add Course
          </button>
        </div>
      )}
      {courses.length === 0 && (
  <div className="empty-courses-message text-center p-10">
    <img 
  src="course.gif" 
  alt="No courses available" 
  className="mx-auto mb-4 w-1/2 h-1/2 object-contain"
/>

    <p className="no-courses-text text-xl font-bold text-gray-700">
      Hang tight! Courses will be added soon
    </p>
  </div>
)}
      <div className="course-list grid grid-cols-3 gap-x-1 gap-y-12">
        {courses.map((course) => (
          <div
            key={course.name}
            className="course-card border p-4 cursor-pointer hover:bg-gray-100"
            onClick={() => selectCourse(course)}
          >
            {course.name}
          </div>
        ))}
      </div>

      {selectedCourse && (
        <div className="selected-course mt-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Resources for {selectedCourse.name}</h2>
            {isAdmin && (
              <button
                className="bg-red-500 hover:bg-red-700 text-white px-4 py-2 rounded"
                onClick={() => deleteCourse(selectedCourse.name)}
              >
                Delete Course
              </button>
            )}
          </div>

          <div className="resource-section mt-4">
            <h2 className="text-xl font-semibold">Resources</h2>
            {resources.length > 0 ? (
              <ul className="resource-list list-disc pl-5">
                {resources.map((res) => (
                  <li key={res}>
                    <a
                      href={`http://localhost:8000/course/${selectedCourse.name}/resource/${res}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {res}
                    </a>
                  </li>

                ))}
              </ul>
            ) : (
              <p className="no-resources-message text-gray-600 mt-2">No resources available</p>
            )}
          </div>

          <div className="note-section mt-4">
            <h2 className="text-xl font-semibold">Notes</h2>
            {notes.length > 0 ? (
              <ul className="note-list list-disc pl-5">
                {notes.map((note) => (
                  <li key={note}>
                    <a
                      href={`http://localhost:8000/courses/${selectedCourse.name}/downloadNotes/${note}`}
                      download
                    >
                      {note}
                    </a>
                  </li>
                ))}

              </ul>
            ) : (
              <p className="no-notes-message text-gray-600 mt-2">No notes available</p>
            )}
          </div>

          {isAdmin && (
            <div className="admin-actions mt-6">
              <h2 className="text-lg font-bold mb-2">Admin Actions</h2>

              <div className="upload-resource mb-4">
                <h3 className="font-semibold mb-2">Upload Resource</h3>
                <input
                  type="file"
                  onChange={(e) => setResourceFile(e.target.files[0])}
                  className="border p-2"
                />
                <button className="bg-blue-500 text-white px-4 py-2 ml-2" onClick={uploadResource}>
                  Upload
                </button>
              </div>

              <div className="upload-note">
                <h3 className="font-semibold mb-2">Upload Note</h3>
                <input
                  type="text"
                  value={noteName}
                  onChange={(e) => setNoteName(e.target.value)}
                  placeholder="Enter note name"
                  className="border p-2 w-full mb-2"
                />
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Enter note content"
                  className="border p-2 w-full"
                  rows="4"
                ></textarea>
                <button className="bg-green-500 text-white px-4 py-2 mt-2" onClick={uploadNote}>
                  Upload Note
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
