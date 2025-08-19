import React, { useState } from "react";
import "./../../static/css/layout.css";
import BreadcrumbHeader from "./BreadcrumbHeader";
import Header from "./Header";
import SlideBar from "./SlideBar";

const Layout = ({ children, user, onLogout }) => {
  const [isSidebarVisible, setSidebarVisible] = useState(true);

  const toggleSidebar = () => {
    setSidebarVisible(!isSidebarVisible);
  };

  return (
    <div
      className={`layout ${
        isSidebarVisible ? "sidebar-visible" : "sidebar-hidden"
      }`}
    >
      <Header user={user} onLogout={onLogout} />
      <SlideBar
        toggleSidebar={toggleSidebar}
        isSidebarVisible={isSidebarVisible}
      />
      <div className="main-content">
        <BreadcrumbHeader />
        {children}
      </div>
    </div>
  );
};

export default Layout;
