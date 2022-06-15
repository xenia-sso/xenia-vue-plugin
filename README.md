# Xenia Vue Plugin

Xenia plugin for Vue 3.

## Features

- Silent login
- Authorization code flow
  - Redirection to Xenia login page
  - Authorization code handling
- Authenticated calls
- Current user variable
- Global navigation guard based on routes meta
- Automatic redirection after login and logout

## Installation

```bash
npm i @xenia-sso/vue-plugin
```

## Configuration

```javascript
import { createApp } from "vue";
import App from "./App.vue";
import xenia from "@xenia-sso/vue-plugin";
// In this example, we will assume the router is created and exported from this file:
import router from "@/router/index.ts";

const app = createApp(App).mount("#app");

app.use(router);

app.use(xenia, {
  // Client back-end base URL
  clientBackendBaseUrl: "http://localhost:3001/api",
  // OAuth2 authorization code flow configuration
  oauth2: {
    // Authentication server login page URL
    loginPageUrl: "http://localhost:3000/oauth2/login",
    // Client back-end ID
    clientId: "[MY_CLIENT_ID]",
    // User defined redirect URI in case computed redirect URI is wrong (will occur if router is not using hash mode).
    // Default to `${window.location.origin}/#/oauth2/cb`. If overridden, MUST end by "/oauth2/cb".
    // redirectUri: `${window.location.origin}/oauth2/cb`,
  },
  // Vue Router configuration:
  // - Add route to handle authorization code response
  // - Add logout route
  // - Add global navigation guard to prevent unauthenticated user to access protected routes
  // - Handle automatic redirect after login/logout
  router,
  // Authenticated routes configuration
  routesAuth: {
    // Routes with meta [authFlagKey] requires the user to be logged in
    authFlagKey: "requiresAuth",
    // Route to redirect to in case the user is not authenticated and navigates to a restricted route
    unauthorizedRedirectRoute: "/",
    // Route to redirect to after login
    postLoginRedirectRoute: "/auth/page1",
    // Route to redirect to in case of login error
    loginErrorRedirectRoute: "/auth-error",
    // Route to redirect to after logout
    postLogoutRedirectRoute: "/about",
  },
});
```

## API

```typescript
/**
 * Default export to pass to the `app.use()` method
 */
const _default: {
  install: (app: any, options: Options) => void;
};
  
/**
 * Request code challenge and redirect to Xenia login page
 */
const login: () => Promise<void>;

/**
 * Call back-end logout webservice and clear current use variable (cf. useCurrentUser function)
 */
const logout: () => void;

/*
 * Call any back-end webservice. Automatically provides session token and renews it if needed (this can be turned off in options object).
 *
 * @param {string} url - Relative webservice url (ex: "/books")
 * @param {object} fetchOptions - Native fetch() options, except body is an object instead of a string
 * @param {object} options - Allow to customize call() behavior
 */
const call: <T>(
  url: string,
  fetchOptions?: Omit<RequestInit, "body"> & {
    body?: Record<string, any> | undefined;
  },
  {
    authenticated,
    withRefresh,
  }?: {
    authenticated?: boolean | undefined;
    withRefresh?: boolean | undefined;
  }
) => Promise<T>;

/**
 * Current user composable function
 */
export const useCurrentUser: () => {
  currentUser: import("vue").Ref<
    | {
        readonly id: string;
        readonly email: string;
        readonly firstName: string;
        readonly lastName: string;
      }
    | undefined
  >;
  isLoggedIn: import("vue").ComputedRef<boolean>;
  isSilentlyLoggingIn: import("vue").Ref<boolean>;
  onCurrentUserChange: (
    cb: (user: User | undefined) => void | Promise<void>
  ) => void;
};
```

## Example

1. Import and add the Xenia Vue 3 plugin to your Vue instance

In this example, we will use the following configuration (pay attention to the `routesAuth` attribute):

```javascript
app.use(xenia, {
  clientBackendBaseUrl: "http://localhost:3001/api",
  oauth2: {
    loginPageUrl: "https://example.com/oauth2/login",
    clientId: "...",
  },
  router,
  routesAuth: {
    authFlagKey: "requiresAuth",
    unauthorizedRedirectRoute: "/login",
    postLoginRedirectRoute: "/dashboard",
    postLogoutRedirectRoute: "/login",
  },
});
```

2. Configure your routes

Routes with metadata `[routesAuth.authFlagKey]` (i.e. `requiresAuth`) will automatically redirect unauthenticated users.

File `router.ts`:

```javascript
const router = VueRouter.createRouter({
  history: VueRouter.createWebHashHistory(),
  routes: [
    // Unauthenticated users can access this page
    { path: "/login", component: Login },
    // Access to this page is restricted to authenticated users
    { path: "/dashboard", component: Dashboard, meta: { requiresAuth: true } },
  ],
});
```

3. Create the login page:

This page will contain the "Login with Xenia" button. Unauthenticated users will be redirected back to this page.

File `login.vue`:

```html
<template>
  <h1>My App</h1>
  <button @click="login()">Login with Xenia</button>
</template>
```

```javascript
import { login } from "@xenia-sso/vue-plugin";
export default {
  setup() {
    return {
      login,
    };
  },
};
```

4. Create the dashboard page

This page will be only accessible to authenticated users. It contains info about current user, a button to perform authenticated calls to a webservice and a logout button.

```html
<template>
  <div>
    <h1>My App</h1>
    <button @click="logout()">Logout</button>
  </div>
  <div>Welcome back {{ currentUser.firstName }}</div>
  <button @click="testWebservice()">Test webservice</button>
</template>
```

```typescript
import { defineComponent } from "vue";
import { logout, call, useCurrentUser } from "@xenia-sso/vue-plugin";

export default defineComponent({
  setup() {
    const { currentUser } = useCurrentUser();

    const testWebservice = async () => {
      interface SomeWsRes {
        foo: string;
        bar: number;
      }

      try {
        const data = await call<SomeWsRes>("/some/ws", {
          /* fetch args */
        });
        console.log(data);
      } catch (e) {
        // ...
      }
    };

    return {
      currentUser,
      logout,
      testWebservice,
    };
  },
});
```
