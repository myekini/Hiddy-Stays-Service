"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  X,
  Home,
  Users,
  DollarSign,
  Calendar,
  Settings,
  Save,
  ArrowLeft,
  ArrowRight,
  Check,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { PropertyImageUpload } from "@/components/PropertyImageUpload";
import { supabase } from "@/integrations/supabase/client";

interface PropertyFormData {
  title: string;
  description: string;
  address: string;
  location: string;
  city: string;
  country: string;
  price_per_night: number;
  bedrooms: number;
  bathrooms: number;
  max_guests: number;
  property_type: string;
  amenities: string[];
  images: string[];
  house_rules: string[];
  cancellation_policy: string;
  min_nights: number;
  max_nights: number;
  advance_notice_hours: number;
  same_day_booking: boolean;
  is_active: boolean;
}

interface PropertyFormProps {
  property?: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (property: any) => void;
}

const PROPERTY_TYPES = [
  "apartment",
  "house",
  "condo",
  "villa",
  "studio",
  "loft",
  "townhouse",
  "cabin",
  "other",
];

const AMENITIES_OPTIONS = [
  "WiFi",
  "Kitchen",
  "Parking",
  "Pool",
  "Hot tub",
  "Gym",
  "Air conditioning",
  "Heating",
  "Washer",
  "Dryer",
  "TV",
  "Balcony",
  "Garden",
  "Pet friendly",
  "Smoking allowed",
  "Wheelchair accessible",
];

const CANCELLATION_POLICIES = [
  "flexible",
  "moderate",
  "strict",
  "super_strict",
];

export function PropertyForm({
  property,
  isOpen,
  onClose,
  onSuccess,
}: PropertyFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<PropertyFormData>({
    title: "",
    description: "",
    address: "",
    location: "",
    city: "",
    country: "",
    price_per_night: 0,
    bedrooms: 1,
    bathrooms: 1,
    max_guests: 2,
    property_type: "apartment",
    amenities: [],
    images: [],
    house_rules: [],
    cancellation_policy: "moderate",
    min_nights: 1,
    max_nights: 30,
    advance_notice_hours: 24,
    same_day_booking: false,
    is_active: false,
  });

  useEffect(() => {
    if (property) {
      setFormData({
        title: property.title || "",
        description: property.description || "",
        address: property.address || "",
        location: property.location || "",
        city: property.city || "",
        country: property.country || "",
        price_per_night: property.price_per_night || 0,
        bedrooms: property.bedrooms || 1,
        bathrooms: property.bathrooms || 1,
        max_guests: property.max_guests || 2,
        property_type: property.property_type || "apartment",
        amenities: property.amenities || [],
        images: property.images || [],
        house_rules: property.house_rules || [],
        cancellation_policy: property.cancellation_policy || "moderate",
        min_nights: property.min_nights || 1,
        max_nights: property.max_nights || 30,
        advance_notice_hours: property.advance_notice_hours || 24,
        same_day_booking: property.same_day_booking || false,
        is_active: property.is_active || false,
      });
    }
  }, [property]);

  const handleInputChange = (field: keyof PropertyFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAmenityToggle = (amenity: string) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const handleImagesUploaded = (imageUrls: string[]) => {
    setFormData((prev) => ({
      ...prev,
      images: imageUrls,
    }));
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to create a property",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const url = property
        ? `/api/properties/${property.id}`
        : "/api/properties";

      const method = property ? "PUT" : "POST";

      // Get auth token from session
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify({
          ...formData,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Success! 🎉",
          description: property
            ? "Property updated successfully"
            : "Property created successfully",
        });

        if (onSuccess) {
          onSuccess(result.property);
        }
        onClose();
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to save property");
      }
    } catch (error) {
      console.error("Error saving property:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to save property",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isStep1Valid =
    formData.title &&
    formData.description &&
    formData.address &&
    formData.price_per_night > 0;
  const isStep2Valid = formData.amenities.length > 0;
  const isStep3Valid = true; // Availability rules are optional

  const steps = [
    { id: 1, title: "Basic Info", description: "Property details and pricing" },
    { id: 2, title: "Amenities & Photos", description: "Features and images" },
    { id: 3, title: "Policies", description: "Rules and availability" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto p-0 border-0 shadow-xl">
        <div className="relative bg-gradient-to-br from-slate-50 to-white">
          {/* Monte-inspired Header */}
          <DialogHeader className="px-8 pt-8 pb-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-xs text-slate-600 mb-2">
                  <Home className="w-3 h-3" />
                  <span>Property Management</span>
                </div>
                <DialogTitle className="text-3xl font-light text-slate-900 tracking-tight">
                  {property ? "Edit Property" : "Create Property"}
                </DialogTitle>
                <p className="text-slate-600 font-light">
                  Step {step} of 3: {steps[step - 1]?.description}
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Monte-styled Progress Steps */}
            <div className="flex items-center justify-center gap-8 mt-8">
              {steps.map((stepItem, index) => (
                <div key={stepItem.id} className="flex items-center gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200 ${
                        stepItem.id <= step
                          ? "bg-slate-900 text-white shadow-sm"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {stepItem.id < step ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        stepItem.id
                      )}
                    </div>
                    <div className="hidden sm:block">
                      <p className={`text-sm font-medium ${
                        stepItem.id <= step ? "text-slate-900" : "text-slate-500"
                      }`}>{stepItem.title}</p>
                      <p className="text-xs text-slate-500">
                        {stepItem.description}
                      </p>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`w-16 h-0.5 transition-all duration-200 ${
                        stepItem.id < step ? "bg-slate-300" : "bg-slate-100"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </DialogHeader>

          <div className="px-8 pb-8">
            {/* Step 1: Basic Information */}
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <Card className="border-0 shadow-sm bg-white">
                  <CardHeader className="pb-6">
                    <CardTitle className="flex items-center gap-3 text-xl font-light text-slate-900">
                      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                        <Home className="w-5 h-5 text-slate-600" />
                      </div>
                      Basic Information
                    </CardTitle>
                    <CardDescription className="text-slate-600 font-light ml-11">
                      Tell us about your property and set your pricing
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="title">Property Title *</Label>
                          <Input
                            id="title"
                            placeholder="Beautiful beachfront villa"
                            value={formData.title}
                            onChange={(e) =>
                              handleInputChange("title", e.target.value)
                            }
                          />
                        </div>

                        <div>
                          <Label htmlFor="description">Description *</Label>
                          <Textarea
                            id="description"
                            placeholder="Describe your property..."
                            rows={4}
                            value={formData.description}
                            onChange={(e) =>
                              handleInputChange("description", e.target.value)
                            }
                          />
                        </div>

                        <div>
                          <Label htmlFor="address">Address *</Label>
                          <Input
                            id="address"
                            placeholder="123 Main Street, City, State"
                            value={formData.address}
                            onChange={(e) =>
                              handleInputChange("address", e.target.value)
                            }
                            onBlur={() => {
                              if (!formData.city || !formData.country) {
                                const parts = formData.address
                                  .split(",")
                                  .map((p) => p.trim())
                                  .filter(Boolean);
                                if (parts.length >= 2) {
                                  const countryGuess = parts[parts.length - 1];
                                  const cityGuess = parts[parts.length - 2];
                                  setFormData((prev) => ({
                                    ...prev,
                                    city: prev.city || cityGuess || "",
                                    country: prev.country || countryGuess || "",
                                  }));
                                }
                              }
                            }}
                          />
                        </div>

                        <div>
                          <Label htmlFor="location">Location</Label>
                          <Input
                            id="location"
                            placeholder="Neighborhood or area"
                            value={formData.location}
                            onChange={(e) =>
                              handleInputChange("location", e.target.value)
                            }
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="city">City</Label>
                            <Input
                              id="city"
                              placeholder="Toronto"
                              value={formData.city}
                              onChange={(e) =>
                                handleInputChange("city", e.target.value)
                              }
                            />
                          </div>
                          <div>
                            <Label htmlFor="country">Country</Label>
                            <Input
                              id="country"
                              placeholder="Canada"
                              value={formData.country}
                              onChange={(e) =>
                                handleInputChange("country", e.target.value)
                              }
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="price">Price per Night (CAD) *</Label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="price"
                              type="number"
                              placeholder="150"
                              value={formData.price_per_night || ""}
                              onChange={(e) =>
                                handleInputChange(
                                  "price_per_night",
                                  e.target.value ? parseFloat(e.target.value) : 0
                                )
                              }
                              className="pl-10"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="bedrooms">Bedrooms</Label>
                            <Input
                              id="bedrooms"
                              type="number"
                              min="1"
                              value={formData.bedrooms || ""}
                              onChange={(e) =>
                                handleInputChange(
                                  "bedrooms",
                                  e.target.value ? parseInt(e.target.value) : 1
                                )
                              }
                            />
                          </div>
                          <div>
                            <Label htmlFor="bathrooms">Bathrooms</Label>
                            <Input
                              id="bathrooms"
                              type="number"
                              min="1"
                              step="0.5"
                              value={formData.bathrooms || ""}
                              onChange={(e) =>
                                handleInputChange(
                                  "bathrooms",
                                  e.target.value ? parseFloat(e.target.value) : 1
                                )
                              }
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="max_guests">Maximum Guests</Label>
                          <div className="relative">
                            <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="max_guests"
                              type="number"
                              min="1"
                              value={formData.max_guests || ""}
                              onChange={(e) =>
                                handleInputChange(
                                  "max_guests",
                                  e.target.value ? parseInt(e.target.value) : 1
                                )
                              }
                              className="pl-10"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="property_type">Property Type</Label>
                          <Select
                            value={formData.property_type}
                            onValueChange={(value) =>
                              handleInputChange("property_type", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select property type" />
                            </SelectTrigger>
                            <SelectContent>
                              {PROPERTY_TYPES.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type.charAt(0).toUpperCase() + type.slice(1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end">
                  <Button
                    onClick={() => setStep(2)}
                    disabled={!isStep1Valid}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Amenities & Images */}
            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Amenities & Images
                    </CardTitle>
                    <CardDescription>
                      Select amenities and upload photos of your property
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label className="text-base font-medium mb-3 block">
                        Amenities
                      </Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {AMENITIES_OPTIONS.map((amenity) => (
                          <div
                            key={amenity}
                            className="flex items-center space-x-2"
                          >
                            <input
                              type="checkbox"
                              id={amenity}
                              checked={formData.amenities.includes(amenity)}
                              onChange={() => handleAmenityToggle(amenity)}
                              className="rounded border-border"
                            />
                            <Label htmlFor={amenity} className="text-sm">
                              {amenity}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="text-base font-medium mb-3 block">
                        Images
                      </Label>
                      <PropertyImageUpload
                        propertyId={property?.id}
                        onImagesUploaded={handleImagesUploaded}
                        maxImages={20}
                        existingImages={formData.images}
                      />
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={() => setStep(3)}
                    disabled={!isStep2Valid}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Availability & Rules */}
            {step === 3 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Availability & Rules
                    </CardTitle>
                    <CardDescription>
                      Set your booking policies and availability rules
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="min_nights">Minimum Nights</Label>
                          <Input
                            id="min_nights"
                            type="number"
                            min="1"
                            value={formData.min_nights}
                            onChange={(e) =>
                              handleInputChange(
                                "min_nights",
                                parseInt(e.target.value)
                              )
                            }
                          />
                        </div>

                        <div>
                          <Label htmlFor="max_nights">Maximum Nights</Label>
                          <Input
                            id="max_nights"
                            type="number"
                            min="1"
                            value={formData.max_nights}
                            onChange={(e) =>
                              handleInputChange(
                                "max_nights",
                                parseInt(e.target.value)
                              )
                            }
                          />
                        </div>

                        <div>
                          <Label htmlFor="advance_notice">
                            Advance Notice (hours)
                          </Label>
                          <Input
                            id="advance_notice"
                            type="number"
                            min="0"
                            value={formData.advance_notice_hours}
                            onChange={(e) =>
                              handleInputChange(
                                "advance_notice_hours",
                                parseInt(e.target.value)
                              )
                            }
                          />
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch
                            id="same_day"
                            checked={formData.same_day_booking}
                            onCheckedChange={(checked) =>
                              handleInputChange("same_day_booking", checked)
                            }
                          />
                          <Label htmlFor="same_day">
                            Allow same-day booking
                          </Label>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="cancellation">
                            Cancellation Policy
                          </Label>
                          <Select
                            value={formData.cancellation_policy}
                            onValueChange={(value) =>
                              handleInputChange("cancellation_policy", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select policy" />
                            </SelectTrigger>
                            <SelectContent>
                              {CANCELLATION_POLICIES.map((policy) => (
                                <SelectItem key={policy} value={policy}>
                                  {policy.charAt(0).toUpperCase() +
                                    policy.slice(1).replace("_", " ")}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch
                            id="active"
                            checked={formData.is_active}
                            onCheckedChange={(checked) =>
                              handleInputChange("is_active", checked)
                            }
                          />
                          <Label htmlFor="active">Make property active</Label>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Important:</strong> Once you activate your property,
                    it will be visible to guests and available for booking. Make
                    sure all information is accurate before activating.
                  </AlertDescription>
                </Alert>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={loading || !isStep3Valid}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
                        Saving...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Save className="w-4 h-4" />
                        {property ? "Update Property" : "Create Property"}
                      </div>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
