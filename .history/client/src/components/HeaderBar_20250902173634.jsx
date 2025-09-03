import React from "react";
import { Layout, Button } from "antd";
import logo from "../assets/metazz.png";

export default function HeaderBar({
  title = "Worklog",
  subtitle = "View work log for MetaZ users",
  backHref = "/",
  onBack,
}) {
  return (
    <Layout.Header className="metaz-header">
      <div className="metaz-header__inner">
        {/* LEFT: logo + brand */}
        <div className="metaz-header__left">
          <img src={logo} alt="MetaZ Logo" className="metaz-logo" />
          <div className="metaz-brand-wrap">
            <div className="metaz-brand-title">MetaZ Digital</div>
            <div className="metaz-brand-subtitle">ChronoBoard</div>
          </div>
        </div>

        {/* CENTER: title/subtitle */}
        <div className="metaz-header__center">
          <div className="metaz-title">{title}</div>
          <div className="metaz-subtitle">{subtitle}</div>
        </div>

        {/* RIGHT: Back button */}
        <div className="metaz-header__right">
          <Button
            className="metaz-back-btn"
            onClick={() =>
              (typeof onBack === "function" ? onBack() : window.location.assign(backHref))
            }
          >
            Back to Dashboard
          </Button>
        </div>
      </div>

    </Layout.Header>
  );
}
