import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

describe("apiClient", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    vi.restoreAllMocks();
    document.cookie = "csrf-token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    // Stub location to prevent actual redirects
    vi.stubGlobal("location", { href: "", pathname: "/dashboard" });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("performs GET request successfully", async () => {
    const mockResponseData = { success: true, data: { status: "ok" } };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponseData
    });
    vi.stubGlobal("fetch", fetchMock);

    // Dynamic import so the module picks up our mocked fetch
    const { apiClient } = await import("../lib/apiClient");

    const res = await apiClient.get<any>("/health/live");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/health/live"),
      expect.any(Object)
    );
    expect(res).toEqual(mockResponseData);
  });

  it("throws APIError on HTTP error status codes", async () => {
    const mockErrorData = {
      success: false,
      error: { code: "BAD_REQUEST", message: "Invalid parameter" }
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => mockErrorData
    });
    vi.stubGlobal("fetch", fetchMock);

    const { apiClient } = await import("../lib/apiClient");

    await expect(apiClient.get("/users")).rejects.toMatchObject({
      message: "Invalid parameter",
      statusCode: 400
    });
  });

  it("silently refreshes tokens on 401 unauthorized errors", async () => {
    document.cookie = "csrf-token=csrf-token-123; path=/";

    let callCount = 0;
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      callCount++;
      // First call: original request returns 401
      if (callCount === 1) {
        return {
          ok: false,
          status: 401,
          json: async () => ({ success: false, error: { message: "Unauthorized" } })
        };
      }
      // Second call: refresh endpoint returns new tokens
      if (callCount === 2) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: { accessToken: "new-access", refreshToken: "new-refresh" }
          })
        };
      }
      // Third call: retried original request succeeds
      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: ["user1"] })
      };
    });

    vi.stubGlobal("fetch", fetchMock);

    const { apiClient } = await import("../lib/apiClient");

    const res = await apiClient.get<any>("/users");

    // Verify all 3 fetch calls were made: original 401, refresh, retry
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("/auth/refresh"),
      expect.objectContaining({
        credentials: "include",
        headers: expect.any(Headers)
      })
    );
    const refreshOptions = fetchMock.mock.calls[1][1] as RequestInit;
    expect((refreshOptions.headers as Headers).get("X-CSRF-Token")).toBe("csrf-token-123");
    expect(res).toEqual({ success: true, data: ["user1"] });
  }, 15000);
});
