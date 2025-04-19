import React, { useState, useEffect } from "react";
import Header from "../Header/Header";
import Sidebar from "../Sidebar/Sidebar";
import { Outlet, useLocation } from "react-router-dom";
import MyContext from "./MyContext";

const Layout = () => {
  const [isToggleSidebar, setIsToggleSidebar] = useState(false);
  const location = useLocation();
  
  // Extract the page type from the current path
  const getPageType = () => {
    const path = location.pathname;
    if (path.includes('/dashboard')) return 'dashboard';
    if (path.includes('/course')) return 'course';
    if (path.includes('/assignment')) return 'assignment';
    if (path.includes('/leaderboard')) return 'leaderboard';
    if (path.includes('/quiz')) return 'quiz';
    if (path.includes('/userprofile')) return 'quiz';
    return 'default';
  };
  
  const pageType = getPageType();

  return (
    <MyContext.Provider value={{ isToggleSidebar, setIsToggleSidebar }}>
      <Header />
      <div className="main d-flex" data-page={pageType}>
        <div className={`sidebarWrapper ${isToggleSidebar ? 'toggle' : ''}`}>
          <Sidebar />
        </div>
        <main className={`content ${isToggleSidebar ? 'toggle' : ''}`}>
          <Outlet />
        </main>
      </div>
    </MyContext.Provider>
  );
};

export default Layout;