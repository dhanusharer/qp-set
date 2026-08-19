# AMCEC QPSet Routing Map

This document catalogs the application routing hierarchy, layouts, and protection guards on the React client.

---

## 1. Routing Setup
Routing is managed by `react-router-dom` in [App.tsx](file:///c:/Users/DHANUSH%20A%20G/Downloads/amcec-qpset-main/amcec-qpset-main/src/App.tsx) inside the `<AppRoutes>` component. It leverages `BrowserRouter` for path resolutions.

---

## 2. Frontend Routes Table

| Route Path | Page Component | Layout | Purpose | Role Required |
| :--- | :--- | :--- | :--- | :--- |
| `/` | `StartPage` | None | Landing page if unauthenticated; redirects to dashboard if logged in | None |
| `/login` | `LoginPage` | None | User credentials login screen; redirects to appropriate dashboard if logged in | None |
| `/controller/dashboard` | `ControllerDashboard` | `ControllerLayout` | Main metrics dashboard for the CoE | `controller` |
| `/controller/assign` | `AssignPaper` | `ControllerLayout` | Form to create assignments and assign to HODs | `controller` |
| `/controller/hods` | `ManageHods` | `ControllerLayout` | Registry of department HOD accounts | `controller` |
| `/controller/faculty` | `FacultyRegistry` | `ControllerLayout` | Registry of all faculty (internal and external) | `controller` |
| `/controller/review` | `ReviewPapers` | `ControllerLayout` | Paper catalog with option to approve or request revision | `controller` |
| `/controller/reports` | `Reports` | `ControllerLayout` | Departmental performance, submission progress and audit tables | `controller` |
| `/hod/dashboard` | `HodDashboard` | `HodLayout` | Coordinator dashboard showing department assignments and alerts | `hod` |
| `/hod/register-courses`| `RegisterCourses` | `HodLayout` | Course catalog management interface | `hod` |
| `/hod/register-qpsetters`| `RegisterQPSetters` | `HodLayout` | Register/Invite question setters for courses | `hod` |
| `/hod/assignments` | `HodAssignments` | `HodLayout` | Assign and delegate incoming exam tasks to faculty | `hod` |
| `/hod/my-department` | `HodMyDepartment` | `HodLayout` | View lists of registered department faculty and course mappings | `hod` |
| `/hod/create-paper` | `CreatePaper` | `HodLayout` | HOD access to paper authoring workbench | `hod` |
| `/hod/preview-paper` | `PreviewPaper` | `HodLayout` | Review raw question paper draft layout before submission | `hod` |
| `/hod/scheme` | `HodScheme` | `HodLayout` | Form to build structured schemes (answer key row details) | `hod` |
| `/faculty/dashboard` | `FacultyDashboard` | `FacultyLayout` | Personal assignment board for teaching faculty | `qpsetter` |
| `/faculty/assignments` | `FacultyAssignments` | `FacultyLayout` | Historical and active question paper tasks assigned to user | `qpsetter` |
| `/faculty/create-paper`| `CreatePaper` | `FacultyLayout` | AI-assisted question paper editor interface | `qpsetter` |
| `/faculty/preview-paper`| `PreviewPaper` | `FacultyLayout` | Interactive print preview for drafted papers | `qpsetter` |
| `*` | `NotFound` | None | Catch-all screen for invalid URLs | None |

---

## 3. Navigation Layouts

The application wraps page views in one of three layouts based on user roles. Each layout injects the role-specific navigation menu, the notification drop-down, and the page header with the current user's profile card.

### 3.1 ControllerLayout
*   **Location**: [ControllerLayout.tsx](file:///c:/Users/DHANUSH%20A%20G/Downloads/amcec-qpset-main/amcec-qpset-main/src/layouts/ControllerLayout.tsx)
*   **Menu Links**:
    1.  *Dashboard*: `/controller/dashboard`
    2.  *Assign to HOD*: `/controller/assign`
    3.  *Manage HODs*: `/controller/hods`
    4.  *Faculty Registry*: `/controller/faculty`
    5.  *Review & Approve*: `/controller/review`
    6.  *Reports*: `/controller/reports`

### 3.2 HodLayout
*   **Location**: [HodLayout.tsx](file:///c:/Users/DHANUSH%20A%20G/Downloads/amcec-qpset-main/amcec-qpset-main/src/layouts/HodLayout.tsx)
*   **Menu Links**:
    1.  *Dashboard*: `/hod/dashboard`
    2.  *Register Courses*: `/hod/register-courses`
    3.  *Register QP Setters*: `/hod/register-qpsetters`
    4.  *Assignments*: `/hod/assignments`
    5.  *My Department*: `/hod/my-department`
    6.  *Schemes*: `/hod/scheme`

### 3.3 FacultyLayout
*   **Location**: [FacultyLayout.tsx](file:///c:/Users/DHANUSH%20A%20G/Downloads/amcec-qpset-main/amcec-qpset-main/src/layouts/FacultyLayout.tsx)
*   **Menu Links**:
    1.  *Dashboard*: `/faculty/dashboard`
    2.  *My Assignments*: `/faculty/assignments`

---

## 4. Route Protection

The application defines a wrapper helper `<ProtectedRoute>` in [App.tsx](file:///c:/Users/DHANUSH%20A%20G/Downloads/amcec-qpset-main/amcec-qpset-main/src/App.tsx#L32-L37):

```tsx
function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode; requiredRole?: string }) {
  const { isAuthenticated, currentUser } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requiredRole && currentUser?.role !== requiredRole) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
```

*   **L1 Validation**: Checks if `isAuthenticated` is true. If false, redirects the user to `/login`.
*   **L2 Validation**: Verifies `currentUser.role` matches the expected string (`controller`, `hod`, or `qpsetter`). If there is a mismatch, redirects to `/login`.