"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  User,
  Mail,
  Phone,
  MapPin,
  ArrowLeft,
  Loader2,
  Camera,
  Edit3,
  Calendar,
  Star,
  Shield,
  Home,
  Heart,
  Check,
  X,
  Award,
} from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import { DestinationSearch } from "@/components/DestinationSearch";

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  bio: string;
  location: string;
  avatar_url: string | null;
  role: string | null;
  created_at: string | null;
}

interface ProfileStats {
  bookingCount: number;
  avgRating: number | null;
  membershipTier: string;
  memberSince: string | null;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, authUser } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [profileData, setProfileData] = useState<ProfileData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    bio: "",
    location: "",
    avatar_url: null,
    role: null,
    created_at: null,
  });
  const [stats, setStats] = useState<ProfileStats>({
    bookingCount: 0,
    avgRating: null,
    membershipTier: "guest",
    memberSince: null,
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      router.push("/auth");
    }
  }, [user, router]);

  // Load profile data from database
  useEffect(() => {
    const loadProfileData = async () => {
      if (!user) return;

      setIsLoadingData(true);
      try {
        // Fetch profile from profiles table
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (profileError && profileError.code !== "PGRST116") {
          console.error("Error fetching profile:", profileError);
        }

        // Set profile data (prefer database, fallback to user_metadata)
        const firstName =
          profile?.first_name || user.user_metadata?.first_name || "";
        const lastName =
          profile?.last_name || user.user_metadata?.last_name || "";
        const email = user.email || "";
        const phone = profile?.phone || user.user_metadata?.phone || "";
        const bio = profile?.bio || user.user_metadata?.bio || "";
        const location =
          profile?.location || user.user_metadata?.location || "";
        const avatar_url =
          profile?.avatar_url || user.user_metadata?.avatar_url || null;
        const role = profile?.role || authUser?.role || "guest";
        const created_at = profile?.created_at || null;

        setProfileData({
          firstName,
          lastName,
          email,
          phone,
          bio,
          location,
          avatar_url,
          role,
          created_at,
        });

        // Fetch bookings count
        let bookingCount = 0;
        if (profile?.id) {
          const { count, error: bookingError } = await supabase
            .from("bookings")
            .select("*", { count: "exact", head: true })
            .eq("guest_id", profile.id);

          if (!bookingError && count !== null) {
            bookingCount = count;
          }
        }

        // Fetch average rating from reviews
        let avgRating: number | null = null;
        if (profile?.id) {
          const { data: reviews, error: reviewsError } = await supabase
            .from("reviews")
            .select("rating")
            .eq("guest_id", profile.id)
            .eq("status", "published");

          if (!reviewsError && reviews && reviews.length > 0) {
            const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
            avgRating = Math.round((sum / reviews.length) * 10) / 10;
          }
        }

        // Determine membership tier
        const membershipTier =
          role === "admin" ? "premium" : role === "host" ? "host" : "guest";
        const memberSince = created_at
          ? new Date(created_at).getFullYear().toString()
          : new Date().getFullYear().toString();

        setStats({
          bookingCount,
          avgRating,
          membershipTier,
          memberSince,
        });
      } catch (error) {
        console.error("Error loading profile data:", error);
        toast({
          title: "Error loading profile",
          description: "Failed to load profile data. Please refresh the page.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingData(false);
      }
    };

    loadProfileData();
  }, [user, authUser, toast]);

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setIsUploadingAvatar(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload avatar");
      }

      const result = await response.json();

      // Update local state
      setProfileData(prev => ({
        ...prev,
        avatar_url: result.imageUrl,
      }));

      toast({
        title: "Avatar updated!",
        description: "Your profile picture has been successfully updated.",
        variant: "success",
      });

      // Refresh session to get updated user data
      await supabase.auth.refreshSession();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to upload avatar. Please try again.";
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUploadingAvatar(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleLocationSelect = (suggestion: { description: string }) => {
    handleInputChange("location", suggestion.description);
  };

  const handleSave = async () => {
    if (!user) return;

    setIsLoading(true);

    try {
      // Update user metadata in Supabase Auth
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          first_name: profileData.firstName,
          last_name: profileData.lastName,
          phone: profileData.phone,
          bio: profileData.bio,
          location: profileData.location,
          avatar_url: profileData.avatar_url,
        },
      });

      if (authError) {
        throw authError;
      }

      // Update profiles table
      const { error: profileError } = await supabase.from("profiles").upsert({
        user_id: user.id,
        first_name: profileData.firstName,
        last_name: profileData.lastName,
        phone: profileData.phone,
        bio: profileData.bio,
        location: profileData.location,
        avatar_url: profileData.avatar_url,
        updated_at: new Date().toISOString(),
      });

      if (profileError) {
        console.warn("Profiles table update failed:", profileError);
        // Don't throw error here as auth update succeeded
      }

      toast({
        title: "Profile updated!",
        description: "Your profile has been successfully updated.",
        variant: "success",
      });

      setIsEditing(false);

      // Reload profile data
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        setProfileData(prev => ({
          ...prev,
          firstName: profile.first_name || prev.firstName,
          lastName: profile.last_name || prev.lastName,
          phone: profile.phone || prev.phone,
          bio: profile.bio || prev.bio,
          location: profile.location || prev.location,
          avatar_url: profile.avatar_url || prev.avatar_url,
        }));
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to update profile. Please try again.";
      toast({
        title: "Update failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset to original data
    if (user) {
      const loadOriginal = async () => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (profile) {
          setProfileData({
            firstName:
              profile.first_name || user.user_metadata?.first_name || "",
            lastName: profile.last_name || user.user_metadata?.last_name || "",
            email: user.email || "",
            phone: profile.phone || user.user_metadata?.phone || "",
            bio: profile.bio || user.user_metadata?.bio || "",
            location: profile.location || user.user_metadata?.location || "",
            avatar_url:
              profile.avatar_url || user.user_metadata?.avatar_url || null,
            role: profile.role || authUser?.role || "guest",
            created_at: profile.created_at || null,
          });
        } else {
          setProfileData({
            firstName: user.user_metadata?.first_name || "",
            lastName: user.user_metadata?.last_name || "",
            email: user.email || "",
            phone: user.user_metadata?.phone || "",
            bio: user.user_metadata?.bio || "",
            location: user.user_metadata?.location || "",
            avatar_url: user.user_metadata?.avatar_url || null,
            role: authUser?.role || "guest",
            created_at: null,
          });
        }
      };
      loadOriginal();
    }
    setIsEditing(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA] dark:bg-[#0F172A]">
        <Loader2 className="h-8 w-8 animate-spin text-[#102334] dark:text-[#10B981]" />
      </div>
    );
  }

  if (isLoadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA] dark:bg-[#0F172A]">
        <Loader2 className="h-8 w-8 animate-spin text-[#102334] dark:text-[#10B981]" />
      </div>
    );
  }

  const displayName =
    profileData.firstName && profileData.lastName
      ? `${profileData.firstName} ${profileData.lastName}`
      : profileData.email?.split("@")[0] || "User";

  const roleLabel =
    profileData.role === "admin"
      ? "Administrator"
      : profileData.role === "host"
        ? "Host"
        : "Guest";

  return (
    <div className="min-h-screen bg-[#F5F7FA] dark:bg-[#0F172A]">
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header Bar */}
        <div className="mb-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-2 text-slate-600 hover:text-[#102334] dark:text-slate-400 dark:hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back</span>
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#102334] dark:bg-[#10B981] flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-[#0F172A] dark:text-white">
                    My Profile
                  </h1>
                  <p className="text-base text-slate-600 dark:text-slate-400">
                    Manage your account settings
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              {!isEditing && (
                <Button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 bg-[#102334] hover:bg-[#0F172A] dark:bg-[#10B981] dark:hover:bg-[#059669] text-white shadow-sm hover:shadow-md transition-all"
                >
                  <Edit3 className="h-4 w-4" />
                  <span>Edit Profile</span>
                </Button>
              )}
            </div>
          </div>
          <Separator className="border-slate-200 dark:border-slate-800" />
        </div>

        <div className="space-y-8">
          {/* Profile Hero Section */}
          <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-8 sm:p-10">
              <div className="flex flex-col items-center text-center space-y-6">
                {/* Avatar */}
                <div className="relative">
                  <Avatar className="h-32 w-32 ring-4 ring-slate-100 dark:ring-slate-800 shadow-lg">
                    <AvatarImage
                      src={profileData.avatar_url || undefined}
                      alt={displayName}
                    />
                    <AvatarFallback className="bg-[#102334] dark:bg-[#10B981] text-white text-3xl font-bold">
                      {profileData.firstName?.[0] ||
                        profileData.email?.[0]?.toUpperCase() ||
                        "U"}
                    </AvatarFallback>
                  </Avatar>
                  {isEditing && (
                    <>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={handleAvatarUpload}
                      />
                      <Button
                        size="sm"
                        onClick={handleAvatarClick}
                        disabled={isUploadingAvatar}
                        className="absolute -bottom-2 -right-2 h-10 w-10 rounded-full p-0 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 shadow-md hover:shadow-lg hover:scale-110 transition-all"
                        variant="secondary"
                      >
                        {isUploadingAvatar ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Camera className="h-4 w-4" />
                        )}
                      </Button>
                    </>
                  )}
                </div>

                {/* Name and Role */}
                <div className="space-y-3">
                  <h2 className="text-3xl font-bold text-[#0F172A] dark:text-white">
                    {displayName}
                  </h2>
                  <div className="flex items-center justify-center gap-2">
                    <Badge
                      className={`rounded-full px-3 py-1 text-sm font-medium ${
                        profileData.role === "admin"
                          ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          : profileData.role === "host"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                            : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                      }`}
                    >
                      {profileData.role === "admin" ? (
                        <>
                          <Shield className="h-3 w-3 mr-1" />
                          {roleLabel}
                        </>
                      ) : profileData.role === "host" ? (
                        <>
                          <Home className="h-3 w-3 mr-1" />
                          {roleLabel}
                        </>
                      ) : (
                        <>
                          <Heart className="h-3 w-3 mr-1" />
                          {roleLabel}
                        </>
                      )}
                    </Badge>
                    {stats.membershipTier === "premium" && (
                      <Badge className="rounded-full px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-sm font-medium">
                        <Award className="h-3 w-3 mr-1" />
                        Premium
                      </Badge>
                    )}
                  </div>
                  {profileData.bio ? (
                    <p className="text-base text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                      {profileData.bio}
                    </p>
                  ) : (
                    !isEditing && (
                      <p className="text-sm text-slate-400 dark:text-slate-500 italic">
                        Add a short bio...
                      </p>
                    )
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Bookings */}
            <Card className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 text-[#102334] dark:text-[#10B981]">
                  <Calendar className="h-6 w-6" />
                </div>
                <div className="text-3xl font-bold text-[#0F172A] dark:text-white mb-1">
                  {stats.bookingCount}
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  Total Bookings
                </div>
              </CardContent>
            </Card>

            {/* Average Rating */}
            <Card className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 text-[#102334] dark:text-[#10B981]">
                  <Star className="h-6 w-6" />
                </div>
                <div className="text-3xl font-bold text-[#0F172A] dark:text-white mb-1">
                  {stats.avgRating !== null ? stats.avgRating.toFixed(1) : "—"}
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  Average Rating
                </div>
              </CardContent>
            </Card>

            {/* Membership */}
            <Card className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 text-[#102334] dark:text-[#10B981]">
                  <Award className="h-6 w-6" />
                </div>
                <div className="text-3xl font-bold text-[#0F172A] dark:text-white mb-1 capitalize">
                  {stats.membershipTier}
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  Member Since {stats.memberSince}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Profile Information Form */}
          <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all">
            <CardHeader className="px-8 pt-8 pb-6">
              <CardTitle className="text-xl font-semibold text-[#0F172A] dark:text-white">
                Profile Information
              </CardTitle>
              <CardDescription className="text-base text-slate-500 dark:text-slate-400">
                Update your personal information and preferences
              </CardDescription>
            </CardHeader>

            <CardContent className="px-8 pb-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* First Name */}
                <div className="space-y-2">
                  <Label
                    htmlFor="firstName"
                    className="flex items-center gap-2 text-sm font-medium text-[#0F172A] dark:text-white"
                  >
                    <User className="h-4 w-4 text-[#475569] dark:text-slate-400" />
                    <span>First Name</span>
                  </Label>
                  <Input
                    id="firstName"
                    value={profileData.firstName}
                    onChange={e =>
                      handleInputChange("firstName", e.target.value)
                    }
                    disabled={!isEditing}
                    placeholder="Enter your first name"
                    className="rounded-xl border-slate-200 dark:border-slate-700 focus:border-[#102334] dark:focus:border-[#10B981] focus:ring-[#102334]/20 dark:focus:ring-[#10B981]/20 transition-all"
                  />
                </div>

                {/* Last Name */}
                <div className="space-y-2">
                  <Label
                    htmlFor="lastName"
                    className="flex items-center gap-2 text-sm font-medium text-[#0F172A] dark:text-white"
                  >
                    <User className="h-4 w-4 text-[#475569] dark:text-slate-400" />
                    <span>Last Name</span>
                  </Label>
                  <Input
                    id="lastName"
                    value={profileData.lastName}
                    onChange={e =>
                      handleInputChange("lastName", e.target.value)
                    }
                    disabled={!isEditing}
                    placeholder="Enter your last name"
                    className="rounded-xl border-slate-200 dark:border-slate-700 focus:border-[#102334] dark:focus:border-[#10B981] focus:ring-[#102334]/20 dark:focus:ring-[#10B981]/20 transition-all"
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="flex items-center gap-2 text-sm font-medium text-[#0F172A] dark:text-white"
                  >
                    <Mail className="h-4 w-4 text-[#475569] dark:text-slate-400" />
                    <span>Email</span>
                  </Label>
                  <Input
                    id="email"
                    value={profileData.email}
                    disabled
                    className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                  />
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Email cannot be changed for security reasons
                  </p>
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label
                    htmlFor="phone"
                    className="flex items-center gap-2 text-sm font-medium text-[#0F172A] dark:text-white"
                  >
                    <Phone className="h-4 w-4 text-[#475569] dark:text-slate-400" />
                    <span>Phone</span>
                  </Label>
                  <Input
                    id="phone"
                    value={profileData.phone}
                    onChange={e => handleInputChange("phone", e.target.value)}
                    disabled={!isEditing}
                    placeholder="Enter your phone number"
                    className="rounded-xl border-slate-200 dark:border-slate-700 focus:border-[#102334] dark:focus:border-[#10B981] focus:ring-[#102334]/20 dark:focus:ring-[#10B981]/20 transition-all"
                  />
                </div>

                {/* Location */}
                <div className="space-y-2 md:col-span-2">
                  <Label
                    htmlFor="location"
                    className="flex items-center gap-2 text-sm font-medium text-[#0F172A] dark:text-white"
                  >
                    <MapPin className="h-4 w-4 text-[#475569] dark:text-slate-400" />
                    <span>Location</span>
                  </Label>
                  {isEditing ? (
                    <DestinationSearch
                      value={profileData.location}
                      onChange={value => handleInputChange("location", value)}
                      onSelect={handleLocationSelect}
                      placeholder="Search for a location..."
                      className="w-full"
                    />
                  ) : (
                    <Input
                      id="location"
                      value={profileData.location}
                      disabled
                      placeholder="Enter your location"
                      className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                    />
                  )}
                </div>

                {/* Bio */}
                <div className="space-y-2 md:col-span-2">
                  <Label
                    htmlFor="bio"
                    className="text-sm font-medium text-[#0F172A] dark:text-white"
                  >
                    Bio
                  </Label>
                  <textarea
                    id="bio"
                    value={profileData.bio}
                    onChange={e => handleInputChange("bio", e.target.value)}
                    disabled={!isEditing}
                    placeholder="Add a short bio..."
                    rows={4}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 resize-none focus:outline-none focus:ring-2 focus:ring-[#102334]/20 dark:focus:ring-[#10B981]/20 focus:border-[#102334] dark:focus:border-[#10B981] disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:text-slate-500 dark:disabled:text-slate-400 transition-all"
                  />
                </div>
              </div>

              <Separator className="my-6 border-slate-200 dark:border-slate-800" />

              {/* Action Buttons */}
              {isEditing && (
                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6">
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isLoading}
                    className="flex items-center gap-2 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                  >
                    <X className="h-4 w-4" />
                    <span>Cancel</span>
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="flex items-center gap-2 bg-[#102334] hover:bg-[#0F172A] dark:bg-[#10B981] dark:hover:bg-[#059669] text-white shadow-sm hover:shadow-md transition-all"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    <span>{isLoading ? "Saving..." : "Save Changes"}</span>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
