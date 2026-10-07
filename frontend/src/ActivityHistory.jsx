
import { useEffect, useState } from "react";

export default function ActivityHistory({ onBack }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadActivities = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/activity");
      const data = await response.json();
      setActivities(Array.isArray(data) ? data : data.activities || []);
    } catch {
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    if (!window.confirm("Are you sure you want to clear activity history?")) return;

    try {
      await fetch("http://localhost:5000/api/activity", {
        method: "DELETE"
      });
      setActivities([]);
    } catch {
      alert("Unable to clear activity history.");
    }
  };

  useEffect(() => {
    loadActivities();
  }, []);

  return (
    <div className="history-page">
      <div className="history-header">
        <div>
          <h1>Activity History</h1>
          <p>View your previous safety activities.</p>
        </div>
        <button onClick={onBack}>Back to Dashboard</button>
      </div>

      <div className="history-card">
        <div className="history-title">
          <h2>Recent Activities</h2>
          <button onClick={clearHistory} disabled={!activities.length}>
            Clear History
          </button>
        </div>

        {loading ? (
          <p>Loading activities...</p>
        ) : activities.length === 0 ? (
          <div className="history-empty">
            <h3>No activities yet</h3>
            <p>Your safety activities will appear here.</p>
          </div>
        ) : (
          activities.map((activity, index) => (
            <div className="history-item" key={activity._id || activity.id || index}>
              <div>
                <h3>{activity.type || activity.title || "Safety Activity"}</h3>
                <p>{activity.message || activity.description || "Activity recorded"}</p>
                <small>
                  {activity.timestamp || activity.createdAt || activity.date
                    ? new Date(activity.timestamp || activity.createdAt || activity.date).toLocaleString()
                    : "Date unavailable"}
                </small>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
