export interface User {
  id: number;
  username: string;
  password: string;
  role: 'controller' | 'hod' | 'qpsetter';
  name: string;
  title?: string;
  dept?: string;
  subject?: string;
  subjectCode?: string;
  email?: string;
  phone?: string;
  qualification?: string;
  experience?: string;
  joinDate?: string;
  designation?: string;
  hodId?: number; // which HOD this qpsetter belongs to
  affiliation?: 'internal' | 'external'; // internal = AMCEC faculty, external = visiting/outside paper setter
  college?: string; // for external faculty
  registeredBy?: string; // who created the login (controller/hod name)
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

export interface SchemeEntry {
  id: number;
  courseId: number;
  examType: string;
  semester: string;
  schemeYear: string;
  rows: SchemeRow[];
  status: 'Draft' | 'Finalized';
  createdDate: string;
  hodId: number;
}

export interface SchemeRow {
  questionNo: string;
  part: string;
  maxMarks: number;
  expectedPoints: string;
  co: string;
  bloomsLevel: string;
}

export interface Suggestion {
  id: number;
  from: string;
  fromRole: 'controller' | 'hod';
  message: string;
  date: string;
}

export interface Assignment {
  id: string; // Assessment Exam ID e.g. 1IA_6Sem_May2026_001
  description?: string;
  facultyId: number;
  hodId?: number;
  subject: string;
  subjectCode: string;
  examType: string;
  semester: string;
  scheme: string;
  startDate?: string;
  dueDate: string;
  status: 'Pending' | 'Submitted' | 'Approved' | 'Revision Required';
  assignedDate: string;
  instructions?: string;
  revisionComment?: string;
  syllabusFileName?: string;
  prevPaperFileName?: string;
  timetableFileName?: string;
  assignedBy?: string;
  assignedByRole?: 'controller' | 'hod';
  suggestions?: Suggestion[];
}

export interface Notification {
  id: number;
  userId: number;
  message: string;
  date: string;
  read: boolean;
  type?: 'info' | 'success' | 'warning' | 'error';
  assessmentId?: string;
  fromName?: string;
  kind?: 'suggestion' | 'assignment' | 'approval' | 'revision' | 'general';
}

export interface QuestionItem {
  id: string;
  text: string;
  marks: number;
  bloomsLevel: string;
  coMapping: string;
}

export interface QuestionOption {
  id: string;
  text: string;
  bloomsLevel: string;
  coMapping: string;
  source: 'previous_year' | 'ai_suggested' | 'syllabus_based' | 'custom';
}

export interface ModuleData {
  id: number;
  title: string;
  questions: {
    q1a: QuestionItem;
    q1b: QuestionItem;
    q2a: QuestionItem;
    q2b: QuestionItem;
  };
}

export interface InternalQuestionItem {
  id: string;
  text: string;
  marks: number;
  bloomsLevel: string;
  coMapping: string;
  part: 'a' | 'b' | 'c';
}

export interface InternalModuleData {
  id: number;
  title: string;
  questions: {
    q1: { a: InternalQuestionItem; b: InternalQuestionItem; c: InternalQuestionItem };
    q2: { a: InternalQuestionItem; b: InternalQuestionItem; c: InternalQuestionItem };
  };
}

// ===================== USERS =====================
export const users: User[] = [
  // Controller
  { id: 1, username: 'controller', password: 'amcec@2024', role: 'controller', name: 'Dr. Nandishwar', title: 'Controller of Examinations', email: 'nandishwar@amcec.edu.in', phone: '+91 98765 43210', qualification: 'Ph.D. in Computer Science', experience: '15+ years' },

  // HODs / QP Coordinators
  { id: 8, username: 'hod_cse', password: 'hod@2024', role: 'hod', name: 'Dr. Meena Sharma', dept: 'CSE (AI & ML)', title: 'HOD & QP Coordinator', email: 'meena@amcec.edu.in', phone: '+91 98765 88888', qualification: 'Ph.D. in AI', experience: '12 years' },
  { id: 9, username: 'hod_ise', password: 'hod@2024', role: 'hod', name: 'Dr. Rajesh Verma', dept: 'ISE', title: 'HOD & QP Coordinator', email: 'rajesh@amcec.edu.in', phone: '+91 98765 99999', qualification: 'Ph.D. in Software Engineering', experience: '14 years' },

  // QP Setters (Faculty) under HOD CSE (id=8) — INTERNAL (AMCEC)
  { id: 2, username: 'swati', password: 'faculty@123', role: 'qpsetter', name: 'Prof. Swati', subject: 'Data Structures & Algorithms', subjectCode: '21CS32', email: 'swati@amcec.edu.in', phone: '+91 98765 11111', qualification: 'M.Tech in CSE', experience: '8 years', joinDate: '2017-06-15', designation: 'Assistant Professor', hodId: 8, affiliation: 'internal', college: 'AMC Engineering College' },
  { id: 3, username: 'ramakrishna', password: 'faculty@123', role: 'qpsetter', name: 'Prof. Ram Krishna', subject: 'Database Management Systems', subjectCode: '21CS42', email: 'ramkrishna@amcec.edu.in', phone: '+91 98765 22222', qualification: 'M.Tech in CSE', experience: '10 years', joinDate: '2015-08-01', designation: 'Associate Professor', hodId: 8, affiliation: 'internal', college: 'AMC Engineering College' },
  { id: 4, username: 'kavya', password: 'faculty@123', role: 'qpsetter', name: 'Prof. Kavya', subject: 'Machine Learning', subjectCode: '21CS52', email: 'kavya@amcec.edu.in', phone: '+91 98765 33333', qualification: 'Ph.D. in AI & ML', experience: '6 years', joinDate: '2019-01-10', designation: 'Assistant Professor', hodId: 8, affiliation: 'internal', college: 'AMC Engineering College' },
  { id: 5, username: 'srinivas', password: 'faculty@123', role: 'qpsetter', name: 'Prof. Srinivas', subject: 'Computer Networks', subjectCode: '21CS44', email: 'srinivas@amcec.edu.in', phone: '+91 98765 44444', qualification: 'M.Tech in Networks', experience: '12 years', joinDate: '2013-07-20', designation: 'Associate Professor', hodId: 8, affiliation: 'internal', college: 'AMC Engineering College' },
  { id: 6, username: 'anilkumar', password: 'faculty@123', role: 'qpsetter', name: 'Prof. Anil Kumar', subject: 'Operating Systems', subjectCode: '21CS43', email: 'anilkumar@amcec.edu.in', phone: '+91 98765 55555', qualification: 'M.Tech in CSE', experience: '9 years', joinDate: '2016-06-01', designation: 'Assistant Professor', hodId: 8, affiliation: 'internal', college: 'AMC Engineering College' },
  { id: 7, username: 'ramani', password: 'faculty@123', role: 'qpsetter', name: 'Prof. Ramani', subject: 'Engineering Mathematics', subjectCode: '21MAT31', email: 'ramani@amcec.edu.in', phone: '+91 98765 66666', qualification: 'Ph.D. in Mathematics', experience: '14 years', joinDate: '2011-03-15', designation: 'Professor', hodId: 8, affiliation: 'internal', college: 'AMC Engineering College' },

  // EXTERNAL paper setters (visiting from other colleges)
  { id: 20, username: 'ext_prasad', password: 'ext@2024', role: 'qpsetter', name: 'Dr. K. Prasad', subject: 'Compiler Design', subjectCode: '21CS62', email: 'prasad@bmsce.ac.in', phone: '+91 98111 22233', qualification: 'Ph.D. in Computer Science', experience: '18 years', designation: 'Professor', hodId: 8, affiliation: 'external', college: 'BMS College of Engineering', registeredBy: 'Dr. Nandishwar', registeredOn: '2026-04-10' },
  { id: 21, username: 'ext_lakshmi', password: 'ext@2024', role: 'qpsetter', name: 'Dr. Lakshmi Narayan', subject: 'Cloud Computing', subjectCode: '21CS72', email: 'lakshmi@rvce.edu.in', phone: '+91 98222 33344', qualification: 'Ph.D. in Distributed Systems', experience: '20 years', designation: 'Professor', hodId: 8, affiliation: 'external', college: 'RV College of Engineering', registeredBy: 'Dr. Nandishwar', registeredOn: '2026-04-12' },
];

// ===================== COURSES =====================
export const initialCourses: Course[] = [
  { id: 1, courseName: 'Data Structures & Algorithms', courseCode: '21CS32', semester: '3rd Semester', schemeYear: '2021 Scheme', credits: 4, examTypes: ['Internal Assessment (40M)', 'End Semester (100M)'], bos: 'CSE, AI & ML', hodId: 8 },
  { id: 2, courseName: 'Database Management Systems', courseCode: '21CS42', semester: '4th Semester', schemeYear: '2021 Scheme', credits: 4, examTypes: ['Internal Assessment (40M)', 'End Semester (100M)'], bos: 'CSE, AI & ML', hodId: 8 },
  { id: 3, courseName: 'Machine Learning', courseCode: '21CS52', semester: '5th Semester', schemeYear: '2022 Scheme', credits: 3, examTypes: ['Internal Assessment (40M)', 'End Semester (100M)'], bos: 'CSE, AI & ML', hodId: 8 },
  { id: 4, courseName: 'Computer Networks', courseCode: '21CS44', semester: '4th Semester', schemeYear: '2021 Scheme', credits: 4, examTypes: ['Internal Assessment (40M)', 'End Semester (100M)'], bos: 'CSE, AI & ML', hodId: 8 },
  { id: 5, courseName: 'Operating Systems', courseCode: '21CS43', semester: '4th Semester', schemeYear: '2021 Scheme', credits: 3, examTypes: ['Internal Assessment (40M)', 'End Semester (100M)'], bos: 'CSE, AI & ML', hodId: 8 },
  { id: 6, courseName: 'Engineering Mathematics', courseCode: '21MAT31', semester: '3rd Semester', schemeYear: '2021 Scheme', credits: 4, examTypes: ['End Semester (100M)'], bos: 'CSE, AI & ML', hodId: 8 },
];

// ===================== SCHEMES =====================
export const initialSchemes: SchemeEntry[] = [
  {
    id: 1, courseId: 1, examType: 'Internal Assessment (40M)', semester: '3rd Semester', schemeYear: '2021 Scheme',
    status: 'Finalized', createdDate: '2025-03-01', hodId: 8,
    rows: [
      { questionNo: 'Q1', part: 'a', maxMarks: 4, expectedPoints: 'Define ADT, list characteristics', co: 'CO1', bloomsLevel: 'L1' },
      { questionNo: 'Q1', part: 'b', maxMarks: 3, expectedPoints: 'Stack operations with example', co: 'CO1', bloomsLevel: 'L2' },
      { questionNo: 'Q1', part: 'c', maxMarks: 3, expectedPoints: 'Infix to postfix conversion algorithm', co: 'CO1', bloomsLevel: 'L3' },
      { questionNo: 'Q2', part: 'a', maxMarks: 4, expectedPoints: 'Linear vs non-linear DS', co: 'CO1', bloomsLevel: 'L2' },
      { questionNo: 'Q2', part: 'b', maxMarks: 3, expectedPoints: 'Queue using two stacks', co: 'CO1', bloomsLevel: 'L3' },
      { questionNo: 'Q2', part: 'c', maxMarks: 3, expectedPoints: 'Postfix evaluation', co: 'CO2', bloomsLevel: 'L5' },
      { questionNo: 'Q3', part: 'a', maxMarks: 4, expectedPoints: 'Linked list advantages', co: 'CO2', bloomsLevel: 'L1' },
      { questionNo: 'Q3', part: 'b', maxMarks: 3, expectedPoints: 'Insert node in DLL', co: 'CO2', bloomsLevel: 'L3' },
      { questionNo: 'Q3', part: 'c', maxMarks: 3, expectedPoints: 'Doubly linked list diagram', co: 'CO2', bloomsLevel: 'L2' },
      { questionNo: 'Q4', part: 'a', maxMarks: 4, expectedPoints: 'Circular linked list applications', co: 'CO2', bloomsLevel: 'L1' },
      { questionNo: 'Q4', part: 'b', maxMarks: 3, expectedPoints: 'Reverse singly linked list', co: 'CO2', bloomsLevel: 'L3' },
      { questionNo: 'Q4', part: 'c', maxMarks: 3, expectedPoints: 'Compare SLL, DLL, CLL complexity', co: 'CO3', bloomsLevel: 'L4' },
    ],
  },
];

// ===================== ASSIGNMENTS =====================
export const initialAssignments: Assignment[] = [
  { id: '1IA_6Sem_May2026_21CS32', description: '1st Internal Assessment — 6th Semester CSE AI&ML', facultyId: 2, hodId: 8, subject: 'Data Structures & Algorithms', subjectCode: '21CS32', examType: '1st Internal Assessment (40 Marks)', semester: '6th Semester', scheme: '2021 Scheme', startDate: '2026-05-01', dueDate: '2026-05-15', status: 'Submitted', assignedDate: '2026-04-20', instructions: 'Follow VTU format. Cover modules 1 and 2.', syllabusFileName: 'DSA_Syllabus_2021.pdf', timetableFileName: 'Timetable_6Sem_May2026.pdf', assignedBy: 'Dr. Nandishwar', assignedByRole: 'controller' },
  { id: '2IA_6Sem_May2026_21CS52', description: '2nd Internal Assessment — 6th Semester CSE AI&ML', facultyId: 4, hodId: 8, subject: 'Machine Learning', subjectCode: '21CS52', examType: '2nd Internal Assessment (40 Marks)', semester: '6th Semester', scheme: '2022 Scheme', startDate: '2026-05-01', dueDate: '2026-05-15', status: 'Revision Required', assignedDate: '2026-04-20', instructions: 'Focus on supervised learning topics.', revisionComment: 'Please add more L3-level application questions in Module 3.', timetableFileName: 'Timetable_6Sem_May2026.pdf', assignedBy: 'Dr. Nandishwar', assignedByRole: 'controller', suggestions: [{ id: 1, from: 'Dr. Nandishwar', fromRole: 'controller', message: 'Please add more L3-level application questions in Module 3.', date: '2026-04-22' }] },
  { id: 'SRK_6Sem_Jun2026_21CS42', description: 'Semester End Exam — 6th Sem — June 2026', facultyId: 3, hodId: 8, subject: 'Database Management Systems', subjectCode: '21CS42', examType: 'End Semester Exam (100 Marks)', semester: '6th Semester', scheme: '2021 Scheme', startDate: '2026-06-01', dueDate: '2026-05-25', status: 'Pending', assignedDate: '2026-04-22', instructions: 'Include ER diagram questions.', syllabusFileName: 'DBMS_Syllabus_2021.pdf', prevPaperFileName: 'DBMS_PrevYear_2024.pdf', timetableFileName: 'Timetable_6Sem_Jun2026.pdf', assignedBy: 'Dr. Nandishwar', assignedByRole: 'controller' },
  { id: 'SRK_6Sem_Jun2026_21CS44', description: 'Semester End Exam — 6th Sem — June 2026', facultyId: 5, hodId: 8, subject: 'Computer Networks', subjectCode: '21CS44', examType: 'End Semester Exam (100 Marks)', semester: '6th Semester', scheme: '2021 Scheme', startDate: '2026-06-01', dueDate: '2026-05-25', status: 'Approved', assignedDate: '2026-04-22', timetableFileName: 'Timetable_6Sem_Jun2026.pdf', assignedBy: 'Dr. Nandishwar', assignedByRole: 'controller' },
  { id: 'CIE_T6_5Sem_Apr2026_21CS43', description: 'CIE Test 6 — 5th Sem CSE AI&ML', facultyId: 6, hodId: 8, subject: 'Operating Systems', subjectCode: '21CS43', examType: 'CIE Test (20 Marks)', semester: '5th Semester', scheme: '2021 Scheme', startDate: '2026-04-25', dueDate: '2026-04-30', status: 'Pending', assignedDate: '2026-04-15', assignedBy: 'Dr. Meena Sharma', assignedByRole: 'hod' },
];

// ===================== NOTIFICATIONS =====================
export const initialNotifications: Notification[] = [
  // QP Setter notifications (from HOD)
  { id: 1, userId: 2, message: 'New assignment: Data Structures — Internal Exam — Due: 30 March 2025', date: '2025-03-10', read: false, type: 'info' },
  { id: 2, userId: 4, message: 'HOD requested revision on your ML paper: Please add more L3 questions.', date: '2025-03-20', read: false, type: 'warning' },
  // HOD notifications
  { id: 3, userId: 8, message: 'Controller has assigned 3 papers to your department for this examination cycle.', date: '2025-03-10', read: false, type: 'info' },
  { id: 4, userId: 8, message: 'Prof. Swati has submitted the DSA question paper — awaiting your review.', date: '2025-03-18', read: false, type: 'success' },
  { id: 5, userId: 8, message: 'Scheme for Machine Learning (End Sem) has been finalized.', date: '2025-03-16', read: true, type: 'info' },
  { id: 6, userId: 8, message: '2 QP Setters have pending assignments past due date.', date: '2025-03-22', read: false, type: 'warning' },
  // Controller notifications
  { id: 7, userId: 1, message: 'Dr. Meena Sharma has reviewed and approved 2 papers from CSE (AI & ML).', date: '2025-03-18', read: false, type: 'success' },
  { id: 8, userId: 1, message: 'HOD ISE department has 4 pending paper assignments.', date: '2025-03-19', read: true, type: 'warning' },
];

// ===================== QUESTION BANK =====================
export const questionSuggestions: Record<string, QuestionOption[]> = {
  'Data Structures & Algorithms': [
    { id: 'qs1', text: 'Explain the concept of recursion with a suitable example.', bloomsLevel: 'L2', coMapping: 'CO1', source: 'syllabus_based' },
    { id: 'qs2', text: 'Write a program to implement binary search using recursion.', bloomsLevel: 'L3', coMapping: 'CO2', source: 'previous_year' },
    { id: 'qs3', text: 'Compare and contrast stack and queue data structures.', bloomsLevel: 'L4', coMapping: 'CO1', source: 'ai_suggested' },
    { id: 'qs4', text: 'Implement a priority queue using a min-heap.', bloomsLevel: 'L3', coMapping: 'CO3', source: 'ai_suggested' },
    { id: 'qs5', text: 'Analyze the time complexity of quicksort in best, average, and worst cases.', bloomsLevel: 'L4', coMapping: 'CO4', source: 'previous_year' },
    { id: 'qs6', text: 'Design an algorithm to detect cycle in a linked list.', bloomsLevel: 'L5', coMapping: 'CO2', source: 'ai_suggested' },
    { id: 'qs7', text: 'Evaluate different collision resolution techniques in hashing.', bloomsLevel: 'L5', coMapping: 'CO5', source: 'syllabus_based' },
    { id: 'qs8', text: 'Define and explain different types of trees with examples.', bloomsLevel: 'L1', coMapping: 'CO3', source: 'syllabus_based' },
  ],
  'Database Management Systems': [
    { id: 'qs9', text: 'Explain the ACID properties of a transaction with examples.', bloomsLevel: 'L2', coMapping: 'CO1', source: 'syllabus_based' },
    { id: 'qs10', text: 'Design an ER diagram for a university management system.', bloomsLevel: 'L5', coMapping: 'CO2', source: 'ai_suggested' },
    { id: 'qs11', text: 'Write SQL queries for join operations with examples.', bloomsLevel: 'L3', coMapping: 'CO3', source: 'previous_year' },
    { id: 'qs12', text: 'Explain normalization forms (1NF to BCNF) with examples.', bloomsLevel: 'L2', coMapping: 'CO4', source: 'syllabus_based' },
  ],
  'Machine Learning': [
    { id: 'qs13', text: 'Explain the bias-variance tradeoff in machine learning.', bloomsLevel: 'L2', coMapping: 'CO1', source: 'syllabus_based' },
    { id: 'qs14', text: 'Implement linear regression using gradient descent.', bloomsLevel: 'L3', coMapping: 'CO2', source: 'ai_suggested' },
    { id: 'qs15', text: 'Compare SVM and Random Forest classifiers.', bloomsLevel: 'L4', coMapping: 'CO3', source: 'previous_year' },
    { id: 'qs16', text: 'Design a neural network architecture for image classification.', bloomsLevel: 'L6', coMapping: 'CO5', source: 'ai_suggested' },
  ],
};

export const sampleModules: ModuleData[] = [
  {
    id: 1, title: 'Introduction to Data Structures',
    questions: {
      q1a: { id: 'm1q1a', text: 'Define abstract data types. List and explain the characteristics of ADTs.', marks: 5, bloomsLevel: 'L1', coMapping: 'CO1' },
      q1b: { id: 'm1q1b', text: 'Implement a stack using arrays and demonstrate push, pop, and peek operations with an example.', marks: 10, bloomsLevel: 'L3', coMapping: 'CO1' },
      q2a: { id: 'm1q2a', text: 'Explain the difference between linear and non-linear data structures with examples.', marks: 5, bloomsLevel: 'L2', coMapping: 'CO1' },
      q2b: { id: 'm1q2b', text: 'Design a queue system for a hospital using circular queue. Show enqueue and dequeue operations.', marks: 10, bloomsLevel: 'L5', coMapping: 'CO2' },
    }
  },
  {
    id: 2, title: 'Linked Lists',
    questions: {
      q1a: { id: 'm2q1a', text: 'List the advantages and disadvantages of linked lists over arrays.', marks: 5, bloomsLevel: 'L2', coMapping: 'CO2' },
      q1b: { id: 'm2q1b', text: 'Write a C program to insert a node at a given position in a doubly linked list.', marks: 10, bloomsLevel: 'L3', coMapping: 'CO2' },
      q2a: { id: 'm2q2a', text: 'Define circular linked list and state its applications.', marks: 5, bloomsLevel: 'L1', coMapping: 'CO2' },
      q2b: { id: 'm2q2b', text: 'Analyze the time complexity of insertion and deletion in singly, doubly, and circular linked lists.', marks: 10, bloomsLevel: 'L4', coMapping: 'CO3' },
    }
  },
  {
    id: 3, title: 'Trees and Binary Trees',
    questions: {
      q1a: { id: 'm3q1a', text: 'Define a binary tree. List the properties of a complete binary tree.', marks: 5, bloomsLevel: 'L1', coMapping: 'CO3' },
      q1b: { id: 'm3q1b', text: 'Construct a binary search tree for the following data: 50, 30, 70, 20, 40, 60, 80. Perform inorder, preorder, and postorder traversals.', marks: 10, bloomsLevel: 'L3', coMapping: 'CO3' },
      q2a: { id: 'm3q2a', text: 'Explain the concept of AVL trees and the need for balancing.', marks: 5, bloomsLevel: 'L2', coMapping: 'CO3' },
      q2b: { id: 'm3q2b', text: 'Evaluate the efficiency of BST vs AVL tree for search operations with suitable examples.', marks: 10, bloomsLevel: 'L5', coMapping: 'CO4' },
    }
  },
  {
    id: 4, title: 'Graphs',
    questions: {
      q1a: { id: 'm4q1a', text: 'Define graph and explain the types of graph representations.', marks: 5, bloomsLevel: 'L2', coMapping: 'CO4' },
      q1b: { id: 'm4q1b', text: 'Apply BFS and DFS algorithms on a given graph and show the traversal order.', marks: 10, bloomsLevel: 'L3', coMapping: 'CO4' },
      q2a: { id: 'm4q2a', text: 'State the differences between BFS and DFS traversal techniques.', marks: 5, bloomsLevel: 'L2', coMapping: 'CO4' },
      q2b: { id: 'm4q2b', text: "Find the shortest path using Dijkstra's algorithm for a weighted graph with 6 vertices.", marks: 10, bloomsLevel: 'L4', coMapping: 'CO5' },
    }
  },
  {
    id: 5, title: 'Sorting and Hashing',
    questions: {
      q1a: { id: 'm5q1a', text: 'List and compare the time complexities of various sorting algorithms.', marks: 5, bloomsLevel: 'L2', coMapping: 'CO5' },
      q1b: { id: 'm5q1b', text: 'Sort the array [38, 27, 43, 3, 9, 82, 10] using merge sort. Show all intermediate steps.', marks: 10, bloomsLevel: 'L3', coMapping: 'CO5' },
      q2a: { id: 'm5q2a', text: 'Explain hash functions and collision resolution techniques.', marks: 5, bloomsLevel: 'L2', coMapping: 'CO5' },
      q2b: { id: 'm5q2b', text: 'Create a hash table of size 10 using chaining for the keys: 12, 22, 32, 42, 52, 15, 25. Analyze the load factor.', marks: 10, bloomsLevel: 'L6', coMapping: 'CO5' },
    }
  },
];

export const sampleInternalModules: InternalModuleData[] = [
  {
    id: 1, title: 'Introduction to Data Structures',
    questions: {
      q1: {
        a: { id: 'i1q1a', text: 'Define abstract data types with examples.', marks: 4, bloomsLevel: 'L1', coMapping: 'CO1', part: 'a' },
        b: { id: 'i1q1b', text: 'Explain the operations on stack with suitable examples.', marks: 3, bloomsLevel: 'L2', coMapping: 'CO1', part: 'b' },
        c: { id: 'i1q1c', text: 'Write an algorithm for infix to postfix conversion.', marks: 3, bloomsLevel: 'L3', coMapping: 'CO1', part: 'c' },
      },
      q2: {
        a: { id: 'i1q2a', text: 'Differentiate between linear and non-linear data structures.', marks: 4, bloomsLevel: 'L2', coMapping: 'CO1', part: 'a' },
        b: { id: 'i1q2b', text: 'Implement a queue using two stacks.', marks: 3, bloomsLevel: 'L3', coMapping: 'CO1', part: 'b' },
        c: { id: 'i1q2c', text: 'Evaluate the postfix expression: 6 2 3 + - 3 8 2 / + * 2 ↑ 3 +', marks: 3, bloomsLevel: 'L5', coMapping: 'CO2', part: 'c' },
      },
    }
  },
  {
    id: 2, title: 'Linked Lists',
    questions: {
      q1: {
        a: { id: 'i2q1a', text: 'List the advantages of linked list over arrays.', marks: 4, bloomsLevel: 'L1', coMapping: 'CO2', part: 'a' },
        b: { id: 'i2q1b', text: 'Write a function to insert a node at the end of a singly linked list.', marks: 3, bloomsLevel: 'L3', coMapping: 'CO2', part: 'b' },
        c: { id: 'i2q1c', text: 'Explain the concept of doubly linked list with a diagram.', marks: 3, bloomsLevel: 'L2', coMapping: 'CO2', part: 'c' },
      },
      q2: {
        a: { id: 'i2q2a', text: 'Define circular linked list and state its applications.', marks: 4, bloomsLevel: 'L1', coMapping: 'CO2', part: 'a' },
        b: { id: 'i2q2b', text: 'Write a function to reverse a singly linked list.', marks: 3, bloomsLevel: 'L3', coMapping: 'CO2', part: 'b' },
        c: { id: 'i2q2c', text: 'Compare singly, doubly and circular linked lists in terms of time complexity.', marks: 3, bloomsLevel: 'L4', coMapping: 'CO3', part: 'c' },
      },
    }
  },
];
