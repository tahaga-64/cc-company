export default function CompanyPage({ data, onNavigate }) {
  const org = data.organization || {};
  const departments = data.departments || [];
  const stats = data.departmentStats || {};
  const totalFiles = departments.reduce((sum, d) => sum + d.fileCount, 0);
  const todoStats = data.todos?.today?.stats || { incomplete: 0, complete: 0 };

  return (
    <div className="company-page">
      <div className="company-hero">
        <div className="company-hero-label">Organization</div>
        <h1 className="company-hero-title">{org.business || "My Company"}</h1>
        {org.goals && <p className="company-hero-goals">{org.goals}</p>}
        {org.createdDate && (
          <div className="company-hero-meta">Since {org.createdDate}</div>
        )}
      </div>

      <div className="company-stats">
        <StatCard value={departments.length} label="Departments" color="var(--primary)" />
        <StatCard value={totalFiles} label="Total Files" color="var(--blue)" />
        <StatCard value={todoStats.incomplete} label="Open TODOs" color="var(--yellow)" />
        <StatCard value={todoStats.complete} label="Completed Today" color="var(--green)" />
      </div>

      <div className="section">
        <div className="section-title">Departments</div>
        {departments.length === 0 ? (
          <div className="empty-state">No departments yet</div>
        ) : (
          <div className="company-dept-grid">
            {departments.map((dept) => (
              <div
                key={dept.id}
                className="company-dept-card"
                onClick={() => onNavigate("department", dept.id)}
              >
                <div className="company-dept-header">
                  <span className="company-dept-name">{dept.name}</span>
                  <span className="company-dept-files">{dept.fileCount} files</span>
                </div>
                {dept.role && (
                  <div className="company-dept-role">{dept.role}</div>
                )}
                {dept.subfolders.length > 0 && (
                  <div className="company-dept-folders">
                    {dept.subfolders.map((f) => (
                      <span key={f} className="company-folder-tag">{f}/</span>
                    ))}
                  </div>
                )}
                {stats[dept.id] && (
                  <div className="status-bar">
                    {Object.entries(stats[dept.id]).map(([s, c]) => (
                      <span key={s} className="status-badge">{s}: {c}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ value, label, color }) {
  return (
    <div className="overview-card">
      <div className="overview-value" style={{ color }}>{value}</div>
      <div className="overview-label">{label}</div>
    </div>
  );
}
