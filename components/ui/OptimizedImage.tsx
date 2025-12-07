'use client'

import Image, { type ImageProps } from 'next/image'
import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface OptimizedImageProps extends Omit<ImageProps, 'onLoad' | 'onError'> {
  /** Enable blur placeholder effect */
  blurPlaceholder?: boolean
  /** Custom blur data URL - if not provided, uses a default gray blur */
  blurDataURL?: string
  /** Fallback image URL if the main image fails to load */
  fallbackSrc?: string
  /** Additional wrapper class names */
  wrapperClassName?: string
  /** Show loading skeleton while image loads */
  showSkeleton?: boolean
  /** Aspect ratio for the container (e.g., "16/9", "1/1", "4/3") */
  aspectRatio?: string
}

// Default blur placeholder - a simple gray blur
const DEFAULT_BLUR_DATA_URL =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAUH/8QAIhAAAgEDBAIDAAAAAAAAAAAAAQIDAAQRBQYSITFBYXGR/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAZEQEAAwEBAAAAAAAAAAAAAAABAAIDESH/2gAMAwEAAhEDEEA/AJW3Nyy6dFFbXklusRPIRYVdgCf0E/vv0K0qPbWlpKkqWVujo4ZWEYBBHYIPsUqVLVYFN1Lb/9k='

// Skeleton component for loading state
function ImageSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse bg-gray-200 rounded',
        className
      )}
    />
  )
}

/**
 * OptimizedImage Component
 *
 * A wrapper around next/image with performance optimizations:
 * - Blur placeholder support for smoother loading
 * - Lazy loading by default (Next.js default)
 * - Error handling with fallback images
 * - Loading skeleton support
 * - Proper sizing with aspect ratio support
 *
 * @example
 * ```tsx
 * <OptimizedImage
 *   src="/product.jpg"
 *   alt="Product"
 *   width={300}
 *   height={300}
 *   blurPlaceholder
 *   showSkeleton
 * />
 * ```
 */
export function OptimizedImage({
  src,
  alt,
  blurPlaceholder = true,
  blurDataURL,
  fallbackSrc = '/placeholder-image.png',
  wrapperClassName,
  showSkeleton = false,
  aspectRatio,
  className,
  priority = false,
  loading,
  fill,
  sizes,
  quality = 75,
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [currentSrc, setCurrentSrc] = useState(src)

  const handleLoad = useCallback(() => {
    setIsLoading(false)
  }, [])

  const handleError = useCallback(() => {
    setHasError(true)
    setIsLoading(false)
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc)
      setHasError(false)
      setIsLoading(true)
    }
  }, [fallbackSrc, currentSrc])

  // Determine placeholder settings
  const placeholderProps = blurPlaceholder
    ? {
        placeholder: 'blur' as const,
        blurDataURL: blurDataURL || DEFAULT_BLUR_DATA_URL,
      }
    : {}

  // Determine loading strategy
  // Priority images should not be lazy loaded
  const loadingProp = priority ? undefined : (loading || 'lazy')

  // Calculate sizes for responsive images if not provided
  const defaultSizes = fill
    ? '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
    : undefined

  // Wrapper styles for aspect ratio support
  const wrapperStyle = aspectRatio
    ? { aspectRatio, position: 'relative' as const }
    : undefined

  const imageContent = (
    <Image
      src={currentSrc}
      alt={alt}
      className={cn(
        'transition-opacity duration-300',
        isLoading && showSkeleton ? 'opacity-0' : 'opacity-100',
        className
      )}
      priority={priority}
      loading={loadingProp}
      fill={fill}
      sizes={sizes || defaultSizes}
      quality={quality}
      onLoad={handleLoad}
      onError={handleError}
      {...placeholderProps}
      {...props}
    />
  )

  // If using aspect ratio or fill, wrap in a container
  if (aspectRatio || fill || showSkeleton) {
    return (
      <div
        className={cn('relative overflow-hidden', wrapperClassName)}
        style={wrapperStyle}
      >
        {showSkeleton && isLoading && (
          <ImageSkeleton className="absolute inset-0 w-full h-full" />
        )}
        {imageContent}
      </div>
    )
  }

  return imageContent
}

/**
 * ProductImage Component
 *
 * Pre-configured OptimizedImage for product images with common settings
 */
export function ProductImage({
  src,
  alt,
  size = 'medium',
  className,
  ...props
}: Omit<OptimizedImageProps, 'width' | 'height'> & {
  size?: 'small' | 'medium' | 'large' | 'thumbnail'
}) {
  const sizeMap = {
    thumbnail: { width: 64, height: 64 },
    small: { width: 120, height: 120 },
    medium: { width: 200, height: 200 },
    large: { width: 400, height: 400 },
  }

  const { width, height } = sizeMap[size]

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={width}
      height={height}
      blurPlaceholder
      showSkeleton
      className={cn('rounded-lg object-cover', className)}
      {...props}
    />
  )
}

/**
 * AvatarImage Component
 *
 * Pre-configured OptimizedImage for user avatars
 */
export function AvatarImage({
  src,
  alt = 'Avatar',
  size = 40,
  className,
  ...props
}: Omit<OptimizedImageProps, 'width' | 'height'> & {
  size?: number
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      blurPlaceholder
      className={cn('rounded-full object-cover', className)}
      fallbackSrc="/default-avatar.png"
      {...props}
    />
  )
}

export default OptimizedImage
