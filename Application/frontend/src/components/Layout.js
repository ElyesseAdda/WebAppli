import React from 'react';
import SlideBar from './SlideBar';
import Header from './Header';

const Layout = ({ children }) => {
    return (
        <div className="layout">
            <Header />
            <div className="main-content">
                <SlideBar />
                <div className="content">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Layout;
