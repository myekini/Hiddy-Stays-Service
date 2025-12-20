"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface BackButtonProps {
  to?: string;
  className?: string;
  children?: React.ReactNode;
}

const BackButton: React.FC<BackButtonProps> = ({
  to,
  className = "",
  children = "Back",
}) => {
  const router = useRouter();

  const handleBack = () => {
    if (to) {
      router.push(to);
    } else {
      router.back();
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleBack}
      className={`flex items-center gap-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 ${className}`}
    >
      <ArrowLeft className="w-4 h-4" />
      {children}
    </Button>
  );
};

export default BackButton;
