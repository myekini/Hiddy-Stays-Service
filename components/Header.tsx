"use client";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Menu,
  User,
  LogOut,
  X,
  Shield,
  Home,
  Calendar,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/ThemeToggle";
import LogoImage from "@/components/LogoImage";

const Header = () => {
  const { user, signOut, hasPermission } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const checkPermissions = async () => {
      if (user && hasPermission) {
        const [hostCheck, adminCheck] = await Promise.all([
          hasPermission("host"),
          hasPermission("admin"),
        ]);
        setIsHost(hostCheck);
        setIsAdmin(adminCheck);
      } else {
        setIsHost(false);
        setIsAdmin(false);
      }
    };

    checkPermissions();
  }, [user, hasPermission]);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      if (isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <>
      <header className={`nav-modern ${isScrolled ? "scrolled" : ""}`}>
        <div className="container mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative overflow-hidden rounded-full border border-border/50 shadow-sm group-hover:shadow-md transition-all duration-300">
              <LogoImage size="md" variant="icon" className="w-10 h-10" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight hidden sm:block text-foreground group-hover:text-primary transition-colors">
              HiddyStays
            </span>
          </Link>

          {/* Navigation - Hidden on mobile */}
          <nav className="hidden lg:flex items-center space-x-8">
            <a
              href="#features"
              className="text-muted-foreground hover:text-brand-600 transition-all duration-300 font-medium relative group"
            >
              How It Works
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brand-500 transition-all duration-300 group-hover:w-full"></span>
            </a>
            <Link
              href="/contact"
              className="text-muted-foreground hover:text-brand-600 transition-all duration-300 font-medium relative group"
            >
              Contact
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brand-500 transition-all duration-300 group-hover:w-full"></span>
            </Link>
          </nav>

          {/* User Actions */}
          <div className="flex items-center space-x-3">
            <ThemeToggle />
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex items-center space-x-2 h-10 px-3 hover:bg-brand-50 dark:hover:bg-brand-950 hover:border-brand-200 transition-all duration-200"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage
                        src={user.user_metadata?.avatar_url}
                        alt={user.user_metadata?.first_name || "User"}
                      />
                      <AvatarFallback className="bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 text-xs">
                        {user.user_metadata?.first_name?.[0] ||
                          user.email?.[0] ||
                          "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline text-sm font-medium">
                      {user.user_metadata?.first_name ||
                        user.email?.split("@")[0] ||
                        "Account"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2 border-b border-neutral-200">
                    <p className="text-sm font-medium text-neutral-900">
                      {user.user_metadata?.first_name || "Welcome"}
                    </p>
                    <p className="text-xs text-neutral-500">{user.email}</p>
                  </div>

                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      Profile
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link href="/bookings" className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      My Bookings
                    </Link>
                  </DropdownMenuItem>

                  {isHost && (
                    <DropdownMenuItem asChild>
                      <Link
                        href="/host-dashboard"
                        className="flex items-center"
                      >
                        <Home className="w-4 h-4 mr-2" />
                        Host Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}

                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/admin" className="flex items-center">
                          <Shield className="w-4 h-4 mr-2" />
                          Admin Dashboard
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}

                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/auth">
                <Button variant="brandOnBlack" className="flex items-center space-x-2 h-10 px-4">
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign In</span>
                </Button>
              </Link>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden text-muted-foreground p-2 h-10 w-10 hover:bg-muted transition-colors duration-200"
              onClick={toggleMobileMenu}
            >
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Modern Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="mobile-menu-modern" onClick={toggleMobileMenu}>
          <div
            className="mobile-menu-content-modern"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Mobile Header */}
              <div className="flex items-center justify-between mb-8">
                <LogoImage size="sm" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-2 h-8 w-8"
                  onClick={toggleMobileMenu}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Mobile Navigation */}
              <nav className="space-y-2 mb-8">
                <a
                  href="#features"
                  className="flex items-center px-4 py-3 text-muted-foreground hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950 rounded-lg transition-all duration-200"
                  onClick={toggleMobileMenu}
                >
                  <Home className="w-4 h-4 mr-3" />
                  How It Works
                </a>
                <Link
                  href="/contact"
                  className="flex items-center px-4 py-3 text-muted-foreground hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950 rounded-lg transition-all duration-200"
                  onClick={toggleMobileMenu}
                >
                  <User className="w-4 h-4 mr-3" />
                  Contact
                </Link>
              </nav>

              {/* Mobile User Section */}
              <div className="pt-6 border-t border-border">
                {user ? (
                  <div className="space-y-3">
                    <div className="px-4 py-2 text-sm text-muted-foreground">
                      Welcome,{" "}
                      <span className="font-medium text-foreground">
                        {user.user_metadata?.first_name ||
                          user.email?.split("@")[0] ||
                          "User"}
                      </span>
                    </div>

                    <Link
                      href="/profile"
                      className="flex items-center px-4 py-3 text-muted-foreground hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950 rounded-lg transition-all duration-200"
                      onClick={toggleMobileMenu}
                    >
                      <User className="w-4 h-4 mr-3" />
                      Profile
                    </Link>

                    <Link
                      href="/bookings"
                      className="flex items-center px-4 py-3 text-muted-foreground hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950 rounded-lg transition-all duration-200"
                      onClick={toggleMobileMenu}
                    >
                      <Search className="w-4 h-4 mr-3" />
                      My Bookings
                    </Link>

                    {isHost && (
                      <Link
                        href="/host-dashboard"
                        className="flex items-center px-4 py-3 text-muted-foreground hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950 rounded-lg transition-all duration-200"
                        onClick={toggleMobileMenu}
                      >
                        <Home className="w-4 h-4 mr-3" />
                        Host Dashboard
                      </Link>
                    )}

                    {isAdmin && (
                      <Link
                        href="/admin"
                        className="flex items-center px-4 py-3 text-muted-foreground hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950 rounded-lg transition-all duration-200"
                        onClick={toggleMobileMenu}
                      >
                        <Shield className="w-4 h-4 mr-3" />
                        Admin Dashboard
                      </Link>
                    )}

                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center px-4 py-3 text-left text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200"
                    >
                      <LogOut className="w-4 h-4 mr-3" />
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <Link href="/auth" onClick={toggleMobileMenu}>
                    <Button variant="brandOnBlack" className="w-full">
                      Sign In
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
