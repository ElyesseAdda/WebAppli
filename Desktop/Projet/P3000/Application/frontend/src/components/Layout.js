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
      <Header />
      <SlideBar
        toggleSidebar={toggleSidebar}
        isSidebarVisible={isSidebarVisible}
      />
      <div className="main-content">
        <BreadcrumbHeader user={user} onLogout={onLogout} />
        {children}
      </div>
    </div>
  );
};

export default Layout;
