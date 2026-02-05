import React, { useState, useEffect, Fragment } from "react";
import "node_modules/react-image-gallery/styles/scss/image-gallery.scss";
import Head from "next/head";
import { useRouter } from "next/router";
import "../public/assets/scss/color.scss";
import { ToastContainer } from "react-toastify";
import ChatContextProvider from "../helpers/chatContext/chatCtx";
import CustomizerContextProvider from "../helpers/customizerContext/customizerCtx";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Provider } from "react-redux";
import store from "../app/store";
import AuthGuard, {
  handlePublicRoutes,
} from "../app/components/auth/AuthGuard";
import { SocketProvider } from "../app/components/socket/SocketProvider";
import InstantLessonProvider from "../app/components/instant-lesson/InstantLessonProvider";
import ErrorBoundary from "../app/components/common/ErrorBoundary";
import { LOCAL_STORAGE_KEYS, routingPaths } from "../app/common/constants";
import { bookingsAction } from "../app/components/common/common.slice";
import UniversalLoader from "../app/common/UniversalLoader";
import Script from "next/script";
import { getMe } from "../app/components/auth/auth.api";
import trackerAssist from '@openreplay/tracker-assist';
import Tracker from '@openreplay/tracker';
import { SpeedInsights } from "@vercel/speed-insights/next";


export default function MyAppComponent({ Component, pageProps }) {
  const router = useRouter();
  const path = router.asPath;
  const pathName = router.pathname;
  const [currentUser, setCurrentUser] = useState(undefined);
  let componentMounted = true;
  const { handleLoading } = bookingsAction;

  // Initialize OpenReplay tracker
  const initializeTracker = async () => {
    try {
      // Check if project key is available
      const projectKey = process.env.NEXT_PUBLIC_OPENREPLAY_PROJECT_KEY;
      if (!projectKey || typeof projectKey !== 'string' || projectKey.trim() === '') {
        // Silently skip tracker initialization if project key is missing
        if (process.env.NODE_ENV === 'development') {
          console.warn('[OpenReplay] Project key is missing. Skipping tracker initialization.');
        }
        return;
      }

      const token = localStorage.getItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN);
      if (token) {
        const userResponse = await getMe();
        const userInfo = userResponse.userInfo;
        
        if (userInfo && userInfo._id) {
           
           
          
          const newTracker = new Tracker({
            projectKey: projectKey,
            ingestPoint: "https://analytics.netqwix.com/ingest",
            // Enable comprehensive tracking
            captureIFrames: true,
            captureCanvas: true,
            captureCrossOriginIframes: true,
            respectDoNotTrack: false,
            // Network tracking
            captureNetworkRequests: true,
            captureNetworkResponses: true,
            captureNetworkHeaders: true,
            // Media tracking
            captureMedia: true,
            captureVideo: true,
            captureAudio: true,
            // DOM tracking
            captureDOM: true,
            captureCSS: true,
            captureStyles: true,
            // Performance tracking
            capturePerformance: true,
            captureMemory: true,
            captureErrors: true,
            captureConsole: true,
            // User interactions
            captureMouse: true,
            captureKeyboard: true,
            captureTouch: true,
            captureScroll: true,
            captureFocus: true,
            captureBlur: true,
            // File tracking
            captureFiles: true,
            captureImages: true,
            captureFonts: true,
            // Advanced features
            captureWebGL: true,
            captureWebWorkers: true,
            captureServiceWorkers: true,
            captureWebSockets: true,
            captureWebRTC: true,
            // Privacy and performance
            maskTextInputs: false,
            maskAllInputs: false,
            blockClass: 'openreplay-block',
            blockSelector: null,
            ignoreClass: 'openreplay-ignore',
            // Session recording
            recordCanvas: true,
            recordCrossOriginIframes: true,
            // Custom settings
            enableStrictMode: false,
            enableInjection: true,
            enableCompression: true,
            enableCache: true,
            // Timeouts
            networkTimeout: 10000,
            sessionTimeout: 3600000, // 1 hour
            // Sampling
            sampling: 100, // 100% of sessions
            // Debug mode
            debug: process.env.NODE_ENV === 'development',

            network:{
              capturePayload: true,
              captureHeaders: true,
              captureResponseHeaders: true,
              captureResponsePayload: true,
              captureRequestHeaders: true,
              captureRequestPayload: true,
              captureResponseStatus: true,
              captureResponseTime: true,
              captureRequestTime: true,
              captureRequestStatus: true,
            }
          });
          
          // Add comprehensive plugins
          try {
            newTracker.use(trackerAssist());
          } catch (pluginError) {
            if (process.env.NODE_ENV === 'development') {
              console.warn('[OpenReplay] Failed to load tracker assist plugin:', pluginError);
            }
          }
          
          try {
            newTracker.start();
            newTracker.setUserID(userInfo.email);
            newTracker.setMetadata(userInfo.email, userInfo.account_type || localStorage.getItem(LOCAL_STORAGE_KEYS.ACC_TYPE));
            
            // Set additional tracking properties using setMetadata
            newTracker.setMetadata("userAgent", navigator.userAgent);
            newTracker.setMetadata("screenResolution", `${screen.width}x${screen.height}`);
            newTracker.setMetadata("viewport", `${window.innerWidth}x${window.innerHeight}`);
            newTracker.setMetadata("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone);
            newTracker.setMetadata("language", navigator.language);
            newTracker.setMetadata("platform", navigator.platform);
            newTracker.setMetadata("cookieEnabled", navigator.cookieEnabled.toString());
            newTracker.setMetadata("onLine", navigator.onLine.toString());
            
            if (navigator.connection) {
              newTracker.setMetadata("connectionEffectiveType", navigator.connection.effectiveType);
              newTracker.setMetadata("connectionDownlink", navigator.connection.downlink.toString());
              newTracker.setMetadata("connectionRtt", navigator.connection.rtt.toString());
            }
            
            // Track performance metrics
            if ('performance' in window) {
              const perfData = performance.getEntriesByType('navigation')[0];
              if (perfData) {
                newTracker.setMetadata("pageLoadTime", (perfData.loadEventEnd - perfData.loadEventStart).toString());
                newTracker.setMetadata("domContentLoaded", (perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart).toString());
                
                const firstPaint = performance.getEntriesByName('first-paint')[0];
                if (firstPaint) {
                  newTracker.setMetadata("firstPaint", firstPaint.startTime.toString());
                }
                
                const firstContentfulPaint = performance.getEntriesByName('first-contentful-paint')[0];
                if (firstContentfulPaint) {
                  newTracker.setMetadata("firstContentfulPaint", firstContentfulPaint.startTime.toString());
                }
              }
            }
          } catch (startError) {
            // Handle errors gracefully - don't crash the app if tracker fails
            if (process.env.NODE_ENV === 'development') {
              console.warn('[OpenReplay] Failed to start tracker:', startError);
            }
            return; // Exit early if tracker fails to start
          }
          
           
        } else {
           
        }
      } else {
         
      }
    } catch (error) {
      console.error("Error initializing tracker:", error);
    }
  };

  useEffect(() => {
    document.body.classList.add("sidebar-active");
    let localStorageUser = localStorage.getItem("email");
    // get all details about authenticate login users
    if (currentUser === undefined) {
      if(pathName !== "/meeting"){
        handlePublicRoutes(pathName, path, router);
      }
    } else {
      setCurrentUser(localStorageUser);
    }

    // Initialize tracker when component mounts
    initializeTracker();

    // if (currentUser !== null) {
    //   router.push("/"); // you can get login user
    // } else {
    //    

    //   handlePublicRoutes(pathName, path, router);
    // }
    // Page Loader - control global loader via Redux
    setTimeout(() => {
      store.dispatch(handleLoading(false));
    }, 1500);

    return () => {
      // This code runs when component is unmounted
      componentMounted = false; // (4) set it to false if we leave the page
    };
  }, [currentUser]);


  return (
    <Fragment>
       <Script
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/sfxnljmqst";
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "sfxnljmqst");
          `,
        }}
      />
      <GoogleOAuthProvider clientId={process?.env?.NEXT_PUBLIC_GOOGLE_CLIENT_ID}>
        <Head>
          <meta httpEquiv="content-type" content="text/html; charset=UTF-8" />

          {/* <meta http-equiv="Content-Security-Policy" content="default-src *; img-src * 'self' data: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' *; style-src  'self' 'unsafe-inline' *" /> */}
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="description" content="Netquix" />
          <meta name="keywords" content="Netquix" />
          <meta name="author" content="Netquix" />
          <link rel="icon" href="/favicon.png" />
          <link rel="shortcut icon" href="/favicon.png" />
          <link rel="stylesheet" href="path/to/custom.css" />
          <title>Qwick Lessons Over the Net</title>
        </Head>
        <Provider store={store}>
          <ErrorBoundary>
            <AuthGuard>
              <SocketProvider>
                <UniversalLoader />
                <div>
                  <CustomizerContextProvider>
                    <ChatContextProvider>
                      <Component {...pageProps} />
                      {/* Global instant lesson request handler */}
                      <InstantLessonProvider />
                      <SpeedInsights />
                    </ChatContextProvider>
                  </CustomizerContextProvider>
                  <ToastContainer
                    autoClose={3000}
                    closeButton
                    pauseOnHover
                    pauseOnFocusLoss
                    newestOnTop
                    draggable
                  />
                </div>
              </SocketProvider>
            </AuthGuard>
          </ErrorBoundary>
        </Provider>
      </GoogleOAuthProvider>
    </Fragment>
  );
}
