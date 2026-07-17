import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { AppProvider, useApp } from "../contexts/AppContext";
import { apiClient } from "../lib/apiClient";

// Mock apiClient
vi.mock("../lib/apiClient", () => {
  return {
    apiClient: {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      put: vi.fn(),
      delete: vi.fn()
    }
  };
});

// Mock WebSocket to prevent connection errors in test environment
vi.stubGlobal("WebSocket", vi.fn(() => ({
  onmessage: null,
  onopen: null,
  onclose: null,
  onerror: null,
  close: vi.fn(),
  send: vi.fn()
})));

const TestComponent: React.FC = () => {
  const { currentUser, login } = useAuth();
  const { notifications, markNotificationRead } = useApp();

  return (
    <div>
      <span data-testid="user">{currentUser ? currentUser.username : "guest"}</span>
      <button data-testid="login-btn" onClick={() => login("admin", "pass", "hod")}>Login</button>
      <ul data-testid="notifications-list">
        {notifications.map(n => (
          <li key={n.id} data-testid={`notif-${n.id}`}>
            {n.message} - {n.read ? "read" : "unread"}
            <button data-testid={`read-btn-${n.id}`} onClick={() => markNotificationRead(n.id)}>Mark Read</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchInterval: false, refetchOnWindowFocus: false },
      mutations: { retry: false }
    }
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppProvider>
          {children}
        </AppProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

describe("Context Providers", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Re-mock after restoreAllMocks
    vi.mocked(apiClient.get).mockResolvedValue({ success: true, data: [] });
    vi.mocked(apiClient.post).mockResolvedValue({ success: true, data: {} });
    vi.mocked(apiClient.patch).mockResolvedValue({ success: true, data: {} });
  });

  it("restores session user on mount when auth cookies are valid", async () => {
    vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
      if (url === "/auth/me") {
        return {
          success: true,
          data: {
            user: { id: 1, username: "restored_hod", role: "hod", name: "HOD" }
          }
        };
      }
      return { success: true, data: [] };
    });

    render(<TestComponent />, { wrapper: createTestWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId("user").textContent).toBe("restored_hod");
    });
  });

  it("signs in user successfully upon triggering login", async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error("No active session"));
    vi.mocked(apiClient.post).mockResolvedValue({
      success: true,
      data: {
        accessToken: "access-token-123",
        refreshToken: "refresh-token-123",
        user: { id: 2, username: "logged_in_user", role: "hod", name: "HOD" }
      }
    });

    vi.mocked(apiClient.get).mockResolvedValue({ success: true, data: [] });

    render(<TestComponent />, { wrapper: createTestWrapper() });

    const loginButton = await screen.findByTestId("login-btn");
    await act(async () => {
      loginButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("user").textContent).toBe("logged_in_user");
    });
  });

  it("performs optimistic updates when marking notifications read", async () => {
    // Initial mock resolved notifications
    const initialNotifications = [
      { id: 99, userId: 1, message: "New Assignment", read: false }
    ];

    vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
      if (url === "/auth/me") {
        return { success: true, data: { user: { id: 1, username: "user", role: "hod", name: "User" } } };
      }
      if (url === "/notifications") {
        return { success: true, data: initialNotifications };
      }
      return { success: true, data: [] };
    });

    // Mock patch endpoint for the optimistic update call
    vi.mocked(apiClient.patch).mockResolvedValue({
      success: true,
      data: { id: 99, userId: 1, message: "New Assignment", read: true }
    });

    render(<TestComponent />, { wrapper: createTestWrapper() });

    // Wait for initial notification load
    await waitFor(() => {
      expect(screen.getByTestId("notif-99").textContent).toContain("unread");
    });

    // Mark as read — use async act to let mutateAsync settle
    const readBtn = screen.getByTestId("read-btn-99");
    await act(async () => {
      readBtn.click();
    });

    // Verify the optimistic update changed UI to "read"
    await waitFor(() => {
      expect(screen.getByTestId("notif-99").textContent).toContain("read");
    });

    // Verify the API patch was actually called
    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith("/notifications/99/read");
    });
  });
});
