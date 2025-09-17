import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ChronoBoardDashboard from "./ChronoBoardDashboard.jsx";
import WorklogView from "./WorklogView.jsx";
import SlvReports from './SlvReports.jsx'


import "antd/dist/reset.css";
import "./index.css";
import "./filters.css";

const root = createRoot(document.getElementById("root"));
root.render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<ChronoBoardDashboard />} />
      {/* <Route path="/ticket/:key" element={<TicketDetail />} /> */}
      {/* <Route path="/tickets/:key" element={<TicketDetail />} /> */}
      <Route path="/tickets/:key/full" element={React.createElement(require("./TicketDetailsFull.jsx").default)} />
      <Route path="/worklog" element={<WorklogView />} />
      <Route path="/slv" element={<SlvReports />} />
    </Routes>
  </BrowserRouter>
);
