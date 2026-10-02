import { useState, useEffect, useRef, useCallback } from 'react';

interface LocalDraftRecord<T = any> {
  assignmentId: string | number;
  paper: T;
  savedAt: string; // ISO timestamp
}

export type AutoSaveStatus = 'saved' | 'saving' | 'unsaved';

interface UsePaperAutoSaveOptions<T = any> {
  assignmentId: string | number | undefined;
  paper: T;
  serverUpdatedAt?: string;
  debounceMs?: number;
  onRestore?: (restoredPaper: T) => void;
}

export function usePaperAutoSave<T = any>({
  assignmentId,
  paper,
  serverUpdatedAt,
  debounceMs = 1200,
  onRestore,
}: UsePaperAutoSaveOptions<T>) {
  const [saveStatus, setSaveStatus] = useState<AutoSaveStatus>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [hasRecoverableDraft, setHasRecoverableDraft] = useState(false);
  const [recoverableTimestamp, setRecoverableTimestamp] = useState<string | null>(null);
  const [cachedDraft, setCachedDraft] = useState<T | null>(null);

  const storageKey = assignmentId ? `amcec_qp_draft_${assignmentId}` : null;
  const isInitialMount = useRef(true);
  const paperRef = useRef<T>(paper);
  paperRef.current = paper;

  // Check for existing recoverable draft on initial mount
  useEffect(() => {
    if (!storageKey) return;

    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed: LocalDraftRecord<T> = JSON.parse(raw);
        if (parsed && parsed.paper && parsed.savedAt) {
          const draftTime = new Date(parsed.savedAt).getTime();
          const serverTime = serverUpdatedAt ? new Date(serverUpdatedAt).getTime() : 0;

          // If draft is strictly newer than server's version and has content
          const pAny = parsed.paper as any;
          const hasContent = Boolean(
            (pAny.modules && pAny.modules.length > 0) ||
            (pAny.setA && pAny.setA.modules && pAny.setA.modules.length > 0)
          );

          if (draftTime > serverTime && hasContent) {
            setCachedDraft(parsed.paper);
            setRecoverableTimestamp(parsed.savedAt);
            setHasRecoverableDraft(true);
          }
        }
      }
    } catch (err) {
      console.warn('Failed reading paper auto-save cache from localStorage', err);
    }
  }, [storageKey, serverUpdatedAt]);

  // Debounced auto-save whenever `paper` changes
  useEffect(() => {
    if (!storageKey) return;

    // Skip auto-saving the initial default state before user makes modifications
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    setSaveStatus('unsaved');

    const timer = setTimeout(() => {
      setSaveStatus('saving');
      try {
        const payload: LocalDraftRecord = {
          assignmentId,
          paper,
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem(storageKey, JSON.stringify(payload));
        setSaveStatus('saved');
        setLastSavedTime(new Date());
      } catch (err) {
        console.error('Failed to auto-save question paper to localStorage', err);
        setSaveStatus('unsaved');
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [paper, storageKey, assignmentId, debounceMs]);

  // Restore the cached local draft
  const restoreDraft = useCallback(() => {
    if (!cachedDraft) return null;
    if (onRestore) {
      onRestore(cachedDraft);
    }
    setHasRecoverableDraft(false);
    setSaveStatus('saved');
    setLastSavedTime(new Date());
    return cachedDraft;
  }, [cachedDraft, onRestore]);

  // Discard the cached local draft
  const discardDraft = useCallback(() => {
    if (storageKey) {
      localStorage.removeItem(storageKey);
    }
    setCachedDraft(null);
    setHasRecoverableDraft(false);
  }, [storageKey]);

  // Explicitly clear local draft (e.g. after successful submission to HOD)
  const clearDraft = useCallback(() => {
    if (storageKey) {
      localStorage.removeItem(storageKey);
    }
    setCachedDraft(null);
    setHasRecoverableDraft(false);
    setSaveStatus('saved');
  }, [storageKey]);

  // Export local JSON backup file
  const exportBackup = useCallback(() => {
    try {
      const exportData = {
        exportedAt: new Date().toISOString(),
        assignmentId,
        paper: paperRef.current,
      };
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(exportData, null, 2)
      )}`;
      const downloadAnchor = document.createElement('a');
      const p = paperRef.current as any;
      const code = p?.metadata?.courseCode || p?.courseCode || p?.setA?.courseCode || 'QP';
      const filename = `${code}_Draft_Backup_${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', filename);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      console.error('Failed to export offline paper backup', err);
      throw err;
    }
  }, [assignmentId]);

  // Import JSON backup file
  const importBackup = useCallback(
    (file: File): Promise<T> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const parsed = JSON.parse(event.target?.result as string);
            const importedPaper = (parsed.paper || parsed) as T;
            const pAny = importedPaper as any;
            const isValid = Boolean(
              (pAny.modules && Array.isArray(pAny.modules)) ||
              (pAny.setA && Array.isArray(pAny.setA.modules))
            );
            if (!isValid) {
              throw new Error('Invalid Question Paper backup schema: modules missing');
            }
            if (onRestore) {
              onRestore(importedPaper);
            }
            // Also store to localStorage
            if (storageKey) {
              const payload: LocalDraftRecord<T> = {
                assignmentId: assignmentId || '',
                paper: importedPaper,
                savedAt: new Date().toISOString(),
              };
              localStorage.setItem(storageKey, JSON.stringify(payload));
            }
            setSaveStatus('saved');
            setLastSavedTime(new Date());
            resolve(importedPaper);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsText(file);
      });
    },
    [assignmentId, onRestore, storageKey]
  );

  return {
    saveStatus,
    lastSavedTime,
    hasRecoverableDraft,
    recoverableTimestamp,
    restoreDraft,
    discardDraft,
    clearDraft,
    exportBackup,
    importBackup,
  };
}
