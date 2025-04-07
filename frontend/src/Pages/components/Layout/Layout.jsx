import React, { useState, useEffect } from "react";
import Header from "../Header/Header";
import Sidebar from "../Sidebar/Sidebar";
import { Outlet } from "react-router-dom";
import MyContext from "./MyContext";

const Layout = () => {
  const [isToggleSidebar, setIsToggleSidebar] = useState(false);

  return (
    <MyContext.Provider value={{ isToggleSidebar, setIsToggleSidebar }}>
      <Header />
      <div className="main d-flex">
        <div className={`sidebarWrapper ${isToggleSidebar==true? 'toggle':''}`}>
          <Sidebar />
        </div>
        <main className={`content ${isToggleSidebar==true? 'toggle':''}`}>
          <Outlet />
        </main>
      </div>
    </MyContext.Provider>
  );
};

export default Layout;
