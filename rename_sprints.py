import os
import re

sprints_dir = "project_management/sprints/planning"

# Mapping of old filename to new filename
mapping = {
    "sprint-03-dashboard-data.md": "sprint-07-dashboard-data.md",
    "sprint-04-dashboard-ui.md": "sprint-08-dashboard-ui.md",
    "sprint-05-ia-restructuring.md": "sprint-09-ia-restructuring.md",
    "sprint-06-admin-rbac.md": "sprint-10-admin-rbac.md",
    "sprint-07-responsive-design.md": "sprint-11-responsive-design.md",
    "sprint-09-empty-states.md": "sprint-12-empty-states.md",
    "sprint-08-performance.md": "sprint-13-performance.md",
    "sprint-10-final-polish.md": "sprint-14-final-polish.md",
    "sprint-11-role-api.md": "sprint-03-role-api.md",
    "sprint-12-frontend-flows.md": "sprint-04-frontend-flows.md",
    "sprint-13-admin-approval-ui.md": "sprint-05-admin-approval-ui.md",
    "sprint-14-feature-gating.md": "sprint-06-feature-gating.md"
}

# First rename to temp names to avoid conflicts
temp_mapping = {}
for old, new in mapping.items():
    temp_name = "temp_" + new
    temp_mapping[temp_name] = new
    old_path = os.path.join(sprints_dir, old)
    temp_path = os.path.join(sprints_dir, temp_name)
    if os.path.exists(old_path):
        os.rename(old_path, temp_path)

# Then rename temp names to final names
for temp, new in temp_mapping.items():
    temp_path = os.path.join(sprints_dir, temp)
    new_path = os.path.join(sprints_dir, new)
    if os.path.exists(temp_path):
        os.rename(temp_path, new_path)

# Now update the contents of all files to reflect their new sprint numbers
for filename in os.listdir(sprints_dir):
    if filename.startswith("sprint-") and filename.endswith(".md"):
        filepath = os.path.join(sprints_dir, filename)
        sprint_num = int(filename.split("-")[1])
        
        with open(filepath, "r") as f:
            content = f.read()
            
        # Replace "# Sprint X:" with "# Sprint {sprint_num}:"
        content = re.sub(r"# Sprint \d+:", f"# Sprint {sprint_num}:", content)
        
        with open(filepath, "w") as f:
            f.write(content)

print("Renamed and updated sprint files.")
