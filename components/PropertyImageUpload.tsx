"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  X,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Move,
  Crop,
  Check,
  AlertCircle,
  Image as ImageIcon,
  Camera,
  Home,
  Car,
  Wifi,
  Utensils,
  Bed,
  Bath,
  Tv,
  Waves,
  Mountain,
  TreePine,
  Users,
  Shield,
  Star,
  Info,
  Eye,
  Trash2,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  Crop as CropType,
  PixelCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

import {
  DragEndEvent,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ImageUploadProps {
  propertyId?: string;
  onImagesUploaded: (imageUrls: string[]) => void;
  maxImages?: number;
  existingImages?: string[];
}

interface ImageGuide {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  required: boolean;
  tips: string[];
}

const IMAGE_GUIDE: ImageGuide[] = [
  {
    id: "exterior",
    title: "Exterior & Front Door",
    description: "Show the property's exterior, front door, and street view",
    icon: <Home className="w-5 h-5" />,
    required: true,
    tips: [
      "Take photos during daylight hours",
      "Include the front door and entrance",
      "Show the property's street presence",
      "Avoid cars blocking the view",
    ],
  },
  {
    id: "living",
    title: "Living Room",
    description: "Main living space where guests will relax",
    icon: <Tv className="w-5 h-5" />,
    required: true,
    tips: [
      "Clean and declutter the space",
      "Show seating arrangements",
      "Include TV and entertainment areas",
      "Good natural lighting preferred",
    ],
  },
  {
    id: "kitchen",
    title: "Kitchen",
    description: "Cooking and dining area",
    icon: <Utensils className="w-5 h-5" />,
    required: true,
    tips: [
      "Show appliances and counter space",
      "Include dining table if present",
      "Clean counters and organized cabinets",
      "Good lighting is essential",
    ],
  },
  {
    id: "bedroom",
    title: "Bedroom(s)",
    description: "Sleeping areas for guests",
    icon: <Bed className="w-5 h-5" />,
    required: true,
    tips: [
      "Make beds neatly",
      "Show closet/storage space",
      "Include bedside tables",
      "Good lighting for reading",
    ],
  },
  {
    id: "bathroom",
    title: "Bathroom",
    description: "Bathroom facilities",
    icon: <Bath className="w-5 h-5" />,
    required: true,
    tips: [
      "Clean and spotless",
      "Show shower/bathtub",
      "Include toilet and sink",
      "Good ventilation",
    ],
  },
  {
    id: "amenities",
    title: "Key Amenities",
    description: "WiFi, parking, gym, pool, etc.",
    icon: <Wifi className="w-5 h-5" />,
    required: false,
    tips: [
      "Show WiFi router if visible",
      "Parking spaces",
      "Gym equipment",
      "Pool or outdoor areas",
    ],
  },
];

export function PropertyImageUpload({
  propertyId,
  onImagesUploaded,
  maxImages = 20,
  existingImages = [],
}: ImageUploadProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [uploadedImages, setUploadedImages] =
    useState<string[]>(existingImages);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showCropModal, setShowCropModal] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<CropType>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [imgRef, setImgRef] = useState<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onImagesUploadedRef = useRef(onImagesUploaded);

  useEffect(() => {
    onImagesUploadedRef.current = onImagesUploaded;
  }, [onImagesUploaded]);

  useEffect(() => {
    onImagesUploadedRef.current(uploadedImages);
  }, [uploadedImages]);

  const onImageLoad = useCallback((img: HTMLImageElement) => {
    setImgRef(img);
    const { width, height } = img;
    const crop = centerCrop(
      makeAspectCrop(
        {
          unit: "%",
          width: 80,
        },
        16 / 9,
        width,
        height
      ),
      width,
      height
    );
    setCrop(crop);
  }, []);

  const getCroppedImg = (
    image: HTMLImageElement,
    crop: PixelCrop,
    fileName: string
  ): Promise<File> => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("No 2d context");
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const pixelRatio = window.devicePixelRatio;

    canvas.width = crop.width * pixelRatio * scaleX;
    canvas.height = crop.height * pixelRatio * scaleY;

    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingQuality = "high";

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width * scaleX,
      crop.height * scaleY
    );

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            throw new Error("Canvas is empty");
          }
          const file = new File([blob], fileName, {
            type: "image/jpeg",
          });
          resolve(file);
        },
        "image/jpeg",
        0.9
      );
    });
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const remainingSlots = maxImages - uploadedImages.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    if (filesToProcess.length === 0) {
      toast({
        title: "Upload Limit Reached",
        description: `You can only upload up to ${maxImages} images.`,
        variant: "destructive",
      });
      return;
    }

    // If the user selected multiple files, upload them in one batch for speed.
    // Cropping is only applied for single-file selection.
    if (filesToProcess.length > 1) {
      void handleUpload(filesToProcess);
      return;
    }

    // Process single image for cropping
    const firstFile = filesToProcess[0];
    if (!firstFile) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCurrentImage(reader.result as string);
      setShowCropModal(true);
    };
    reader.readAsDataURL(firstFile);
  };

  const handleCropComplete = async () => {
    if (!imgRef || !completedCrop) {
      toast({
        title: "Error",
        description: "Please select a crop area first",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      const croppedFile = await getCroppedImg(
        imgRef,
        completedCrop,
        `cropped_${Date.now()}.jpg`
      );

      setUploadProgress(50);
      const imageUrl = await uploadImage(croppedFile);
      setUploadProgress(100);

      const newImages = [...uploadedImages, imageUrl];
      setUploadedImages(newImages);

      toast({
        title: "Success! 🎉",
        description: "Image cropped and uploaded successfully",
      });

      setShowCropModal(false);
      setCurrentImage(null);
      setCrop(undefined);
      setCompletedCrop(undefined);
    } catch (error) {
      console.error("Error cropping image:", error);
      toast({
        title: "Error",
        description: "Failed to crop and upload image",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    if (!user?.id) {
      throw new Error("User not authenticated");
    }

    // If we have a real propertyId, upload via the property images endpoint
    // so the image is persisted into the property_images table.
    if (propertyId && propertyId !== "temp") {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("No authentication token available");
      }

      const formData = new FormData();
      formData.append("images", file);

      const response = await fetch(`/api/properties/${propertyId}/images/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || error.message || "Failed to upload image");
      }

      const result = await response.json();
      const url = result?.uploaded?.[0]?.url;
      if (!url) {
        throw new Error("Upload succeeded but no image URL was returned");
      }

      return url;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", user.id);
    formData.append("propertyId", propertyId || "temp");

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to upload image");
    }

    const result = await response.json();
    return result.imageUrl;
  };

  const handleUpload = async (files: File[]) => {
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to upload images",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // If we have a real propertyId, use the batch upload endpoint.
      if (propertyId && propertyId !== "temp") {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          throw new Error("No authentication token available");
        }

        const formData = new FormData();
        files.forEach((file) => formData.append("images", file));

        const response = await fetch(`/api/properties/${propertyId}/images/upload`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.error || error.message || "Failed to upload images");
        }

        const result = await response.json();
        const uploadedUrls = (result?.uploaded || [])
          .map((u: any) => u?.url)
          .filter((u: any) => typeof u === "string" && u.trim() !== "");

        setUploadProgress(100);

        const newImages = [...uploadedImages, ...uploadedUrls];
        setUploadedImages(newImages);

        toast({
          title: "Success! 🎉",
          description: `${uploadedUrls.length} image(s) uploaded successfully`,
        });
      } else {
        // Fallback: temp uploads (no property yet) -> upload individually.
        const uploadPromises = files.map(async (file, index) => {
          const imageUrl = await uploadImage(file);
          setUploadProgress(((index + 1) / files.length) * 100);
          return imageUrl;
        });

        const uploadedUrls = await Promise.all(uploadPromises);
        const newImages = [...uploadedImages, ...uploadedUrls];
        setUploadedImages(newImages);

        toast({
          title: "Success! 🎉",
          description: `${uploadedUrls.length} image(s) uploaded successfully`,
        });
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload Failed",
        description:
          error instanceof Error ? error.message : "Failed to upload images",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const removeImage = (index: number) => {
    const newImages = uploadedImages.filter((_, i) => i !== index);
    setUploadedImages(newImages);
  };

  const reorderImages = (fromIndex: number, toIndex: number) => {
    const newImages = [...uploadedImages];
    const [removed] = newImages.splice(fromIndex, 1);
    if (removed === undefined) return;
    newImages.splice(toIndex, 0, removed);
    setUploadedImages(newImages);
  };


  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId !== overId) {
      setUploadedImages((items) => {
        const oldIndex = items.indexOf(activeId);
        const newIndex = items.indexOf(overId);
        const newItems = arrayMove(items, oldIndex, newIndex);
        return newItems;
      });
    }
  };

  const SortableImage = ({
    imageUrl,
    index,
    removeImage,
  }: {
    imageUrl: string;
    index: number;
    removeImage: (index: number) => void;
  }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
    } = useSortable({ id: imageUrl });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    return (
      <motion.div
        ref={setNodeRef}
        style={style}
        {...attributes}
        className="relative group"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
      >
        <div className="aspect-square rounded-lg overflow-hidden border-2 border-neutral-200">
          <img
            src={imageUrl}
            alt={`Property ${index + 1}`}
            className="w-full h-full object-cover"
          />
          {index === 0 && (
            <div className="absolute top-2 left-2">
              <Badge className="bg-green-500">
                <Star className="w-3 h-3 mr-1" />
                Primary
              </Badge>
            </div>
          )}
        </div>

        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  {...listeners}
                  className="cursor-grab"
                >
                  <GripVertical className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Drag to reorder</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => removeImage(index)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Remove image</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Image Upload Guide */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Property Photo Guide</CardTitle>
                <CardDescription>
                  Follow this guide to upload the right photos for your property
                </CardDescription>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Info className="w-4 h-4 mr-2" />
                    View Guide
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Complete Property Photo Guide</DialogTitle>
                    <DialogDescription>
                      Follow this comprehensive guide to create the perfect
                      property listing
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-6">
                    {IMAGE_GUIDE.map((item) => (
                      <Card key={item.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div
                              className={`p-2 rounded-lg ${
                                item.required
                                  ? "bg-red-100 text-red-600"
                                  : "bg-blue-100 text-blue-600"
                              }`}
                            >
                              {item.icon}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold">{item.title}</h4>
                                {item.required && (
                                  <Badge
                                    variant="destructive"
                                    className="text-xs"
                                  >
                                    Required
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-neutral-600 mb-3">
                                {item.description}
                              </p>
                              <div>
                                <p className="text-sm font-medium mb-2">
                                  Tips:
                                </p>
                                <ul className="text-sm text-neutral-600 space-y-1">
                                  {item.tips.map((tip, index) => (
                                    <li key={index}>• {tip}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {IMAGE_GUIDE.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-lg border ${
                    item.required
                      ? "border-red-200 bg-red-50"
                      : "border-neutral-200 bg-neutral-50"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {item.icon}
                    <span className="text-sm font-medium">{item.title}</span>
                    {item.required && (
                      <Badge variant="destructive" className="text-xs">
                        Required
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-neutral-600">{item.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upload Area */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Upload Images</CardTitle>
                <CardDescription>
                  {uploadedImages.length} of {maxImages} images uploaded
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || uploadedImages.length >= maxImages}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Add Images
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
            />

            {uploading && (
              <div className="space-y-2 mb-6">
                <Progress value={uploadProgress} className="w-full" />
                <p className="text-sm text-neutral-600 text-center">
                  Uploading images... {Math.round(uploadProgress)}%
                </p>
              </div>
            )}

            {/* Image Grid */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={uploadedImages} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <AnimatePresence>
                    {uploadedImages.map((imageUrl, index) => (
                      <SortableImage
                        key={imageUrl}
                        imageUrl={imageUrl}
                        index={index}
                        removeImage={removeImage}
                      />
                    ))}
                  </AnimatePresence>

                  {/* Add More Button */}
                  {uploadedImages.length < maxImages && !uploading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="aspect-square rounded-lg border-2 border-dashed border-neutral-300 flex items-center justify-center cursor-pointer hover:border-brand-500 hover:bg-brand-50 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className="text-center">
                        <Upload className="w-8 h-8 mx-auto mb-2 text-neutral-400" />
                        <p className="text-sm text-neutral-600">Add Image</p>
                      </div>
                    </motion.div>
                  )}
                </div>
              </SortableContext>
            </DndContext>

            {/* Upload Tips */}
            <Alert className="mt-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Tips for better photos:</strong>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>• Use natural lighting when possible</li>
                  <li>• Keep spaces clean and decluttered</li>
                  <li>• Take photos from multiple angles</li>
                  <li>• Include both wide shots and close-ups</li>
                  <li>• The first image will be your primary photo</li>
                </ul>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Image Crop Modal */}
        <Dialog open={showCropModal} onOpenChange={setShowCropModal}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Crop Your Image</DialogTitle>
              <DialogDescription>
                Adjust the crop area to get the perfect shot
              </DialogDescription>
            </DialogHeader>

            {currentImage && (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <ReactCrop
                    crop={crop}
                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                    onComplete={(c) => setCompletedCrop(c)}
                    aspect={16 / 9}
                    className="max-w-full max-h-96"
                  >
                    <img
                      ref={setImgRef}
                      alt="Crop me"
                      src={currentImage}
                      onLoad={(e) => onImageLoad(e.currentTarget)}
                      className="max-w-full max-h-96"
                    />
                  </ReactCrop>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowCropModal(false)}
                    disabled={uploading}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCropComplete}
                    disabled={uploading || !completedCrop}
                  >
                    {uploading ? (
                      <>
                        <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Apply Crop
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
