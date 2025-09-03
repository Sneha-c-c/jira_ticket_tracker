import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ConfigProvider } from "antd";
import "antd/dist/reset.css";
import "./App.css";
import "./ticketDetail.css";
import TicketDetailTabView from "./TicketDetailTabView.jsx";
import ChronoBoardDashboard from "./ChronoBoardDashboard.jsx";
import WorklogView from "./WorklogView.jsx";


// Main dashboard route is now ChronoBoardDashboard (with updated filter logic)
createRoot(document.getElementById("root")).render(
  <ConfigProvider
    theme={{
      token: {
        colorPrimary: "#1976d2",
        colorText: "#1f2937",
        colorBorder: "#e5e7eb",
        colorBgContainer: "#ffffff",
        borderRadius: 12,
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", Ubuntu, Cantarell, "Helvetica Neue", Arial',
      },
      components: {
        Button: {
          borderRadius: 10,
          controlHeight: 38,
          fontWeightStrong: 600,
        },
        Card: {
          borderRadiusLG: 12,
        },
        Table: {
          borderRadius: 12,
          headerBg: "#f8fafc",
        },
        Select: {
          borderRadius: 8,
        },
        DatePicker: {
          borderRadius: 8,
        },
        Input: {
          borderRadius: 8,
        },
        Layout: {
          headerBg: "#ffffff",
          siderBg: "#ffffff",
        },
      },
    }}
  >
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ChronoBoardDashboard />} />
        <Route path="/tickets/:key/full" element={React.createElement(require("./TicketDetailsFull.jsx").default)} />
        <Route path="/worklog" element={<WorklogView />} />
      </Routes>
    </BrowserRouter>
  </ConfigProvider>
);
