import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/apiClient';

export interface AcademicYear {
  id: number;
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  terms?: AcademicTerm[];
}

export interface AcademicTerm {
  id: number;
  academicYearId: number;
  termType: 'ODD' | 'EVEN' | 'SUMMER';
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  academicYear?: AcademicYear;
}

export interface AssessmentType {
  id: number;
  code: string;
  name: string;
  category: 'FORMATIVE' | 'SUMMATIVE' | 'REMEDIAL' | 'SPECIAL';
  isTerminal: boolean;
  defaultWeight: number;
}

export interface ExamSession {
  id: number;
  academicTermId: number;
  assessmentTypeId: number;
  regulationProfileId?: number;
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'PLANNING' | 'ACTIVE' | 'SCRUTINY' | 'SEALED' | 'CONCLUDED' | 'CANCELLED';
  academicTerm?: AcademicTerm;
  assessmentType?: AssessmentType;
  _count?: {
    assessmentEvents: number;
  };
}

interface AcademicCycleContextType {
  years: AcademicYear[];
  selectedYear: AcademicYear | null;
  setSelectedYear: (year: AcademicYear) => void;
  terms: AcademicTerm[];
  selectedTerm: AcademicTerm | null;
  setSelectedTerm: (term: AcademicTerm) => void;
  sessions: ExamSession[];
  selectedSession: ExamSession | null;
  setSelectedSession: (session: ExamSession) => void;
  loading: boolean;
  refreshCycles: () => Promise<void>;
  updateSessionStatus: (sessionId: number, status: string) => Promise<void>;
}

const AcademicCycleContext = createContext<AcademicCycleContextType | undefined>(undefined);

export const AcademicCycleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [selectedYear, setSelectedYear] = useState<AcademicYear | null>(null);
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<AcademicTerm | null>(null);
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ExamSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshCycles = useCallback(async () => {
    try {
      setLoading(true);
      const [yearsRes, termsRes, sessionsRes] = await Promise.all([
        apiClient.get<{ success: boolean; data: AcademicYear[] }>('/academic-cycles/years').catch(() => ({ success: true, data: [] })),
        apiClient.get<{ success: boolean; data: AcademicTerm[] }>('/academic-cycles/terms').catch(() => ({ success: true, data: [] })),
        apiClient.get<{ success: boolean; data: ExamSession[] }>('/academic-cycles/sessions').catch(() => ({ success: true, data: [] })),
      ]);

      const fetchedYears = yearsRes.data || [];
      const fetchedTerms = termsRes.data || [];
      const fetchedSessions = sessionsRes.data || [];

      setYears(fetchedYears);
      setTerms(fetchedTerms);
      setSessions(fetchedSessions);

      // Select default current year
      if (fetchedYears.length > 0) {
        const currentYear = fetchedYears.find(y => y.isCurrent) || fetchedYears[0];
        setSelectedYear(prev => prev ? (fetchedYears.find(y => y.id === prev.id) || currentYear) : currentYear);
      }

      // Select default current term
      if (fetchedTerms.length > 0) {
        const currentTerm = fetchedTerms.find(t => t.isCurrent) || fetchedTerms[0];
        setSelectedTerm(prev => prev ? (fetchedTerms.find(t => t.id === prev.id) || currentTerm) : currentTerm);
      }

      // Select active session
      if (fetchedSessions.length > 0) {
        const activeSession = fetchedSessions.find(s => s.status === 'ACTIVE') || fetchedSessions[0];
        setSelectedSession(prev => prev ? (fetchedSessions.find(s => s.id === prev.id) || activeSession) : activeSession);
      }
    } catch (err) {
      console.error('Failed to load academic cycle context:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCycles();
  }, [refreshCycles]);

  const updateSessionStatus = async (sessionId: number, status: string) => {
    await apiClient.patch(`/academic-cycles/sessions/${sessionId}/status`, { status });
    await refreshCycles();
  };

  return (
    <AcademicCycleContext.Provider
      value={{
        years,
        selectedYear,
        setSelectedYear,
        terms,
        selectedTerm,
        setSelectedTerm,
        sessions,
        selectedSession,
        setSelectedSession,
        loading,
        refreshCycles,
        updateSessionStatus,
      }}
    >
      {children}
    </AcademicCycleContext.Provider>
  );
};

export const useAcademicCycle = () => {
  const context = useContext(AcademicCycleContext);
  if (!context) {
    throw new Error('useAcademicCycle must be used within an AcademicCycleProvider');
  }
  return context;
};
