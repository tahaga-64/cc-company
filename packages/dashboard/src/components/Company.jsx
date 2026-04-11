export default function Company({ data, onNavigate }) {
  const org = data.organization || {};
  const departments = data.departments || [];
  const stats = data.departmentStats || {};
  const totalFiles = departments.reduce((sum, d) => sum + d.fileCount, 0);

  return (
    <div className="company-page">
      <div className="company-profile">
        <div className="section-title">Organization Profile</div>
        <div className="company-profile-grid">
          <ProfileField label="Business / Activity" value={org.business || "—"} />
          <ProfileField label="Goals / Challenges" value={org.goals || "—"} />
          <ProfileField label="Created" value={org.createdDate || "—"} />
          <ProfileField label="Total Files" value={String(totalFiles)} />
        </div>
      </div>

      <div className="section">
        <div className="section-title">Departments ({departments.length})</div>
        {departments.length === 0 ? (
          <div className="empty-state">No departments found</div>
        ) : (
          <div className="dept-grid">
            {departments.map((dept) => (
              <div
                key={dept.id}
                className="dept-card"
                onClick={() => onNavigate("department", dept.id)}
              >
                <div className="dept-card-name">{dept.name}</div>
                <div className="dept-card-role">{dept.role}</div>
                <div className="dept-card-files">{dept.fileCount} files</div>
                {stats[dept.id] && (
                  <div className="status-bar">
                    {Object.entries(stats[dept.id]).map(([status, count]) => (
                      <span key={status} className="status-badge">
                        {status}: {count}
                      </span>
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

function ProfileField({ label, value }) {
  return (
    <div className="profile-field">
      <div className="profile-field-label">{label}</div>
      <div className="profile-field-value">{value}</div>
    </div>
  );
}
