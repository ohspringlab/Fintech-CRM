import { useEffect, useState } from "react";
import { opsApi } from "@/lib/api";
import { AvatarImage } from "@/components/ui/avatar";

interface UserAvatarImageProps {
  userId: string;
}

export function UserAvatarImage({ userId }: UserAvatarImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserImage = async () => {
      try {
        if (!userId) {
          setIsLoading(false);
          return;
        }
        
        // Fetch user image from backend API
        const response = await opsApi.getUserImage(userId);
        
        if (response?.imageUrl) {
          setImageUrl(response.imageUrl);
        }
      } catch (error: any) {
        // Log error for debugging
        console.error("UserAvatarImage: Failed to fetch user image:", {
          userId,
          error: error.message,
          status: error.status
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserImage();
  }, [userId]);

  // Always render AvatarImage if we have an imageUrl
  // The AvatarFallback will automatically show if the image fails to load
  if (!imageUrl) return null;

  return <AvatarImage src={imageUrl} alt="User" onError={() => setImageUrl(null)} />;
}

