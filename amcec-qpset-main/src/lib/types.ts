export interface User {
  id: number;
  username: string;
  password?: string; // Optional temporary password for display after registration
  role: 'controller' | 'hod' | 'qpsetter';
  name: string;
  title?: string;
  dept?: string;
  email?: string;
  phone?: string;
  qualification?: string;
  experience?: string;
  joinDate?: string;
  designation?: string;
  hodId?: number;
  affiliation?: 'internal' | 'external';
  college?: string;
  registeredBy?: string;
  registeredOn?: string;
}

export interface Course {
  id: number;
  courseName: string;
  courseCode: string;
  semester: string;
  schemeYear: string;
  credits: number;
  examTypes: string[];
  syllabusFileName?: string;
  bos: string;
  hodId: number;
}

export interface SchemeRow {
  id?: number;
  questionNo: string;
  part: string;
  maxMarks: number;
  expectedPoints: string;
  co: string;
  bloomsLevel: string;
}

export interface SchemeEntry {
  id: number;
  courseId: number;
  course?: Course;
  examType: string;
  rows: SchemeRow[];
  status: 'Draft' | 'Finalized';
  hodId: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Suggestion {
  id: number;
  assignmentId?: number;
  fromUserId: number;
  fromUser?: {
    id: number;
    name: string;
    role: 'controller' | 'hod' | 'qpsetter';
  };
  message: string;
  date: string;
}

export interface QuestionPaper {
  id: number;
  assignmentId: number;
  content: any;
  submittedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Assignment {
  id: number;
  assessmentCode: string;
  description?: string;
  facultyId?: number | null;
  hodId?: number;
  courseId: number;
  course?: Course;
  examType: string;
  startDate?: string;
  dueDate: string;
  status: 'Pending' | 'Submitted' | 'Approved' | 'Revision Required';
  assignedDate: string;
  instructions?: string;
  revisionComment?: string;
  syllabusFileName?: string;
  prevPaperFileName?: string;
  timetableFileName?: string;
  assignedById?: number;
  assignedBy?: {
    id: number;
    name: string;
    role: 'controller' | 'hod';
  } | null;
  suggestions?: Suggestion[];
  paper?: QuestionPaper | null;
}

export interface Notification {
  id: number;
  userId: number;
  message: string;
  date: string;
  read: boolean;
  type?: 'info' | 'success' | 'warning' | 'error';
  assignmentId?: number;
  fromUserId?: number;
  fromUser?: {
    id: number;
    name: string;
    role: string;
  } | null;
  kind?: 'suggestion' | 'assignment' | 'approval' | 'revision' | 'general';
}

export interface LoginRequest {
  username: string;
  passwordHash: string;
  role: 'controller' | 'hod' | 'qpsetter';
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: Omit<User, 'password'>;
}

export interface APIError {
  message: string;
  statusCode?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}
