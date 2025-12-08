import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { analyticsService } from "../api";

// Generate unique session ID
const getSessionId = () => {
  let sessionId = sessionStorage.getItem("analytics_session_id");
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem("analytics_session_id", sessionId);
  }
  return sessionId;
};

const AnalyticsTracker = () => {
  const location = useLocation();
  const startTime = useRef(Date.now());
  const scrollDepth = useRef(0);

  // Track scroll depth
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;
      scrollDepth.current = Math.max(scrollDepth.current, scrollPercent);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Track page views
  useEffect(() => {
    // Reset tracking for new page
    startTime.current = Date.now();
    scrollDepth.current = 0;

    // Get post ID if on post detail page
    const postMatch = location.pathname.match(/\/post\/([^/]+)/);
    const postSlug = postMatch ? postMatch[1] : null;

    // Track page view after short delay to avoid tracking rapid navigation
    const trackTimeout = setTimeout(async () => {
      try {
        await analyticsService.track({
          path: location.pathname,
          postSlug,
          sessionId: getSessionId(),
        });
      } catch (error) {
        // Silently fail - analytics shouldn't break the app
        console.debug("Analytics tracking failed:", error);
      }
    }, 1000);

    // Track engagement when leaving page
    const trackEngagement = async () => {
      const duration = Math.round((Date.now() - startTime.current) / 1000);
      
      // Only track if user spent more than 5 seconds on the page
      if (duration > 5) {
        try {
          await analyticsService.track({
            path: location.pathname,
            postSlug,
            sessionId: getSessionId(),
            duration,
            scrollDepth: scrollDepth.current,
          });
        } catch (error) {
          console.debug("Engagement tracking failed:", error);
        }
      }
    };

    // Track engagement on page leave
    const handleBeforeUnload = () => trackEngagement();
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearTimeout(trackTimeout);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // Track engagement when navigating to a new page
      trackEngagement();
    };
  }, [location.pathname]);

  return null; // This component doesn't render anything
};

export default AnalyticsTracker;
