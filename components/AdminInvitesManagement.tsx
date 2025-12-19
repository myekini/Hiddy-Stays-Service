"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type Invite = {
  id: string;
  email: string;
  role: string;
  token: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
};

type InviteRole = "admin" | "super_admin";

type InviteStatus = "pending" | "accepted" | "revoked" | "all";

export default function AdminInvitesManagement() {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [statusFilter, setStatusFilter] = useState<InviteStatus>("pending");

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InviteRole>("admin");
  const [isCreating, setIsCreating] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const filteredInvites = useMemo(() => {
    if (statusFilter === "all") return invites;
    if (statusFilter === "accepted") return invites.filter((i) => i.accepted_at);
    if (statusFilter === "revoked") return invites.filter((i) => i.revoked_at);
    return invites.filter((i) => !i.accepted_at && !i.revoked_at);
  }, [invites, statusFilter]);

  const loadRole = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", userId)
      .single();

    setIsSuperAdmin(profile?.role === "super_admin");
  };

  const loadInvites = async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("No authentication token available");

      const qs = statusFilter === "all" ? "" : `?status=${encodeURIComponent(statusFilter)}`;
      const resp = await fetch(`/api/admin/invites${qs}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(json?.error || json?.message || "Failed to load invites");

      setInvites((json?.invites || []) as Invite[]);
    } catch (error: any) {
      toast({
        title: "Failed to load invites",
        description: error?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvite = async () => {
    setIsCreating(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("No authentication token available");

      const resp = await fetch("/api/admin/invites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email, role }),
      });

      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(json?.error || json?.message || "Failed to create invite");

      const acceptUrl = json?.acceptUrl as string | undefined;
      if (acceptUrl) {
        try {
          await navigator.clipboard.writeText(acceptUrl);
          toast({
            title: "Invite created",
            description: "Invite link copied to clipboard.",
          });
        } catch {
          toast({
            title: "Invite created",
            description: "Invite link generated.",
          });
        }
      } else {
        toast({ title: "Invite created" });
      }

      setEmail("");
      await loadInvites();
    } catch (error: any) {
      toast({
        title: "Failed to create invite",
        description: error?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = async (inviteId: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("No authentication token available");

      const resp = await fetch(`/api/admin/invites?id=${encodeURIComponent(inviteId)}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(json?.error || json?.message || "Failed to revoke invite");

      toast({ title: "Invite revoked" });
      await loadInvites();
    } catch (error: any) {
      toast({
        title: "Failed to revoke invite",
        description: error?.message || "Unknown error",
        variant: "destructive",
      });
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "-";
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  useEffect(() => {
    loadRole();
  }, []);

  useEffect(() => {
    loadInvites();
  }, [statusFilter]);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Admin Invites</h2>
            <p className="text-sm text-muted-foreground">Invite new admins by email</p>
          </div>

          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as InviteStatus)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="revoked">Revoked</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={loadInvites} disabled={loading}>
              Refresh
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@email.com" />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as InviteRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                {isSuperAdmin && <SelectItem value="super_admin">Super Admin</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button className="w-full" onClick={handleCreateInvite} disabled={isCreating || !email.trim()}>
              Create Invite
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredInvites.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No invites found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvites.map((invite) => {
                  const status = invite.revoked_at
                    ? "revoked"
                    : invite.accepted_at
                      ? "accepted"
                      : "pending";

                  return (
                    <TableRow key={invite.id}>
                      <TableCell className="font-medium">{invite.email}</TableCell>
                      <TableCell>
                        <Badge variant={invite.role === "super_admin" ? "destructive" : "secondary"}>
                          {invite.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            status === "accepted"
                              ? "default"
                              : status === "revoked"
                                ? "destructive"
                                : "outline"
                          }
                        >
                          {status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(invite.created_at)}</TableCell>
                      <TableCell>{formatDate(invite.expires_at)}</TableCell>
                      <TableCell className="text-right">
                        {status === "pending" ? (
                          <Button variant="destructive" size="sm" onClick={() => handleRevoke(invite.id)}>
                            Revoke
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
