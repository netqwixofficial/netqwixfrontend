import { useEffect } from "react";
import { useRouter } from "next/router";
import {
  LOCAL_STORAGE_KEYS,
  routingPaths,
} from "../../common/constants";
import { useAppDispatch, useAppSelector } from "../../store";
import { authAction, authState, getMeAsync } from "./auth.slice";
import { bookingsAction } from "../common/common.slice";

const AuthGuard = ({ children }) => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const {
    isUserLoggedIn,
    isRedirectToDashboard,
    showGoogleRegistrationForm,
    authResolved,
  } = useAppSelector(authState);
  const path = router.asPath;
  const pathName = router.pathname;
  const { handleLoading } = bookingsAction;

  // Preserve Google registration redirect behaviour
  useEffect(() => {
    if (showGoogleRegistrationForm.isFromGoogle) {
      router.push(routingPaths.signUp);
    }
  }, [showGoogleRegistrationForm, router]);

  // Bootstrap auth on first mount / refresh
  useEffect(() => {
    let cancelled = false;

    const bootstrapAuth = async () => {
      // Show global loader
      dispatch(handleLoading(true));

      try {
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN)
            : null;

        if (token) {
          try {
            await dispatch(getMeAsync()).unwrap();
          } catch (err) {
            // If token is invalid, clear it and treat as logged out
            if (typeof window !== "undefined") {
              localStorage.removeItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN);
              localStorage.removeItem(LOCAL_STORAGE_KEYS.ACC_TYPE);
            }
            handlePublicRoutes(pathName, path, router);
            dispatch(authAction.setAuthResolved(true));
          }
        } else {
          // No token – resolve auth and route to appropriate public page
          handlePublicRoutes(pathName, path, router);
          dispatch(authAction.setAuthResolved(true));
        }
      } finally {
        if (!cancelled) {
          dispatch(handleLoading(false));
        }
      }
    };

    if (!authResolved) {
      bootstrapAuth();
    }

    return () => {
      cancelled = true;
    };
  }, [authResolved, dispatch, path, pathName, router, handleLoading]);

  // Preserve existing redirect-to-dashboard behaviour once auth is resolved
  useEffect(() => {
    if (!authResolved) return;
    if (!isUserLoggedIn) return;
    if (!isRedirectToDashboard) return;
    if (pathName === "/meeting") return;

    router.push(routingPaths.dashboard);
    dispatch(authAction.updateIsRedirectToDashboard(true));
  }, [authResolved, isUserLoggedIn, isRedirectToDashboard, pathName, router, dispatch]);

  // Do not render any routes until auth has been resolved
  if (!authResolved) {
    return null;
  }

  return children;
};

export const handlePublicRoutes = (pathName, path, router) => {
  if (pathName === routingPaths.signUp || pathName === routingPaths.signIn ) {
    router.push(path);
  } else if (pathName === routingPaths.forgetPassword) {
    router.push(path);
  } else if (pathName === routingPaths.verifiedForgetPassword || pathName === routingPaths.landing) {
    router.push(path);
  } else {
    router.push(routingPaths.landing);
  }
};

export default AuthGuard;
