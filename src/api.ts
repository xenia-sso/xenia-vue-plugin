export const UNAUTHORIZED_STATUS = 401;

export class CallError extends Error {
  public name: string;
  public status: number | undefined;

  constructor(error: { name: string; message: string; status?: number }) {
    super(error.message);
    this.name = error.name;
    this.status = error.status;
  }
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;

  // Any other fields...
  [key: string]: any;
}

class Api {
  private jwt: string;
  private baseUrl: string;
  private onCannotRefreshTokenCallbacks: (() => void | Promise<void>)[];

  constructor() {
    this.baseUrl = "";
    this.jwt = "";
    this.onCannotRefreshTokenCallbacks = [];
  }

  private internalCall = async <T>(url: string, request: RequestInit = {}, token = "") => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = token;
    }

    const options: RequestInit = {
      method: request.method || "GET",
      headers,
      credentials: "include",
    };

    if (request.body) {
      options.body = JSON.stringify(request.body);
    }

    let res;
    try {
      res = await fetch(`${this.baseUrl}${url}`, options);
    } catch (err) {
      if (err instanceof Error) {
        throw new CallError({ name: err.name, message: err.message });
      }
      throw new CallError({
        name: "NetworkError",
        message: "An unexpected error occurred.",
      });
    }

    if (!res.ok) {
      const json = (await res.json()) as { name: string; message: string };
      throw new CallError({
        name: json.name,
        message: json.message,
        status: res.status,
      });
    }

    const json = (await res.json()) as T;
    return json;
  };

  private refreshToken = () => {
    return this.internalCall<{ token: string }>("/oauth2/refresh", {
      method: "POST",
    });
  };

  call = async <T>(
    url: string,
    // RequestInit interface allows "any" type for body field
    // We want to restrict to object or undefined
    fetchOptions: Omit<RequestInit, "body"> & {
      body?: Record<string, any>;
    } = {},
    { authenticated = true, withRefresh = true } = {}
  ) => {
    try {
      return await this.internalCall<T>(url, fetchOptions as any, authenticated ? this.jwt : undefined);
    } catch (err) {
      // All errors should ever be CallError since Network Errors are transformed into Call Errors in internalCall method.
      if (!(err instanceof CallError)) {
        throw new Error("An unexpected error occurred.");
      }

      if (err.status !== UNAUTHORIZED_STATUS || !withRefresh || !authenticated) {
        throw err;
      }

      let token = "";
      try {
        token = (await this.refreshToken()).token;
      } catch (errRefresh) {
        for (const cb of this.onCannotRefreshTokenCallbacks) {
          void cb();
        }
        throw errRefresh;
      }
      this.jwt = token;

      return await this.internalCall<T>(url, fetchOptions as any, this.jwt);
    }
  };

  setBaseUrl = (baseUrl: string) => {
    this.baseUrl = baseUrl;
  };

  onCannotRefreshToken = (cb: () => void | Promise<void>) => {
    this.onCannotRefreshTokenCallbacks.push(cb);
  };

  loginUsingAuthCode = async (authCode: string, codeChallenge: string) => {
    const data = await this.call<{ token: string; user: User }>(
      `/oauth2/token?authorizationCode=${authCode}&codeChallenge=${encodeURIComponent(codeChallenge)}`,
      {
        method: "POST",
      },
      {
        authenticated: false,
      }
    );

    this.jwt = data.token;
    return data.user;
  };

  logout = async () => {
    const data = await this.call("/oauth2/logout", { method: "POST" });
    this.jwt = "";
    return data;
  };
}

export const api = new Api();
