import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.jsx";
import TicketDetail from "./TicketDetail.jsx";
import "antd/dist/reset.css";

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/ticket/:key" element={<TicketDetail />} />
      <Route path="/tickets/:key" element={<TicketDetail />} />
    </Routes>
  </BrowserRouter>
);
