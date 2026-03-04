import React, { useState, useEffect, useRef } from 'react';

/**
 * ImageSkeleton - A component that shows a skeleton loader while an image is loading
 * Supports lazy loading and smooth transitions
 * 
 * @param {string} src - Image source URL
 * @param {string} alt - Alt text for the image
 * @param {string} className - Additional CSS classes
 * @param {object} style - Inline styles for the image
 * @param {string} fallbackSrc - Fallback image if main image fails to load
 
* @param {boolean} lazy - Enable lazy loading (default: true)
 * @param {string} skeletonType - Type of skeleton: 'circular', 'rounded', 'square' (default: 'rounded')
 * @param {function} onLoad - Callback when image loads
 * @param {function} onError - Callback when image fails to load
 */
const ImageSkeleton = ({
  src,
  alt = '',
  className = '',
  style = {},
  fallbackSrc = '/assets/images/demoUser.png',
  lazy = true,
  skeletonType = 'rounded',
  onLoad,
  onError,
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);
  const imgRef = useRef(null);
  const observerRef = useRef(null);

  // Get skeleton border radius based on type
  const getSkeletonRadius = () => {
    switch (skeletonType) {
      case 'circular':
        return '50%';
      case 'rounded':
        return '8px';
      case 'square':
        return '0';
      default:
        return '8px';
    }
  };

  // Handle image load
  const handleLoad = (e) => {
    setIsLoading(false);
    if (onLoad) onLoad(e);
  };

  // Handle image error
  const handleError = (e) => {
    if (imageSrc !== fallbackSrc) {
      setImageSrc(fallbackSrc);
      setHasError(true);
    } else {
      setIsLoading(false);
    }
    if (onError) onError(e);
  };

  // Set up intersection observer for lazy loading
  useEffect(() => {
    if (!lazy || !src) {
      setImageSrc(src);
      return;
    }

    // If IntersectionObserver is not supported, load immediately
    if (typeof IntersectionObserver === 'undefined') {
      setImageSrc(src);
      return;
    }

    // Create observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setImageSrc(src);
            if (observerRef.current && imgRef.current) {
              observerRef.current.unobserve(imgRef.current);
            }
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before image enters viewport
      }
    );

    // Observe the container
    if (imgRef.current) {
      observerRef.current.observe(imgRef.current);
    }

    return () => {
      if (observerRef.current && imgRef.current) {
        observerRef.current.unobserve(imgRef.current);
      }
    };
  }, [src, lazy]);

  // Reset loading state when src changes
  useEffect(() => {
    if (imageSrc && imageSrc !== fallbackSrc) {
      setIsLoading(true);
      setHasError(false);
    }
  }, [imageSrc]);

  return (
    <div
      ref={imgRef}
      className={`image-skeleton-container ${className}`}
      style={{
        position: 'relative',
        display: 'inline-block',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* Skeleton Loader */}
      {isLoading && (
        <div
          className="image-skeleton"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
            backgroundSize: '200% 100%',
            animation: 'skeleton-loading 1.5s ease-in-out infinite',
            borderRadius: getSkeletonRadius(),
            zIndex: 1,
          }}
        />
      )}

      {/* Actual Image */}
      {imageSrc && (
        <img
          src={imageSrc}
          alt={alt}
          className={`image-skeleton-img ${isLoading ? 'image-loading' : 'image-loaded'}`}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: isLoading ? 0 : 1,
            transition: 'opacity 0.3s ease-in-out',
            borderRadius: getSkeletonRadius(),
            display: 'block',
            ...style,
          }}
          onLoad={handleLoad}
          onError={handleError}
          loading={lazy ? 'lazy' : 'eager'}
          {...props}
        />
      )}

      <style jsx>{`
        @keyframes skeleton-loading {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
        .image-loading {
          opacity: 0;
        }
        .image-loaded {
          opacity: 1;
        }
      `}</style>
    </div>
  );
};

export default ImageSkeleton;
