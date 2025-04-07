import "./Dashboard.css";
import { useEffect } from "react";

const Dashboard = () => {
  useEffect(() => {
    document.body.classList.add("dashboard-body");
    return () => {
      document.body.classList.remove("dashboard-body");
    };
  }, []);

  return (
    <div className="right-content">
      <h1>This is the dashboard</h1>
    </div>
  );
};

export default Dashboard;
