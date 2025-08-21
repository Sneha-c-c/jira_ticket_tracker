import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.jsx";
import TicketDetail from "./TicketDetail.jsx";
import MemberTimelog from "./MemberTimelog.jsx";
import ChronoBoardDashboard from "./ChronoBoardDashboard.jsx";
import "antd/dist/reset.css";
import "./index.css";
import "./filters.css";

const root = createRoot(document.getElementById("root"));
root.render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<ChronoBoardDashboard />} />
      <Route path="/tab" element={<MemberTimelog />} />
      <Route path="/ticket/:key" element={<TicketDetail />} />
      <Route path="/tickets/:key" element={<TicketDetail />} />
    </Routes>
  </BrowserRouter>
);
