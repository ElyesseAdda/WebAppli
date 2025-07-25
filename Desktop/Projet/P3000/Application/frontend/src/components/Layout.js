import React, { useState } from "react";
import "./../../static/css/layout.css";
import Header from "./Header";
import SlideBar from "./SlideBar";

const Layout = ({ children }) => {
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
      <div className="main-content">{children}</div>
    </div>
  );
};

export default Layout;
