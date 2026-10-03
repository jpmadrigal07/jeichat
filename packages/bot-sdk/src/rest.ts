export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown, message?: string) {
    super(message ?? `HTTP ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export class RestClient {
  constructor(
    private readonly apiUrl: string,
    private token: string,
  ) {}

  setToken(token: string) {
    this.token = token;
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>("GET", path);
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("PATCH", path, body);
  }

  async delete<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("DELETE", path, body);
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const response = await fetch(`${this.apiUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bot ${this.token}`,
        ...(body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await response.text();
    const parsed: unknown = text
      ? (JSON.parse(text) as unknown)
      : null;
    if (!response.ok) {
      throw new ApiError(response.status, parsed, response.statusText);
    }
    return parsed as T;
  }
}
