import React, { createContext, useContext, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Assignment, Notification, Course, SchemeEntry, User } from '@/lib/types';
import { useAuth } from './AuthContext';
import { apiClient } from '@/lib/apiClient';
import { toast } from 'sonner';

interface AppContextType {
  assignments: Assignment[];
  notifications: Notification[];
  courses: Course[];
  schemes: SchemeEntry[];
  allUsers: User[];
  assessments: any[];
  
  addUser: (u: Omit<User, 'id'>) => Promise<User>;
  updateUser: (id: number, updates: Partial<User>) => Promise<void>;
  deleteUser: (id: number) => Promise<void>;
  addAssignment: (a: any) => Promise<void>;
  updateAssignment: (id: number, updates: Partial<Assignment>) => Promise<void>;
  addSuggestion: (id: number, fromUserId: number, message: string) => Promise<void>;
  addNotification: (n: Omit<Notification, 'id'>) => Promise<void>;
  markNotificationRead: (id: number) => Promise<void>;
  getAssignmentsForFaculty: (facultyId: number) => Assignment[];
  getAssignmentsForHod: (hodId: number) => Assignment[];
  getNotificationsForUser: (userId: number) => Notification[];
  addCourse: (c: Omit<Course, 'id'>) => Promise<void>;
  updateCourse: (id: number, updates: Partial<Course>) => Promise<void>;
  deleteCourse: (id: number) => Promise<void>;
  addScheme: (s: Omit<SchemeEntry, 'id'>) => Promise<void>;
  updateScheme: (id: number, updates: Partial<SchemeEntry>) => Promise<void>;
  addAssessment: (a: any) => Promise<void>;

  assignmentsLoading: boolean;
  notificationsLoading: boolean;
  coursesLoading: boolean;
  schemesLoading: boolean;
  usersLoading: boolean;
  assessmentsLoading: boolean;

  assignmentsError: string | null;
  notificationsError: string | null;
  coursesError: string | null;
  schemesError: string | null;
  usersError: string | null;
  assessmentsError: string | null;
}

const AppContext = createContext<AppContextType | null>(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  // Queries (reads)
  const { 
    data: allUsers = [], 
    isLoading: isUsersQueryLoading,
    error: usersQueryError 
  } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: any }>('/users');
      const items = Array.isArray(res.data) ? res.data : res.data?.items || [];
      return items.map((u: any) => ({ ...u, password: '' } as User));
    },
    enabled: !!currentUser,
    refetchInterval: 15000, // Background poll every 15s
  });

  const { 
    data: courses = [], 
    isLoading: isCoursesQueryLoading,
    error: coursesQueryError 
  } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: any }>('/courses');
      return Array.isArray(res.data) ? res.data : res.data?.items || [];
    },
    enabled: !!currentUser,
    refetchInterval: 20000,
  });

  const { 
    data: assignments = [], 
    isLoading: isAssignmentsQueryLoading,
    error: assignmentsQueryError 
  } = useQuery({
    queryKey: ['assignments'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: any }>('/assignments');
      return Array.isArray(res.data) ? res.data : res.data?.items || [];
    },
    enabled: !!currentUser,
    refetchInterval: 10000,
  });

  const { 
    data: notifications = [], 
    isLoading: isNotificationsQueryLoading,
    error: notificationsQueryError 
  } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: any }>('/notifications');
      return Array.isArray(res.data) ? res.data : res.data?.items || [];
    },
    enabled: !!currentUser,
    refetchInterval: 5000,
  });

  const { 
    data: schemes = [], 
    isLoading: isSchemesQueryLoading,
    error: schemesQueryError 
  } = useQuery({
    queryKey: ['schemes'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: any }>('/schemes');
      return Array.isArray(res.data) ? res.data : res.data?.items || [];
    },
    enabled: !!currentUser,
    refetchInterval: 20000,
  });

  const { 
    data: assessments = [], 
    isLoading: isAssessmentsQueryLoading,
    error: assessmentsQueryError 
  } = useQuery({
    queryKey: ['assessments'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: any }>('/assessments');
      return Array.isArray(res.data) ? res.data : res.data?.items || [];
    },
    enabled: !!currentUser,
    refetchInterval: 20000,
  });

  // Real-time notifications WebSocket hook
  useEffect(() => {
    if (!currentUser) return;

    // Convert HTTP prefix to WS prefix dynamically
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';
    // Remove the '/api/v1' or similar suffix for WebSocket root upgrade path
    const wsBaseUrl = apiUrl.replace(/\/api\/v1\/?$/, '').replace(/\/api\/?$/, '');
    const wsUrl = wsBaseUrl.replace(/^http/, 'ws') + '/notifications';

    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'NOTIFICATION_RECEIVED') {
          // Trigger TanStack query invalidations
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          queryClient.invalidateQueries({ queryKey: ['assignments'] });

          // Pop real-time toast alert
          if (payload.data?.message) {
            toast.info(payload.data.message);
          }
        }
      } catch (err) {
        console.error('Failed to parse WS payload:', err);
      }
    };

    return () => {
      ws.close();
    };
  }, [currentUser, queryClient]);

  // Mutations (writes)
  const addUserMutation = useMutation({
    mutationFn: async (u: Omit<User, 'id'>) => {
      const res = await apiClient.post<{ data: Omit<User, 'password'> }>('/users', u);
      return { ...res.data, password: u.password } as User;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<User> }) => {
      const res = await apiClient.patch<{ data: User }>(`/users/${id}`, updates);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const addAssignmentMutation = useMutation({
    mutationFn: async (a: any) => {
      const res = await apiClient.post<{ data: Assignment }>('/assignments', a);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
    },
  });

  const updateAssignmentMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Assignment> }) => {
      const res = await apiClient.patch<{ data: Assignment }>(`/assignments/${id}`, updates);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
    },
  });

  const addSuggestionMutation = useMutation({
    mutationFn: async ({ id, fromUserId, message }: { id: number; fromUserId: number; message: string }) => {
      const res = await apiClient.post<{ data: any }>(`/assignments/${id}/suggestions`, {
        fromUserId,
        message
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
    },
  });

  const addNotificationMutation = useMutation({
    mutationFn: async (n: Omit<Notification, 'id'>) => {
      const res = await apiClient.post<{ data: Notification }>('/notifications', n);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Optimistic UI Update with rollback capability
  const markNotificationReadMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.patch(`/notifications/${id}/read`);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      const previousNotifications = queryClient.getQueryData<Notification[]>(['notifications']);

      queryClient.setQueryData<Notification[]>(['notifications'], (prev) => {
        if (!prev) return [];
        return prev.map(n => n.id === id ? { ...n, read: true } : n);
      });

      return { previousNotifications };
    },
    onError: (err, id, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(['notifications'], context.previousNotifications);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const addCourseMutation = useMutation({
    mutationFn: async (c: Omit<Course, 'id'>) => {
      const res = await apiClient.post<{ data: Course }>('/courses', c);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });

  const updateCourseMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Course> }) => {
      const res = await apiClient.patch<{ data: Course }>(`/courses/${id}`, updates);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });

  const deleteCourseMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/courses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });

  const addSchemeMutation = useMutation({
    mutationFn: async (s: Omit<SchemeEntry, 'id'>) => {
      const res = await apiClient.post<{ data: SchemeEntry }>('/schemes', s);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schemes'] });
    },
  });

  const addAssessmentMutation = useMutation({
    mutationFn: async (a: any) => {
      const res = await apiClient.post<{ data: any }>('/assessments', a);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
    },
  });

  const updateSchemeMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<SchemeEntry> }) => {
      const res = await apiClient.patch<{ data: SchemeEntry }>(`/schemes/${id}`, updates);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schemes'] });
    },
  });

  // Callbacks mapped to mutations
  const addUser = useCallback(async (u: Omit<User, 'id'>) => {
    return await addUserMutation.mutateAsync(u);
  }, [addUserMutation]);

  const updateUser = useCallback(async (id: number, updates: Partial<User>) => {
    await updateUserMutation.mutateAsync({ id, updates });
  }, [updateUserMutation]);

  const deleteUser = useCallback(async (id: number) => {
    await deleteUserMutation.mutateAsync(id);
  }, [deleteUserMutation]);

  const addAssignment = useCallback(async (a: any) => {
    await addAssignmentMutation.mutateAsync(a);
  }, [addAssignmentMutation]);

  const updateAssignment = useCallback(async (id: number, updates: Partial<Assignment>) => {
    await updateAssignmentMutation.mutateAsync({ id, updates });
  }, [updateAssignmentMutation]);

  const addSuggestion = useCallback(async (id: number, fromUserId: number, message: string) => {
    await addSuggestionMutation.mutateAsync({ id, fromUserId, message });
  }, [addSuggestionMutation]);

  const addNotification = useCallback(async (n: Omit<Notification, 'id'>) => {
    await addNotificationMutation.mutateAsync(n);
  }, [addNotificationMutation]);

  const markNotificationRead = useCallback(async (id: number) => {
    await markNotificationReadMutation.mutateAsync(id);
  }, [markNotificationReadMutation]);

  const addCourse = useCallback(async (c: Omit<Course, 'id'>) => {
    await addCourseMutation.mutateAsync(c);
  }, [addCourseMutation]);

  const updateCourse = useCallback(async (id: number, updates: Partial<Course>) => {
    await updateCourseMutation.mutateAsync({ id, updates });
  }, [updateCourseMutation]);

  const deleteCourse = useCallback(async (id: number) => {
    await deleteCourseMutation.mutateAsync(id);
  }, [deleteCourseMutation]);

  const addScheme = useCallback(async (s: Omit<SchemeEntry, 'id'>) => {
    await addSchemeMutation.mutateAsync(s);
  }, [addSchemeMutation]);

  const updateScheme = useCallback(async (id: number, updates: Partial<SchemeEntry>) => {
    await updateSchemeMutation.mutateAsync({ id, updates });
  }, [updateSchemeMutation]);

  const addAssessment = useCallback(async (a: any) => {
    await addAssessmentMutation.mutateAsync(a);
  }, [addAssessmentMutation]);

  // Synchronous filtering methods
  const getAssignmentsForFaculty = useCallback((facultyId: number) => {
    return assignments.filter(a => a.facultyId === facultyId);
  }, [assignments]);

  const getAssignmentsForHod = useCallback((hodId: number) => {
    return assignments.filter(a => a.hodId === hodId);
  }, [assignments]);

  const getNotificationsForUser = useCallback((userId: number) => {
    return notifications.filter(n => n.userId === userId);
  }, [notifications]);

  // Combined Loading States
  const assignmentsLoading = isAssignmentsQueryLoading || addAssignmentMutation.isPending || updateAssignmentMutation.isPending || addSuggestionMutation.isPending;
  const notificationsLoading = isNotificationsQueryLoading || addNotificationMutation.isPending || markNotificationReadMutation.isPending;
  const coursesLoading = isCoursesQueryLoading || addCourseMutation.isPending || updateCourseMutation.isPending || deleteCourseMutation.isPending;
  const schemesLoading = isSchemesQueryLoading || addSchemeMutation.isPending || updateSchemeMutation.isPending;
  const usersLoading = isUsersQueryLoading || addUserMutation.isPending || updateUserMutation.isPending || deleteUserMutation.isPending;
  const assessmentsLoading = isAssessmentsQueryLoading || addAssessmentMutation.isPending;

  // Error mappings
  const assignmentsError = assignmentsQueryError ? (assignmentsQueryError as any).message : null;
  const notificationsError = notificationsQueryError ? (notificationsQueryError as any).message : null;
  const coursesError = coursesQueryError ? (coursesQueryError as any).message : null;
  const schemesError = schemesQueryError ? (schemesQueryError as any).message : null;
  const usersError = usersQueryError ? (usersQueryError as any).message : null;
  const assessmentsError = assessmentsQueryError ? (assessmentsQueryError as any).message : null;

  return (
    <AppContext.Provider value={{
      assignments, notifications, courses, schemes, allUsers, assessments, addUser, updateUser, deleteUser,
      addAssignment, updateAssignment, addSuggestion, addNotification, markNotificationRead,
      getAssignmentsForFaculty, getAssignmentsForHod, getNotificationsForUser,
      addCourse, updateCourse, deleteCourse, addScheme, updateScheme, addAssessment,
      
      assignmentsLoading, notificationsLoading, coursesLoading, schemesLoading, usersLoading, assessmentsLoading,
      assignmentsError, notificationsError, coursesError, schemesError, usersError, assessmentsError
    }}>
      {children}
    </AppContext.Provider>
  );
};
