import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppProvider } from "@/contexts/AppContext";
import StartPage from "@/pages/StartPage";
import LoginPage from "@/pages/LoginPage";
import ControllerLayout from "@/layouts/ControllerLayout";
import FacultyLayout from "@/layouts/FacultyLayout";
import HodLayout from "@/layouts/HodLayout";
import ControllerDashboard from "@/pages/controller/ControllerDashboard";
import AssignPaper from "@/pages/controller/AssignPaper";
import ManageHods from "@/pages/controller/ManageHods";
import ReviewPapers from "@/pages/controller/ReviewPapers";
import FacultyRegistry from "@/pages/controller/FacultyRegistry";
import Reports from "@/pages/controller/Reports";
import CreateAssessment from "@/pages/controller/CreateAssessment";
import SecurityLogs from "@/pages/controller/SecurityLogs";
import CourseDatabase from "@/pages/controller/CourseDatabase";
import IntellectualRepository from "@/pages/controller/IntellectualRepository";
import AssignedPapersGrid from "@/pages/controller/AssignedPapersGrid";
import HodDashboard from "@/pages/hod/HodDashboard";
import RegisterCourses from "@/pages/hod/RegisterCourses";
import RegisterQPSetters from "@/pages/hod/RegisterQPSetters";
import HodAssignments from "@/pages/hod/HodAssignments";
import HodScheme from "@/pages/hod/HodScheme";
import HodMyDepartment from "@/pages/hod/HodMyDepartment";
import FacultyDashboard from "@/pages/faculty/FacultyDashboard";
import FacultyAssignments from "@/pages/faculty/FacultyAssignments";
import CreatePaper from "@/pages/faculty/CreatePaper";
import PreviewPaper from "@/pages/faculty/PreviewPaper";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode; requiredRole?: string }) {
  const { isAuthenticated, currentUser } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requiredRole && currentUser?.role !== requiredRole) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated, currentUser } = useAuth();

  const getDashboard = () => {
    if (currentUser?.role === 'controller') return '/controller/dashboard';
    if (currentUser?.role === 'hod') return '/hod/dashboard';
    return '/faculty/dashboard';
  };

  return (
    <Routes>
      <Route path="/" element={isAuthenticated ? <Navigate to={getDashboard()} replace /> : <StartPage />} />
      <Route path="/login" element={isAuthenticated ? <Navigate to={getDashboard()} replace /> : <LoginPage />} />

      {/* Controller routes */}
      <Route path="/controller/dashboard" element={<ProtectedRoute requiredRole="controller"><ControllerLayout><ControllerDashboard /></ControllerLayout></ProtectedRoute>} />
      <Route path="/controller/create-assessment" element={<ProtectedRoute requiredRole="controller"><ControllerLayout><CreateAssessment /></ControllerLayout></ProtectedRoute>} />
      <Route path="/controller/assign" element={<ProtectedRoute requiredRole="controller"><ControllerLayout><AssignPaper /></ControllerLayout></ProtectedRoute>} />
      <Route path="/controller/hods" element={<ProtectedRoute requiredRole="controller"><ControllerLayout><ManageHods /></ControllerLayout></ProtectedRoute>} />
      <Route path="/controller/faculty" element={<ProtectedRoute requiredRole="controller"><ControllerLayout><FacultyRegistry /></ControllerLayout></ProtectedRoute>} />
      <Route path="/controller/review" element={<ProtectedRoute requiredRole="controller"><ControllerLayout><ReviewPapers /></ControllerLayout></ProtectedRoute>} />
      <Route path="/controller/reports" element={<ProtectedRoute requiredRole="controller"><ControllerLayout><Reports /></ControllerLayout></ProtectedRoute>} />
      <Route path="/controller/security" element={<ProtectedRoute requiredRole="controller"><ControllerLayout><SecurityLogs /></ControllerLayout></ProtectedRoute>} />
      <Route path="/controller/courses-db" element={<ProtectedRoute requiredRole="controller"><ControllerLayout><CourseDatabase /></ControllerLayout></ProtectedRoute>} />
      <Route path="/controller/repository" element={<ProtectedRoute requiredRole="controller"><ControllerLayout><IntellectualRepository /></ControllerLayout></ProtectedRoute>} />
      <Route path="/controller/assigned-grid" element={<ProtectedRoute requiredRole="controller"><ControllerLayout><AssignedPapersGrid /></ControllerLayout></ProtectedRoute>} />

      {/* HOD routes */}
      <Route path="/hod/dashboard" element={<ProtectedRoute requiredRole="hod"><HodLayout><HodDashboard /></HodLayout></ProtectedRoute>} />
      <Route path="/hod/register-courses" element={<ProtectedRoute requiredRole="hod"><HodLayout><RegisterCourses /></HodLayout></ProtectedRoute>} />
      <Route path="/hod/register-qpsetters" element={<ProtectedRoute requiredRole="hod"><HodLayout><RegisterQPSetters /></HodLayout></ProtectedRoute>} />
      <Route path="/hod/assignments" element={<ProtectedRoute requiredRole="hod"><HodLayout><HodAssignments /></HodLayout></ProtectedRoute>} />
      <Route path="/hod/my-department" element={<ProtectedRoute requiredRole="hod"><HodLayout><HodMyDepartment /></HodLayout></ProtectedRoute>} />
      <Route path="/hod/create-paper" element={<ProtectedRoute requiredRole="hod"><HodLayout><CreatePaper /></HodLayout></ProtectedRoute>} />
      <Route path="/hod/preview-paper" element={<ProtectedRoute requiredRole="hod"><HodLayout><PreviewPaper /></HodLayout></ProtectedRoute>} />
      <Route path="/hod/scheme" element={<ProtectedRoute requiredRole="hod"><HodLayout><HodScheme /></HodLayout></ProtectedRoute>} />

      {/* QP Setter (Faculty) routes */}
      <Route path="/faculty/dashboard" element={<ProtectedRoute requiredRole="qpsetter"><FacultyLayout><FacultyDashboard /></FacultyLayout></ProtectedRoute>} />
      <Route path="/faculty/assignments" element={<ProtectedRoute requiredRole="qpsetter"><FacultyLayout><FacultyAssignments /></FacultyLayout></ProtectedRoute>} />
      <Route path="/faculty/create-paper" element={<ProtectedRoute requiredRole="qpsetter"><FacultyLayout><CreatePaper /></FacultyLayout></ProtectedRoute>} />
      <Route path="/faculty/preview-paper" element={<ProtectedRoute requiredRole="qpsetter"><FacultyLayout><PreviewPaper /></FacultyLayout></ProtectedRoute>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <AuthProvider>
        <AppProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AppProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
