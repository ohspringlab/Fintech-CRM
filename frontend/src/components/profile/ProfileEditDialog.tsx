import { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { profileApi, Profile } from "@/lib/api";
import { toast } from "sonner";
import { User, Phone, MapPin, Building2, Calendar, Briefcase, DollarSign } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ProfileEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

export function ProfileEditDialog({ open, onOpenChange, onUpdate }: ProfileEditDialogProps) {
  const { user: clerkUser } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    dateOfBirth: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    zipCode: "",
    employmentStatus: "",
    annualIncome: "",
  });

  // Load profile data when dialog opens
  useEffect(() => {
    if (open) {
      loadProfile();
    }
  }, [open]);

  const loadProfile = async () => {
    try {
      setIsLoadingProfile(true);
      const response = await profileApi.get();
      setProfile(response.profile);
      
      // Populate form with existing data
      setFormData({
        fullName: response.profile.full_name || "",
        phone: response.profile.phone || "",
        dateOfBirth: response.profile.date_of_birth || "",
        addressLine1: response.profile.address_line1 || "",
        addressLine2: response.profile.address_line2 || "",
        city: response.profile.city || "",
        state: response.profile.state || "",
        zipCode: response.profile.zip_code || "",
        employmentStatus: response.profile.employment_status || "",
        annualIncome: response.profile.annual_income?.toString() || "",
      });
    } catch (error: any) {
      console.error("Failed to load profile:", error);
      // If profile doesn't exist, use Clerk user data
      if (clerkUser) {
        setFormData({
          fullName: clerkUser.fullName || "",
          phone: clerkUser.phoneNumbers?.[0]?.phoneNumber || "",
          dateOfBirth: "",
          addressLine1: "",
          addressLine2: "",
          city: "",
          state: "",
          zipCode: "",
          employmentStatus: "",
          annualIncome: "",
        });
      }
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await profileApi.update({
        fullName: formData.fullName,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth || undefined,
        addressLine1: formData.addressLine1 || undefined,
        addressLine2: formData.addressLine2 || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        zipCode: formData.zipCode || undefined,
        employmentStatus: formData.employmentStatus || undefined,
        annualIncome: formData.annualIncome ? parseFloat(formData.annualIncome) : undefined,
      });

      toast.success("Profile updated successfully");
      onOpenChange(false);
      if (onUpdate) {
        onUpdate();
      }
    } catch (error: any) {
      console.error("Failed to update profile:", error);
      toast.error(error.message || "Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Edit Profile
          </DialogTitle>
          <DialogDescription>
            Update your personal information and contact details
          </DialogDescription>
        </DialogHeader>

        {isLoadingProfile ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Image Section */}
            <div className="flex items-center gap-4 pb-4 border-b">
              <div className="relative">
                {clerkUser?.imageUrl ? (
                  <img
                    src={clerkUser.imageUrl}
                    alt="Profile"
                    className="w-20 h-20 rounded-full object-cover border-2 border-slate-200"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center">
                    <User className="w-10 h-10 text-slate-400" />
                  </div>
                )}
                {isUploadingImage && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Profile Picture</p>
                <p className="text-xs text-muted-foreground mb-2">
                  Upload a new profile picture (JPG, PNG, or GIF, max 5MB)
                </p>
                {clerkUser && (
                  <div className="flex gap-2">
                    <label htmlFor="profile-image-upload">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="cursor-pointer"
                        disabled={isUploadingImage}
                        asChild
                      >
                        <span>{isUploadingImage ? "Uploading..." : "Upload Image"}</span>
                      </Button>
                    </label>
                    <input
                      id="profile-image-upload"
                      type="file"
                      accept="image/jpeg,image/png,image/gif"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !clerkUser) return;

                        // Validate file size (5MB max)
                        if (file.size > 5 * 1024 * 1024) {
                          toast.error("Image size must be less than 5MB");
                          return;
                        }

                        // Validate file type
                        if (!file.type.startsWith("image/")) {
                          toast.error("Please select a valid image file");
                          return;
                        }

                        try {
                          setIsUploadingImage(true);
                          await clerkUser.setProfileImage({ file });
                          toast.success("Profile picture updated successfully!");
                          // Force a page refresh to update all avatars
                          // Small delay to ensure Clerk has processed the update
                          setTimeout(() => {
                            window.location.reload();
                          }, 500);
                        } catch (error: any) {
                          console.error("Failed to upload profile image:", error);
                          toast.error(error.message || "Failed to upload profile image");
                        } finally {
                          setIsUploadingImage(false);
                          // Reset input
                          e.target.value = "";
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <User className="w-4 h-4" />
                Basic Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => handleInputChange("fullName", e.target.value)}
                    required
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Phone Number *
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    required
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth" className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Date of Birth
                  </Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employmentStatus" className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    Employment Status
                  </Label>
                  <Select
                    value={formData.employmentStatus}
                    onValueChange={(value) => handleInputChange("employmentStatus", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employed">Employed</SelectItem>
                      <SelectItem value="self_employed">Self-Employed</SelectItem>
                      <SelectItem value="unemployed">Unemployed</SelectItem>
                      <SelectItem value="retired">Retired</SelectItem>
                      <SelectItem value="student">Student</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="annualIncome" className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Annual Income
                  </Label>
                  <Input
                    id="annualIncome"
                    type="number"
                    value={formData.annualIncome}
                    onChange={(e) => handleInputChange("annualIncome", e.target.value)}
                    placeholder="75000"
                    min="0"
                    step="1000"
                  />
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Address Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="addressLine1">Address Line 1</Label>
                  <Input
                    id="addressLine1"
                    value={formData.addressLine1}
                    onChange={(e) => handleInputChange("addressLine1", e.target.value)}
                    placeholder="123 Main Street"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="addressLine2">Address Line 2</Label>
                  <Input
                    id="addressLine2"
                    value={formData.addressLine2}
                    onChange={(e) => handleInputChange("addressLine2", e.target.value)}
                    placeholder="Apt 4B (optional)"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                    placeholder="Los Angeles"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleInputChange("state", e.target.value)}
                    placeholder="CA"
                    maxLength={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zipCode">Zip Code</Label>
                  <Input
                    id="zipCode"
                    value={formData.zipCode}
                    onChange={(e) => handleInputChange("zipCode", e.target.value)}
                    placeholder="90001"
                    maxLength={10}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

