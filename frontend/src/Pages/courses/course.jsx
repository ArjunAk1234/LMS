
import React, { useState, useEffect } from "react";
import axios from "axios";
import "./course.css";

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
    fetchCourses();
    const email = localStorage.getItem("email");
    checkAdmin(email);
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
      const res = await axios.get(`http://localhost:8000/course/${course.name}/resources`);
      setResources(res.data.resources || []);
      setNotes(res.data.notes || []);
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
    } catch (error) {
      console.error("Error creating course:", error);
    }
  };

  const uploadResource = async () => {
    if (!resourceFile || !selectedCourse) return;
    const formData = new FormData();
    formData.append("file", resourceFile);

    try {
      await axios.post(`http://localhost:8000/admin/course/${selectedCourse.name}/resource`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("Resource uploaded successfully!");
      selectCourse(selectedCourse);
    } catch (error) {
      console.error("Error uploading resource:", error);
    }
  };

  const uploadNote = async () => {
    if (!noteName.trim() || !noteContent.trim() || !selectedCourse) {
      alert("Please enter both note name and content.");
      return;
    }

    // Convert note content to JSON
    const noteData = {
      name: noteName.trim(),
      content: noteContent.trim(),
    };

    try {
      await axios.post(`http://localhost:8000/admin/courses/${selectedCourse.name}/uploadTextNote`, noteData, {
        headers: { "Content-Type": "application/json" },
      });
      alert("Note uploaded successfully!");
      setNoteName("");
      setNoteContent("");
      selectCourse(selectedCourse);
    } catch (error) {
      console.error("Error uploading note:", error);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Course Management</h1>
      
      {isAdmin && (
        <button className="bg-blue-500 text-white px-4 py-2 mb-4" onClick={() => setShowCreateCourse(true)}>
          Create Course
        </button>
      )}

      {showCreateCourse && (
        <div className="p-4 border rounded mb-4">
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

      <div className="grid grid-cols-3 gap-4">
        {courses||[].map((course) => (
          <div
            key={course.name}
            className="border p-4 cursor-pointer hover:bg-gray-100"
            onClick={() => selectCourse(course)}
          >
            {course.name}
          </div>
        ))}
      </div>

      {selectedCourse && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold">Resources for {selectedCourse.name}</h2>
          <ul>
            {resources.map((res) => (
              <li key={res}>
                <a href={`http://localhost:8000/course/${selectedCourse.name}/resource/${res}`} target="_blank" rel="noopener noreferrer">
                  {res}
                </a>
              </li>
            ))}
          </ul>

          {/* <h2 className="text-xl font-semibold mt-4">Notes</h2>
          <ul>
            {notes.map((note) => (
              <li key={note.name}>
                <a href={`http://localhost:8000/courses/${selectedCourse.name}/notes/${note.name}`} download>
                  {note.name}
                </a>
              </li>
            ))}
          </ul> */}
            <h2 className="text-xl font-semibold mt-4">Notes</h2>
           <ul>
             {notes.map((note) => (
               <li key={note}>
                <a href={`http://localhost:8000/courses/${selectedCourse.name}/downloadNotes/${note}`} download>
                  {note}
                </a>
               </li>
             ))}
           </ul>

          {isAdmin && (
            <div className="mt-6">
              <h2 className="text-lg font-bold mb-2">Admin Actions</h2>

              {/* Upload Resource */}
              <div className="mb-4">
                <h3 className="font-semibold mb-2">Upload Resource</h3>
                <input type="file" onChange={(e) => setResourceFile(e.target.files[0])} className="border p-2" />
                <button className="bg-blue-500 text-white px-4 py-2 ml-2" onClick={uploadResource}>
                  Upload
                </button>
              </div>

              {/* Upload Note */}
              <div>
                <h3 className="font-semibold mb-2">Upload Note (JSON Format)</h3>
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
