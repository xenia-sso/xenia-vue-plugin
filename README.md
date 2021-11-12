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

## Configuration

```javascript
import xenia from "xenia-vue-plugin";

app.use(xenia, {
  // Client back-end base URL
  clientBackendBaseUrl: "http://localhost:3001/api",
  // OAuth2 authorization code flow configuration
  oauth2: {
    // Authentication server login page URL
    loginPageUrl: "http://localhost:3000/#/oauth2/login",
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

## Usage

```typescript
import { defineComponent } from "vue";
import { login, logout, call, useCurrentUser } from "xenia-vue-plugin";

export default defineComponent({
  setup() {
    const { currentUser } = useCurrentUser();

    const someMethod = async () => {
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
      login,
      logout,
    };
  },
});
```
