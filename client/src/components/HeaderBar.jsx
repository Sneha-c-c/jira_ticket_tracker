import React from "react";
import { Layout } from "antd";
import { useNavigate } from "react-router-dom";
import logoUrl from "../assets/metaz.png";

const { Header } = Layout;

// PUBLIC_INTERFACE
export default function HeaderBar({
  title = "Team Ticket Viewer",
  subtitle = "",
  rightContent = null,
  onLogoClick = null,
}) {
  /** HeaderBar renders a cohesive top navigation/header with brand logo, title, optional subtitle and right-side actions.
   * Props:
   * - title: string displayed as the main heading
   * - subtitle: string displayed under or next to title in muted tone
   * - rightContent: ReactNode placed on the right (e.g., buttons, links)
   * - onLogoClick: optional callback invoked when the brand area is clicked (defaults to navigate("/"))
   */
  const navigate = useNavigate();
  const handleLogoClick = () => {
    if (typeof onLogoClick === "function") {
      onLogoClick();
    } else {
      navigate("/");
    }
  };

  return (
    <Header className="app-header" role="banner">
      <button
        type="button"
        className="brand"
        onClick={handleLogoClick}
        aria-label="Go to dashboard"
        title="Go to Dashboard"
      >
        <img src={logoUrl} alt="Company logo" className="brand-logo"   style={{ width: "50px", height: "auto" }}  />
        <span className="brand-texts">
          <span className="app-title">{title}</span>
          {subtitle ? <span className="app-subtitle">{subtitle}</span> : null}
        </span>
      </button>

      <div className="nav-actions" role="navigation" aria-label="Header actions">
        {rightContent}
      </div>
    </Header>
  );
}
