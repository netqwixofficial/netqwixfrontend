import { useEffect } from "react";
import { useRouter } from "next/router";
import { AccountType, LOCAL_STORAGE_KEYS, routingPaths } from "../../common/constants";
import { useAppDispatch, useAppSelector } from "../../store";
import { authAction, authState, getMeAsync } from "./auth.slice";
import { getAvailability } from "../calendar/calendar.api";
import { 
  guardRoute, 
  getUnauthenticatedRedirect, 
  getAuthenticatedRedirect,
  checkAuth,
  getUserRole as getStoredUserRole
} from "../../utils/routeGuards";
import { ROUTES } from "../../config/routes.config";

const AuthGuard = ({ children }) => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isUserLoggedIn, isRedirectToDashboard, selectedDate, selectedTrainerId, userInfo, userPaymentDetails } = useAppSelector(authState);
  const path = router.asPath;
  const pathName = router.pathname;
  const authSelector = useAppSelector(authState);

  // Handle Google registration redirect
  useEffect(() => {
    if (authSelector.showGoogleRegistrationForm.isFromGoogle) {
      router.push(routingPaths.signUp);
    }
  }, [authSelector.showGoogleRegistrationForm]);

  // Main route guard logic
  useEffect(() => {
    const checkRouteAccess = async () => {
      const isTokenExists = checkAuth();
      const userRole = getStoredUserRole() || (userInfo?.account_type);

      if (isTokenExists) {
        // User is authenticated
        if (!isUserLoggedIn) {
          // Fetch user data if not loaded
          await dispatch(getMeAsync());
        }

        // Special handling for meeting route - don't redirect away from it
        if (pathName === ROUTES.MEETING.path || pathName === '/meeting') {
          // Allow meeting route to proceed without redirect checks
          return;
        }

        // Check if route should redirect authenticated users away (only for auth/landing pages)
        const routeGuard = guardRoute(pathName, { userRole });
        
        // Only redirect if route explicitly says to redirect authenticated users
        // This prevents breaking existing functionality
        if (!routeGuard.allowed && routeGuard.reason && routeGuard.reason.includes('redirected from public route')) {
          const redirectPath = getAuthenticatedRedirect(pathName, userRole);
          if (redirectPath !== pathName && redirectPath !== path) {
            router.push(redirectPath);
            return;
          }
        }

        // Handle dashboard redirect logic (existing functionality)
        if (isRedirectToDashboard) {
          if (pathName !== ROUTES.MEETING.path && pathName !== '/meeting') {
            // Redirect authenticated users to dashboard home route
            router.push('/dashboard/home');
          }
        } else {
          dispatch(authAction.updateIsAuthModalOpen(false));
          dispatch(authAction.updateIsRedirectToDashboard(true));
        }
      } else {
        // User is not authenticated
        // Only check route access for protected routes
        const routeGuard = guardRoute(pathName, { userRole: null });
        
        // Only redirect if trying to access a protected route
        if (!routeGuard.allowed && routeGuard.reason && routeGuard.reason.includes('Authentication required')) {
          const redirectPath = getUnauthenticatedRedirect(pathName);
          if (redirectPath !== pathName && redirectPath !== path) {
            router.push(redirectPath);
            return;
          }
        } else {
          // Allow access to public routes (existing functionality)
          handlePublicRoutes(pathName, path, router);
        }
      }
    };

    checkRouteAccess();
  }, [isUserLoggedIn, path, pathName, isRedirectToDashboard, userInfo]);

  // Show loading state while checking route access (optional - can be removed if not needed)
  // if (isChecking) {
  //   return null; // Or return a loading component
  // }

  return children;
};

/**
 * Handle public routes - legacy function for backward compatibility
 * This preserves the original behavior to ensure no breaking changes
 * @param {string} pathName - Route pathname
 * @param {string} path - Full route path
 * @param {Object} router - Next.js router instance
 */
export const handlePublicRoutes = (pathName, path, router) => {
  // Preserve original logic for backward compatibility
  if (pathName === routingPaths.signUp || pathName === routingPaths.signIn) {
    // Allow access to sign up/sign in pages
    // Don't redirect - let the page render
    return;
  } else if (pathName === routingPaths.forgetPassword) {
    // Allow access to forget password page
    return;
  } else if (pathName === routingPaths.verifiedForgetPassword || pathName === routingPaths.landing) {
    // Allow access to verified forget password and landing pages
    return;
  } else {
    // For any other route that's not explicitly public, check if it's protected
    const routeGuard = guardRoute(pathName, { userRole: null });
    
    // Only redirect if it's a protected route and user is not authenticated
    if (!routeGuard.allowed && routeGuard.reason && routeGuard.reason.includes('Authentication required')) {
      // Redirect to landing only if trying to access a protected route
      router.push(routingPaths.landing);
    }
    // Otherwise, allow the route to proceed (might be a public route not in our config)
  }
};

export default AuthGuard;
