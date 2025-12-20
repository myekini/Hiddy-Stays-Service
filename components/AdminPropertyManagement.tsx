import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import {
  Search,
  Building,
  MapPin,
  DollarSign,
  Star,
  Calendar,
  Users,
  Bed,
  Bath,
  MoreHorizontal,
} from "lucide-react";
import { propertyService, Property } from "@/services/propertyService";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

import { withErrorBoundary } from "@/components/ErrorBoundaryWrapper";

import SelectFilter from "@/components/filters/SelectFilter";

const AdminPropertyManagement: React.FC = () => {
  const { session } = useAuth();
  const { toast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterCountry, setFilterCountry] = useState("all");
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [propertyDetailsOpen, setPropertyDetailsOpen] = useState(false);

  const loadProperties = useCallback(async () => {
    try {
      setLoading(true);
      const token = session?.access_token;
      if (!token) {
        throw new Error("Authentication token not found.");
      }
      const propertiesData = await propertyService.getProperties({
        status: filterStatus === "all" ? undefined : filterStatus,
        property_type: filterType === "all" ? undefined : filterType,
        country: filterCountry === "all" ? undefined : filterCountry,
        search: searchTerm || undefined,
      }, token);
      setProperties(propertiesData);
    } catch (error) {
      console.error("Error loading properties:", error);
      toast({
        title: "Error",
        description: "Failed to load properties.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterType, filterCountry, searchTerm, toast, session?.access_token]);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  const handlePropertyAction = async (
    propertyId: string,
    action: "activate" | "deactivate" | "feature" | "unfeature" | "delete"
  ) => {
    const originalProperties = [...properties];
    let updatedProperties = [...properties];

    const propertyIndex = updatedProperties.findIndex((p) => p.id === propertyId);
    if (propertyIndex === -1) return;

    const property = updatedProperties[propertyIndex];

    // Optimistic UI updates
    switch (action) {
      case "activate":
        updatedProperties[propertyIndex] = { ...(property as any), is_active: true } as any;
        break;
      case "deactivate":
        updatedProperties[propertyIndex] = { ...(property as any), is_active: false } as any;
        break;
      case "feature":
        updatedProperties[propertyIndex] = { ...(property as any), is_featured: true } as any;
        break;
      case "unfeature":
        updatedProperties[propertyIndex] = { ...(property as any), is_featured: false } as any;
        break;
      case "delete":
        updatedProperties = updatedProperties.filter((p) => p.id !== propertyId);
        break;
    }
    setProperties(updatedProperties);

    try {
      const token = session?.access_token;
      if (!token) {
        throw new Error("Authentication token not found.");
      }

      switch (action) {
        case "activate":
          await propertyService.togglePropertyStatus(propertyId, true, token);
          break;
        case "deactivate":
          await propertyService.togglePropertyStatus(propertyId, false, token);
          break;
        case "feature":
          await propertyService.togglePropertyFeatured(propertyId, true, token);
          break;
        case "unfeature":
          await propertyService.togglePropertyFeatured(propertyId, false, token);
          break;
        case "delete":
          await propertyService.deleteProperty(propertyId, token);
          break;
      }

      toast({
        title: "Success",
        description: `Property ${action}d successfully.`,
      });
    } catch (error) {
      console.error(`Error performing ${action} on property:`, error);
      setProperties(originalProperties); // Revert on error
      toast({
        title: "Error",
        description: `Failed to ${action} property.`,
        variant: "destructive",
      });
    }
  };

  const openPropertyDetails = (property: Property) => {
    setSelectedProperty(property);
    setPropertyDetailsOpen(true);
  };

  const uniqueCountries = useMemo(() => {
    const countries = properties.map((p) => p.country).filter(Boolean);
    return Array.from(new Set(countries));
  }, [properties]);

  const uniqueTypes = useMemo(() => {
    const types = properties.map((p) => p.property_type).filter(Boolean);
    return Array.from(new Set(types));
  }, [properties]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-1/4" />
          <Skeleton className="h-4 w-1/2 mt-2" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-1/4" />
              <Skeleton className="h-4 w-3/4 mt-2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-1/4" />
              <Skeleton className="h-4 w-3/4 mt-2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-1/4" />
              <Skeleton className="h-4 w-3/4 mt-2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-1/4" />
              <Skeleton className="h-4 w-3/4 mt-2" />
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/4" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-[180px]" />
              <Skeleton className="h-10 w-[180px]" />
              <Skeleton className="h-10 w-[180px]" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-4 w-1/2 mt-2" />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><Skeleton className="h-5 w-20" /></TableHead>
                  <TableHead><Skeleton className="h-5 w-20" /></TableHead>
                  <TableHead><Skeleton className="h-5 w-20" /></TableHead>
                  <TableHead><Skeleton className="h-5 w-20" /></TableHead>
                  <TableHead><Skeleton className="h-5 w-20" /></TableHead>
                  <TableHead><Skeleton className="h-5 w-20" /></TableHead>
                  <TableHead><Skeleton className="h-5 w-20" /></TableHead>
                  <TableHead><Skeleton className="h-5 w-20" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Property Management</h1>
        <p className="text-sm text-muted-foreground">
          Manage all properties on the platform
        </p>
      </div>

      {/* Filters and Search */}
      <div className="sticky top-4 z-10 rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10">
        <div className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title, location, or host..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <SelectFilter
              value={filterStatus}
              onValueChange={setFilterStatus}
              placeholder="Filter by status"
              items={[
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
                { value: "featured", label: "Featured" },
              ]}
            />
            <SelectFilter
              value={filterType}
              onValueChange={setFilterType}
              placeholder="Filter by type"
              items={uniqueTypes.map((type: string) => ({ value: type, label: type }))}
            />
            <SelectFilter
              value={filterCountry}
              onValueChange={setFilterCountry}
              placeholder="Filter by country"
              items={uniqueCountries.map((country: string) => ({ value: country, label: country }))}
            />
          </div>
        </div>
      </div>

      {/* Properties Table */}
      <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10">
        <CardHeader className="pb-3">
          <CardTitle>Properties ({properties.length})</CardTitle>
          <CardDescription>
            Manage property listings and settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow>
                <TableHead className="h-10 px-3 text-xs">Property</TableHead>
                <TableHead className="h-10 px-3 text-xs">Host</TableHead>
                <TableHead className="h-10 px-3 text-xs">Location</TableHead>
                <TableHead className="h-10 px-3 text-xs text-right">Price/Night</TableHead>
                <TableHead className="h-10 px-3 text-xs">Status</TableHead>
                <TableHead className="h-10 px-3 text-xs text-right">Bookings</TableHead>
                <TableHead className="h-10 px-3 text-xs text-right">Rating</TableHead>
                <TableHead className="h-10 px-3 text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {properties.map((property) => (
                <TableRow key={property.id}>
                  <TableCell className="p-3">
                    <div>
                      <div className="font-medium">{property.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {property.property_type} • {property.bedrooms} bed,{" "}
                        {property.bathrooms} bath
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="p-3">
                    <div>
                      <div className="font-medium">{property.host.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {property.host.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="p-3">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">{property.location}</span>
                    </div>
                  </TableCell>
                  <TableCell className="p-3 text-right">
                    <div className="font-medium">${property.price_per_night}</div>
                  </TableCell>
                  <TableCell className="p-3">
                    <div className="flex gap-1">
                      {property.is_active ? (
                        <Badge variant="outline" className="text-green-600">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-600">
                          Inactive
                        </Badge>
                      )}
                      {property.is_featured && (
                        <Badge variant="default">Featured</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="p-3 text-right">{(property as any).total_bookings}</TableCell>
                  <TableCell className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm">
                        {(property as any).average_rating?.toFixed?.(1) || "N/A"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="p-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onSelect={() => openPropertyDetails(property)}>
                          View details
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />
                        {!property.is_active ? (
                          <DropdownMenuItem onSelect={() => handlePropertyAction(property.id, "activate")}>
                            Activate
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onSelect={() => handlePropertyAction(property.id, "deactivate")}>
                            Deactivate
                          </DropdownMenuItem>
                        )}

                        {!property.is_featured ? (
                          <DropdownMenuItem onSelect={() => handlePropertyAction(property.id, "feature")}>
                            Feature
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onSelect={() => handlePropertyAction(property.id, "unfeature")}>
                            Unfeature
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem className="text-destructive focus:text-destructive">
                              Delete
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Property</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to permanently delete "{property.title}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handlePropertyAction(property.id, "delete")}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Property Details Dialog */}
      <Dialog open={propertyDetailsOpen} onOpenChange={setPropertyDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Property Details</DialogTitle>
            <DialogDescription>
              Detailed information about the selected property
            </DialogDescription>
          </DialogHeader>
          {selectedProperty && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h3 className="font-semibold mb-2">Property Information</h3>
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium">Title:</span>
                      <p className="text-sm">{selectedProperty.title}</p>
                    </div>
                    <div>
                      <span className="font-medium">Description:</span>
                      <p className="text-sm">{selectedProperty.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {selectedProperty.location}, {selectedProperty.country}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {selectedProperty.property_type}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Host Information</h3>
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium">Name:</span>
                      <p className="text-sm">{selectedProperty.host.name}</p>
                    </div>
                    <div>
                      <span className="font-medium">Email:</span>
                      <p className="text-sm">{selectedProperty.host.email}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="text-2xl font-bold">
                    ${selectedProperty.price_per_night}
                  </div>
                  <div className="text-sm text-muted-foreground">Per Night</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="text-2xl font-bold">
                    {selectedProperty.max_guests}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Max Guests
                  </div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <Bed className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="text-2xl font-bold">
                    {selectedProperty.bedrooms}
                  </div>
                  <div className="text-sm text-muted-foreground">Bedrooms</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <Bath className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="text-2xl font-bold">
                    {selectedProperty.bathrooms}
                  </div>
                  <div className="text-sm text-muted-foreground">Bathrooms</div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">
                    {(selectedProperty as any).total_bookings}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total Bookings
                  </div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">
                    ${((selectedProperty as any).total_revenue?.toLocaleString?.() || "0")}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total Revenue
                  </div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">
                    {((selectedProperty as any).average_rating?.toFixed?.(1) || "N/A")}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Average Rating
                  </div>
                </div>
              </div>

              {selectedProperty.amenities &&
                selectedProperty.amenities.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Amenities</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedProperty.amenities.map((amenity, index) => (
                        <Badge key={index} variant="outline">
                          {amenity}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Created:{" "}
                    {new Date(selectedProperty.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Updated:{" "}
                    {new Date(selectedProperty.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default withErrorBoundary(AdminPropertyManagement);
