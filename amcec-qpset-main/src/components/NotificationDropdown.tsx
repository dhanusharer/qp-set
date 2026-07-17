import { Bell, Eye, PenLine } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { AssessmentBadge } from '@/components/AssessmentBadge';

export const NotificationDropdown = () => {
  const { currentUser } = useAuth();
  const { getNotificationsForUser, markNotificationRead } = useApp();
  const navigate = useNavigate();

  if (!currentUser) return null;
  const notifs = getNotificationsForUser(currentUser.id);
  const unreadCount = notifs.filter(n => !n.read).length;

  const editPath = currentUser.role === 'qpsetter' ? '/faculty/create-paper' : currentUser.role === 'hod' ? '/hod/create-paper' : '/controller/review';
  const viewPath = currentUser.role === 'qpsetter' ? '/faculty/preview-paper' : currentUser.role === 'hod' ? '/hod/preview-paper' : '/controller/review';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-lg hover:bg-secondary transition-colors">
          <Bell className="h-5 w-5 text-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
              {unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-3 border-b flex items-center justify-between">
          <h4 className="font-semibold text-sm">Notifications</h4>
          <span className="text-[10px] text-muted-foreground">{unreadCount} unread</span>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifs.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground text-center">No notifications</p>
          ) : (
            notifs.map(n => (
              <div
                key={n.id}
                className={`p-3 border-b last:border-0 ${!n.read ? 'bg-accent/5' : ''}`}
                onClick={() => markNotificationRead(n.id)}
              >
                {n.kind === 'suggestion' && (
                  <p className="text-[10px] font-bold text-accent mb-1 flex items-center gap-1">
                    🔔 New Suggestion {n.fromName ? `from ${n.fromName}` : ''}
                  </p>
                )}
                {n.assessmentId && (
                  <div className="mb-1.5">
                    <AssessmentBadge id={n.assessmentId} />
                  </div>
                )}
                <p className="text-sm text-foreground">{n.message}</p>
                <p className="text-xs text-muted-foreground mt-1">{n.date}</p>
                {(n.kind === 'suggestion' || n.kind === 'revision') && currentUser.role === 'qpsetter' && (
                  <div className="flex gap-2 mt-2">
                    <button onClick={(e) => { e.stopPropagation(); navigate(viewPath); }} className="text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded border hover:bg-secondary">
                      <Eye className="h-3 w-3" /> View Paper
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); navigate(editPath); }} className="text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded bg-accent text-accent-foreground hover:bg-accent/90">
                      <PenLine className="h-3 w-3" /> Make Changes
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
