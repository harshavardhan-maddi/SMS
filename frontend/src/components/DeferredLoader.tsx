import React, { useState, useEffect } from 'react';
import { ThreeDLoader } from './ThreeDLoader';

interface DeferredLoaderProps {
  loading: boolean;
  delay?: number;
  message?: string;
  isFullScreen?: boolean;
  children?: React.ReactNode;
}

export const DeferredLoader: React.FC<DeferredLoaderProps> = ({
  loading,
  delay = 400,
  message,
  isFullScreen = false,
  children
}) => {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    let timer: any;
    if (loading) {
      timer = setTimeout(() => {
        setShouldShow(true);
      }, delay);
    } else {
      setShouldShow(false);
    }
    return () => clearTimeout(timer);
  }, [loading, delay]);

  if (!loading) return null;

  if (shouldShow) {
    return <ThreeDLoader message={message} isFullScreen={isFullScreen} />;
  }

  // Render skeletons / fallback content during initial grace period
  return <>{children}</>;
};
