import { useState, useRef, useEffect } from "react";

/**
 * Lazy Loading Image Component
 * Uses Intersection Observer for efficient loading
 */
export default function LazyImage({
  src,
  alt,
  className = "",
  placeholderSrc = null,
  onError,
  ...props
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "100px", // Start loading 100px before visible
        threshold: 0.01,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = (e) => {
    setError(true);
    if (onError) onError(e);
  };

  // Placeholder gradient
  const placeholderStyle = {
    background: "linear-gradient(135deg, var(--gray-200) 0%, var(--gray-100) 100%)",
  };

  return (
    <div
      ref={imgRef}
      className={`lazy-image-wrapper ${className}`}
      style={{ position: "relative", overflow: "hidden" }}
    >
      {/* Placeholder */}
      {!isLoaded && !error && (
        <div
          className="lazy-image-placeholder"
          style={{
            ...placeholderStyle,
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {placeholderSrc ? (
            <img
              src={placeholderSrc}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(10px)" }}
            />
          ) : (
            <span style={{ fontSize: "2rem", opacity: 0.3 }}>🖼️</span>
          )}
        </div>
      )}

      {/* Actual Image */}
      {isInView && !error && (
        <img
          src={src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          style={{
            opacity: isLoaded ? 1 : 0,
            transition: "opacity 0.3s ease",
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
          {...props}
        />
      )}

      {/* Error State */}
      {error && (
        <div
          className="lazy-image-error"
          style={{
            ...placeholderStyle,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
          }}
        >
          <span style={{ fontSize: "1.5rem", opacity: 0.5 }}>⚠️</span>
        </div>
      )}
    </div>
  );
}
