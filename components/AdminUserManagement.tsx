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
  Trash2,
  Eye,
  Shield,
  UserCheck,
  UserX,
  Mail,
  Phone,
  Calendar,
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

  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<"user" | "host" | "admin">("user");
  const [creatingUser, setCreatingUser] = useState(false);

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

      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role }),
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
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-bold">User Management</h1>
          <Button onClick={() => setCreateUserOpen(true)}>Create User</Button>
        </div>
        <p className="text-muted-foreground">
          Manage hosts, guests, and user accounts
        </p>
      </div>

      <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Create a new account and assign an initial role.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Email</div>
              <Input
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="user@example.com"
                type="email"
              />
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Password</div>
              <Input
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                placeholder="Temporary password"
                type="password"
              />
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Role</div>
              <Select value={newUserRole} onValueChange={(v) => setNewUserRole(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="host">Host</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setCreateUserOpen(false)}
                disabled={creatingUser}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  try {
                    setCreatingUser(true);
                    const { data: sessionData } = await supabase.auth.getSession();
                    const token = sessionData?.session?.access_token;
                    if (!token) {
                      throw new Error("No authentication token available");
                    }

                    const response = await fetch("/api/admin/users", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({
                        email: newUserEmail,
                        password: newUserPassword,
                        role: newUserRole,
                      }),
                    });

                    if (!response.ok) {
                      const err = await response.json().catch(() => ({}));
                      throw new Error(err?.details || err?.message || err?.error || "Failed to create user");
                    }

                    setNewUserEmail("");
                    setNewUserPassword("");
                    setNewUserRole("user");
                    setCreateUserOpen(false);
                    await loadUsers();
                  } catch (e) {
                    console.error("Create user failed:", e);
                  } finally {
                    setCreatingUser(false);
                  }
                }}
                disabled={creatingUser || !newUserEmail || !newUserPassword}
              >
                {creatingUser ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              +{stats.newThisMonth} new this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hosts</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalHosts}</div>
            <p className="text-xs text-muted-foreground">
              {((stats.totalHosts / stats.totalUsers) * 100).toFixed(1)}% of
              total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Verified Users
            </CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.verifiedUsers}</div>
            <p className="text-xs text-muted-foreground">
              {((stats.verifiedUsers / stats.totalUsers) * 100).toFixed(1)}%
              verified
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspended</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.suspendedUsers}</div>
            <p className="text-xs text-muted-foreground">
              {((stats.suspendedUsers / stats.totalUsers) * 100).toFixed(1)}%
              suspended
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
          <CardDescription>
            Manage user accounts and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Bookings</TableHead>
                <TableHead>Properties</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {user.first_name} {user.last_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {user.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
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
                  <TableCell>
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
                  <TableCell>{user.total_bookings}</TableCell>
                  <TableCell>{user.properties_count}</TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openUserDetails(user)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>

                      {!user.is_verified && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUserAction(user.id, "verify")}
                        >
                          <UserCheck className="h-4 w-4" />
                        </Button>
                      )}

                      {user.is_verified && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUserAction(user.id, "unverify")}
                        >
                          <UserX className="h-4 w-4" />
                        </Button>
                      )}

                      {!user.is_suspended ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <UserX className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Suspend User</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to suspend{" "}
                                {user.first_name} {user.last_name}? They will
                                not be able to access the platform until
                                unsuspended.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  handleUserAction(user.id, "suspend")
                                }
                              >
                                Suspend
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUserAction(user.id, "unsuspend")}
                        >
                          <UserCheck className="h-4 w-4" />
                        </Button>
                      )}

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete User</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to permanently delete{" "}
                              {user.first_name} {user.last_name}? This action
                              cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                handleUserAction(user.id, "delete")
                              }
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
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
