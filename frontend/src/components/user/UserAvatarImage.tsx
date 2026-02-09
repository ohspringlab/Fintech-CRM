import { useEffect, useState } from "react";
import { opsApi } from "@/lib/api";
import { AvatarImage } from "@/components/ui/avatar";

interface UserAvatarImageProps {
  userId: string;
  refreshKey?: number | string; // Add refresh key to force re-fetch
}

export function UserAvatarImage({ userId, refreshKey }: UserAvatarImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchUserImage = async () => {
    try {
      if (!userId) {
        setIsLoading(false);
        return;
      }
      
      // Fetch user image from backend API
      const response = await opsApi.getUserImage(userId);
      
      if (response?.imageUrl) {
        // Construct full URL with cache-busting
        const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001';
        const fullUrl = response.imageUrl.startsWith('http') 
          ? response.imageUrl 
          : `${baseUrl}${response.imageUrl}`;
        
        // Add cache-busting query parameter
        const separator = fullUrl.includes('?') ? '&' : '?';
        const urlWithCache = `${fullUrl}${separator}t=${Date.now()}`;
        
        setImageUrl(urlWithCache);
      } else {
        setImageUrl(null);
      }
    } catch (error: any) {
      // Log error for debugging
      console.error("UserAvatarImage: Failed to fetch user image:", {
        userId,
        error: error.message,
        status: error.status
      });
      setImageUrl(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserImage();
  }, [userId, refreshKey, refreshTrigger]); // Add refreshTrigger to dependencies

  // Listen for profile image update events
  useEffect(() => {
    const handleImageUpdate = (event: CustomEvent) => {
      if (event.detail?.userId === userId) {
        // Force refresh by updating trigger
        setRefreshTrigger(prev => prev + 1);
      }
    };

    window.addEventListener('profileImageUpdated', handleImageUpdate as EventListener);
    return () => {
      window.removeEventListener('profileImageUpdated', handleImageUpdate as EventListener);
    };
  }, [userId]);

  // Always render AvatarImage if we have an imageUrl
  // The AvatarFallback will automatically show if the image fails to load
  if (!imageUrl) return null;

  return <AvatarImage src={imageUrl} alt="User" onError={() => setImageUrl(null)} />;
}

