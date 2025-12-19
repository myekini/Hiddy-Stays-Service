import React, { useState, useEffect, useCallback } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  UserCheck,
  Mail,
  Phone,
  Calendar,
  MoreHorizontal,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  is_host: boolean;
  role?: string;
  is_verified: boolean;
  is_suspended: boolean;
  created_at: string;
  last_login: string;
  total_bookings?: number;
  total_revenue?: number;
  properties_count?: number;
}

interface UserStats {
  totalUsers: number;
  totalHosts: number;
  totalGuests: number;
  verifiedUsers: number;
  suspendedUsers: number;
  newThisMonth: number;
  activeThisMonth: number;
}

const AdminUserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats>({
    totalUsers: 0,
    totalHosts: 0,
    totalGuests: 0,
    verifiedUsers: 0,
    suspendedUsers: 0,
    newThisMonth: 0,
    activeThisMonth: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);

  const filterUsers = useCallback(() => {
    let filtered = users;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.last_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Role filter
    if (filterRole !== "all") {
      filtered = filtered.filter((user) => {
        if (filterRole === "hosts") return user.is_host;
        if (filterRole === "guests") return !user.is_host;
        return true;
      });
    }

    // Status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter((user) => {
        if (filterStatus === "verified") return user.is_verified;
        if (filterStatus === "unverified") return !user.is_verified;
        if (filterStatus === "suspended") return user.is_suspended;
        return true;
      });
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, filterRole, filterStatus]);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        throw new Error("No authentication token available");
      }

      const response = await fetch("/api/admin/users?limit=200&offset=0", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || data?.error || "Failed to load users");
      }

      const apiUsers = (data?.users || []) as any[];
      const transformedUsers: User[] = apiUsers.map((u: any) => ({
        id: u.user_id || u.id,
        email: u.email || u?.profiles?.email || "",
        first_name: u.first_name || "",
        last_name: u.last_name || "",
        phone: u.phone || "",
        role: u.role || "user",
        is_host: u.is_host || u.role === "host" || u.role === "admin",
        is_verified: u.is_verified || false,
        is_suspended: u.is_suspended || false,
        created_at: u.created_at,
        last_login: u.last_login_at || u.last_login || u.created_at,
        total_bookings: u.total_bookings || 0,
        total_revenue: u.total_revenue || 0,
        properties_count: u.properties_count || 0,
      }));

      setUsers(transformedUsers);
      calculateStats(transformedUsers);
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const calculateStats = (userList: User[]) => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats: UserStats = {
      totalUsers: userList.length,
      totalHosts: userList.filter((u) => u.is_host).length,
      totalGuests: userList.filter((u) => !u.is_host).length,
      verifiedUsers: userList.filter((u) => u.is_verified).length,
      suspendedUsers: userList.filter((u) => u.is_suspended).length,
      newThisMonth: userList.filter((u) => new Date(u.created_at) >= thisMonth)
        .length,
      activeThisMonth: userList.filter(
        (u) => new Date(u.last_login) >= thisMonth
      ).length,
    };

    setStats(stats);
  };

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    filterUsers();
  }, [filterUsers]);

  const handleUserAction = async (userId: string, action: string) => {
    try {
      let updateData: any = {};

      switch (action) {
        case "verify":
          updateData = { is_verified: true };
          break;
        case "unverify":
          updateData = { is_verified: false };
          break;
        case "suspend":
          updateData = { is_suspended: true };
          break;
        case "unsuspend":
          updateData = { is_suspended: false };
          break;
        case "delete": {
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData?.session?.access_token;
          if (!token) {
            throw new Error("No authentication token available");
          }

          const response = await fetch(`/api/admin/users?userId=${encodeURIComponent(userId)}`, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err?.message || err?.error || "Failed to delete user");
          }
          break;
        }
      }

      if (Object.keys(updateData).length > 0) {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) {
          throw new Error("No authentication token available");
        }

        const response = await fetch("/api/admin/users", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            userId,
            updates: updateData,
          }),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err?.message || err?.error || "Failed to update user");
        }
      }

      // Reload users
      await loadUsers();
    } catch (error) {
      console.error(`Error performing ${action} on user:`, error);
    }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        throw new Error("No authentication token available");
      }

      const response = await fetch("/api/admin/users", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          updates: { role },
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.message || err?.error || "Failed to update user role");
      }

      await loadUsers();
    } catch (error) {
      console.error("Error updating role:", error);
    }
  };

  const openUserDetails = (user: User) => {
    setSelectedUser(user);
    setUserDetailsOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">User Management</h1>
            <p className="text-sm text-muted-foreground">
              Manage hosts, guests, and user accounts
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            {filteredUsers.length} shown
            <span className="mx-2">•</span>
            {stats.totalUsers} total
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="sticky top-4 z-10 rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10">
        <div className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="hosts">Hosts Only</SelectItem>
                <SelectItem value="guests">Guests Only</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="unverified">Unverified</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10">
        <CardHeader className="pb-3">
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
          <CardDescription>
            Manage user accounts and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow>
                <TableHead className="h-10 px-3 text-xs">User</TableHead>
                <TableHead className="h-10 px-3 text-xs">Role</TableHead>
                <TableHead className="h-10 px-3 text-xs">Status</TableHead>
                <TableHead className="h-10 px-3 text-xs text-right">Bookings</TableHead>
                <TableHead className="h-10 px-3 text-xs text-right">Properties</TableHead>
                <TableHead className="h-10 px-3 text-xs">Joined</TableHead>
                <TableHead className="h-10 px-3 text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="p-3">
                    <div>
                      <div className="font-medium">
                        {user.first_name} {user.last_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {user.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="p-3">
                    <Select
                      value={(user.role || (user.is_host ? "host" : "user")) as string}
                      onValueChange={(value) => handleRoleChange(user.id, value)}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="host">Host</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="p-3">
                    <div className="flex gap-1">
                      {user.is_verified && (
                        <Badge variant="outline" className="text-green-600">
                          Verified
                        </Badge>
                      )}
                      {user.is_suspended && (
                        <Badge variant="destructive">Suspended</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="p-3 text-right">{user.total_bookings}</TableCell>
                  <TableCell className="p-3 text-right">{user.properties_count}</TableCell>
                  <TableCell className="p-3">
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="p-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onSelect={() => openUserDetails(user)}>
                          View details
                        </DropdownMenuItem>

                        {!user.is_verified && (
                          <DropdownMenuItem onSelect={() => handleUserAction(user.id, "verify")}>
                            Verify
                          </DropdownMenuItem>
                        )}
                        {user.is_verified && (
                          <DropdownMenuItem onSelect={() => handleUserAction(user.id, "unverify")}>
                            Mark as unverified
                          </DropdownMenuItem>
                        )}

                        {user.is_suspended ? (
                          <DropdownMenuItem onSelect={() => handleUserAction(user.id, "unsuspend")}>
                            Unsuspend
                          </DropdownMenuItem>
                        ) : (
                          <>
                            <DropdownMenuSeparator />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem className="text-destructive focus:text-destructive">
                                  Suspend
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Suspend User</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to suspend {user.first_name} {user.last_name}? They will not be able to access the platform until unsuspended.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleUserAction(user.id, "suspend")}>
                                    Suspend
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
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
                              <AlertDialogTitle>Delete User</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to permanently delete {user.first_name} {user.last_name}? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleUserAction(user.id, "delete")}
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

      {/* User Details Dialog */}
      <Dialog open={userDetailsOpen} onOpenChange={setUserDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              Detailed information about the selected user
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h3 className="font-semibold mb-2">Personal Information</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {selectedUser.first_name} {selectedUser.last_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{selectedUser.email}</span>
                    </div>
                    {selectedUser.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{selectedUser.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Account Status</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={selectedUser.is_host ? "default" : "secondary"}
                      >
                        {selectedUser.is_host ? "Host" : "Guest"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedUser.is_verified ? (
                        <Badge variant="outline" className="text-green-600">
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-yellow-600">
                          Unverified
                        </Badge>
                      )}
                    </div>
                    {selectedUser.is_suspended && (
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">Suspended</Badge>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">
                    {selectedUser.total_bookings}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total Bookings
                  </div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">
                    {selectedUser.properties_count}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Properties
                  </div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">
                    ${selectedUser.total_revenue?.toLocaleString() || "0"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total Revenue
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Joined:{" "}
                    {new Date(selectedUser.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Last Login:{" "}
                    {new Date(selectedUser.last_login).toLocaleDateString()}
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

export default AdminUserManagement;
