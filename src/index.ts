import { Router, RouteLocationRaw, RouteLocationNormalized, NavigationGuardNext } from "vue-router";
import { CallError, UNAUTHORIZED_STATUS, api } from "./api";
import { useCurrentUser, silentLogin } from "./current-user";

interface Options {
  clientBackendBaseUrl?: string;
  oauth2: OAuth2Options;
  router: Router;
  routesAuth?: RouteAuthOptions;
}

interface OAuth2Options {
  loginPageUrl: string;
  clientId: string;
  redirectUri?: string;
}

interface RouteAuthOptions {
  authFlagKey?: string;
  unauthorizedRedirectRoute?: RouteLocationRaw;
  postLoginRedirectRoute?: RouteLocationRaw;
  postLogoutRedirectRoute?: RouteLocationRaw;
  loginErrorRedirectRoute?: RouteLocationRaw;
}

const { currentUser, onCurrentUserChange } = useCurrentUser();

let pluginOptions: Options;
export default {
  install: (app: any, options: Options) => {
    pluginOptions = options;

    if (options.clientBackendBaseUrl) {
      api.setBaseUrl(options.clientBackendBaseUrl);
    }

    options.router.addRoute({
      path: "/logout",
      component: () => {},
      beforeEnter: async (to, from, next) => {
        try {
          await api.logout();
          currentUser.value = undefined;
          next(options.routesAuth?.postLogoutRedirectRoute || "/auth/profile");
        } catch (e) {
          if (!(e instanceof CallError)) {
            next("/");
            return;
          }

          if (e.status === UNAUTHORIZED_STATUS) {
            next(from);
            return;
          }

          next("/");
        }
      },
    });

    options.router.addRoute({
      path: "/oauth2/cb",
      component: () => {},
      beforeEnter: async (to, from, next) => {
        const error = to.query.error as string;
        const code = to.query.code as string;
        const codeChallenge = to.query.code_challenge as string;

        if (error) {
          const url = options.routesAuth?.loginErrorRedirectRoute || "/auth-error";
          next(`${url.toString()}?error=${encodeURIComponent(error)}`);
          return;
        }

        try {
          const { currentUser } = useCurrentUser();
          currentUser.value = await api.loginUsingAuthCode(code, codeChallenge);
          next(options.routesAuth?.postLoginRedirectRoute || "/auth/profile");
        } catch {
          next("/");
        }
      },
    });

    options.router.beforeEach(
      (to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext) => {
        if (!to.meta) {
          next();
          return;
        }

        if (!to.meta[options.routesAuth?.authFlagKey || "requiresAuth"]) {
          next();
          return;
        }

        if (!currentUser.value) {
          const url = options.routesAuth?.unauthorizedRedirectRoute || "/";
          next(`${url.toString()}?redirect=${btoa(to.fullPath)}`);
          return;
        }

        next();
      }
    );

    onCurrentUserChange((user) => {
      if (user) {
        const redirectBase64QueryParam = options.router.currentRoute.value.query.redirect as string;
        if (!redirectBase64QueryParam) {
          if (!options.router.currentRoute.value.meta?.[options.routesAuth?.authFlagKey || "requiresAuth"]) {
            return;
          }
          void options.router.push(options.routesAuth?.postLoginRedirectRoute || "/auth/profile");
          return;
        }
        void options.router.push(atob(redirectBase64QueryParam));
      } else {
        void options.router.push(options.routesAuth?.postLogoutRedirectRoute || "/login");
      }
    });

    void api.onCannotRefreshToken(() => {
      if (currentUser.value) {
        currentUser.value = undefined;
      }
    });

    silentLogin().catch(() => {});
  },
};

const loginUsingSSO = async () => {
  const { codeChallenge } = await api.call<{ codeChallenge: string }>("/oauth2/code-challenge", {
    method: "POST",
  });

  const url =
    pluginOptions.oauth2.loginPageUrl +
    "?" +
    "response_type=code&" +
    "scope=openid&" +
    "code_challenge_method=S256&" +
    "redirect_uri=" +
    encodeURIComponent(pluginOptions.oauth2.redirectUri || `${window.location.origin}/#/oauth2/cb`) +
    "&" +
    "client_id=" +
    encodeURIComponent(pluginOptions.oauth2.clientId) +
    "&" +
    "code_challenge=" +
    encodeURIComponent(codeChallenge);

  window.location.replace(url);
};

const call = api.call;

export { call, loginUsingSSO, useCurrentUser };
