import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ConfigProvider } from "antd";
import App from "./App.jsx";
import TicketDetail from "./TicketDetail.jsx";
import "antd/dist/reset.css";
import "./App.css";
import "./ticketDetail.css";

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
        <Route path="/" element={<App />} />
        <Route path="/ticket/:key" element={<TicketDetail />} />
        <Route path="/tickets/:key" element={<TicketDetail />} />
      </Routes>
    </BrowserRouter>
  </ConfigProvider>
);
