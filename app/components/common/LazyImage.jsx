import React, { useState, useEffect, useRef } from 'react';
import ImageSkeleton from './ImageSkeleton';

/**
 * LazyImage - Enhanced image component with lazy loading and skeleton loader
 * Uses Next.js Image component when available, falls back to native img with lazy loading
 * 
 * @param {string} src - Image source URL
 * @param {string} alt - Alt text for the image
 * @param {string} className - Additional CSS classes
 * @param {object} style - Inline styles for the image
 * @param {string} fallbackSrc - Fallback image if main image fails to load
 * @param {boolean} lazy - Enable lazy loading (default: true)
 * @param {string} skeletonType - Type of skeleton: 'circular', 'rounded', 'square' (default: 'rounded')
 * @param {number} width - Image width (for Next.js Image optimization)
 * @param {number} height - Image height (for Next.js Image optimization)
 * @param {boolean} useNextImage - Use Next.js Image component (default: false for compatibility)
 * @param {function} onLoad - Callback when image loads
 * @param {function} onError - Callback when image fails to load
 * @param {object} ...props - Additional props to pass to image element
 */
const LazyImage = ({
  src,
  alt = '',
  className = '',
  style = {},
  fallbackSrc = '/assets/images/demoUser.png',
  lazy = true,
  skeletonType = 'rounded',
  width,
  height,
  useNextImage = false,
  onLoad,
  onError,
  ...props
}) => {
  const [useNextImageComponent, setUseNextImageComponent] = useState(useNextImage);

  // Check if Next.js Image is available
  useEffect(() => {
    try {
      // Try to dynamically import Next.js Image
      if (useNextImage && typeof window !== 'undefined') {
        import('next/image').then(() => {
          setUseNextImageComponent(true);
        }).catch(() => {
          setUseNextImageComponent(false);
        });
      }
    } catch (error) {
      setUseNextImageComponent(false);
    }
  }, [useNextImage]);

  // If Next.js Image is requested and available, use it
  if (useNextImageComponent && width && height) {
    try {
      const NextImage = require('next/image').default;
      return (
        <div style={{ position: 'relative', width: '100%', height: '100%', ...style }}>
          <ImageSkeleton
            src={src}
            alt={alt}
            className={className}
            skeletonType={skeletonType}
            fallbackSrc={fallbackSrc}
            lazy={lazy}
            onLoad={onLoad}
            onError={onError}
            style={{ width: '100%', height: '100%' }}
            {...props}
          />
        </div>
      );
    } catch (error) {
      // Fallback to ImageSkeleton if Next.js Image fails
    }
  }

  // Default: Use ImageSkeleton component
  return (
    <ImageSkeleton
      src={src}
      alt={alt}
      className={className}
      style={style}
      fallbackSrc={fallbackSrc}
      lazy={lazy}
      skeletonType={skeletonType}
      onLoad={onLoad}
      onError={onError}
      {...props}
    />
  );
};

export default LazyImage;
