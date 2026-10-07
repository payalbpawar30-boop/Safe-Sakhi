
const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: "⌂" },
  { id: "contacts", label: "Trusted Contacts", icon: "♧" },
  { id: "location", label: "Location & Journey", icon: "⌖" },
  { id: "emergency", label: "Emergency Center", icon: "⚠" },
  { id: "history", label: "Activity History", icon: "◷" }
];

export default function Sidebar({ activePage, onNavigate }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <h2>Safe Sakhi</h2>
        <p>Your Safety Companion</p>
      </div>

      <nav className="sidebar-menu">
        {menuItems.map(item => (
          <button
            key={item.id}
            className={`sidebar-link ${activePage === item.id ? "active" : ""}`}
            onClick={() => onNavigate(item.id)}
          >
            <span>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        Stay Safe. Stay Strong.
      </div>
    </aside>
  );
}
