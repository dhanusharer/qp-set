

# QPSet — AI Question Paper Setting System
## AMC Engineering College | CSE (AI & ML) Department

### Design System
- **Primary**: Deep Navy `#1A2B4A` | **Accent**: Gold `#E8A020` | **Background**: `#F8F9FC`
- **Fonts**: DM Sans (body) + Playfair Display (headings)
- College logo (uploaded image) placed top-left on all pages
- Clean, institutional UI with soft shadows, 8px radius cards, status pill badges
- Footer on all pages: "© 2025 AMCEC | CSE (AI & ML) Department | QPSet v1.0 — Trust Builders Team"

### Authentication
- Centered login card on navy background with geometric pattern
- Role toggle (Controller / Faculty), Employee ID + Password fields
- 7 hardcoded users in mock data (1 controller + 6 faculty)
- React Context for auth state, role-based route protection & redirects

### Controller Dashboard (Sidebar Layout)
- **Overview**: Stat cards (Total Assigned, Pending, Approved, Revision) + Recent Activity table with status badges
- **Assign Papers**: Faculty card grid → click to select → assignment form (subject, exam type, semester, scheme, due date, instructions, file uploads) → toast on success
- **Manage Faculty**: Faculty list view
- **Review & Approve**: List of submitted papers with full preview, Approve / Request Revision actions with comment box
- **Reports**: Summary reporting page
- **Notifications**: Bell icon with dropdown

### Faculty Dashboard (Sidebar Layout)
- **My Dashboard**: Welcome banner + assignment task cards with due date countdown, status, and action buttons
- **My Assignments**: Full list of assigned papers
- **Create Question Paper**: Two-column layout
  - *Left*: Paper editor with college header, module-wise question sections (VTU format with OR structure), Bloom's taxonomy & CO mapping dropdowns per question, auto difficulty badges, weightage summary bar (Easy/Medium/Hard vs targets)
  - *Right*: AI suggestion panel with mock analysis cards + CO coverage chart
- **Secure Preview**: Modal with watermark overlay, paginated view (2-3 questions at a time), right-click disabled, text selection disabled, confidentiality warning banner
- **Notifications**: Bell icon with dropdown

### Mock Data & State
- All data in `mockData.ts` — users, assignments, questions, notifications
- React Context for auth + app state (assignments, papers, notifications)
- File upload shows filename only (no processing)
- AI suggestions are hardcoded mock cards

### Routing
```
/                        → Login
/controller/dashboard    → Controller Home
/controller/assign       → Assign Papers
/controller/faculty      → Manage Faculty
/controller/review       → Review & Approve
/controller/reports      → Reports
/faculty/dashboard       → Faculty Home
/faculty/assignments     → My Assignments
/faculty/create-paper    → Paper Editor
/faculty/preview-paper   → Secure Preview
```

### Key Components
StatCard, FacultyCard, AssignmentForm, QuestionRow, ModuleSection, WeightageBar, SecurePreviewModal, NotificationDropdown, StatusBadge, AIPanel, role-aware Sidebar

