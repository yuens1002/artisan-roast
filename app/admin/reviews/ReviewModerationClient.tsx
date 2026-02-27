"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  DataTable,
  DataTableActionBar,
  DataTablePageSizeSelector,
  DataTablePagination,
} from "@/app/admin/_components/data-table";
import { useInfiniteScroll } from "@/app/admin/_components/data-table/hooks/useInfiniteScroll";
import type { ActionBarConfig } from "@/app/admin/_components/data-table/types";
import { Search, Filter, Loader2 } from "lucide-react";
import { useReviewsTable, type AdminReview } from "./hooks/useReviewsTable";
import { ReviewCard } from "./_components/ReviewCard";

type StatusFilter = "all" | "PUBLISHED" | "FLAGGED" | "PENDING";

const FLAG_REASONS = [
  "Inappropriate content",
  "Spam",
  "Off-topic",
  "Misleading",
  "Suspected fake review",
] as const;

export default function ReviewModerationClient() {
  const [allReviews, setAllReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const { toast } = useToast();

  // Dialogs
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<AdminReview | null>(
    null
  );
  const [flagCategory, setFlagCategory] = useState("");
  const [flagDetails, setFlagDetails] = useState("");
  const [replyText, setReplyText] = useState("");

  const fetchReviews = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/reviews");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setAllReviews(data.reviews);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load reviews",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchReviews();
    // Mark reviews as read on mount
    fetch("/api/admin/reviews/mark-read", { method: "POST" }).catch(() => {});
  }, [fetchReviews]);

  const filteredReviews = useMemo(
    () =>
      statusFilter === "all"
        ? allReviews
        : allReviews.filter((r) => r.status === statusFilter),
    [allReviews, statusFilter]
  );

  const handleFlag = useCallback((review: AdminReview) => {
    setSelectedReview(review);
    // Pre-populate when editing an existing flag
    if (review.status === "FLAGGED" && review.flagReason) {
      const emDashIdx = review.flagReason.indexOf(" — ");
      if (emDashIdx !== -1) {
        setFlagCategory(review.flagReason.slice(0, emDashIdx));
        setFlagDetails(review.flagReason.slice(emDashIdx + 3));
      } else {
        setFlagCategory(review.flagReason);
        setFlagDetails("");
      }
    } else {
      setFlagCategory("");
      setFlagDetails("");
    }
    setFlagDialogOpen(true);
  }, []);

  const handleApprove = useCallback(
    async (review: AdminReview) => {
      try {
        const res = await fetch(`/api/admin/reviews/${review.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "approve" }),
        });
        if (!res.ok) throw new Error();
        toast({ title: "Review approved" });
        fetchReviews();
      } catch {
        toast({
          title: "Error",
          description: "Failed to approve review",
          variant: "destructive",
        });
      }
    },
    [fetchReviews, toast]
  );

  const handleReply = useCallback((review: AdminReview) => {
    setSelectedReview(review);
    setReplyText(review.adminResponse ?? "");
    setReplyDialogOpen(true);
  }, []);

  const handleDelete = useCallback((review: AdminReview) => {
    setSelectedReview(review);
    setDeleteDialogOpen(true);
  }, []);

  const confirmFlag = async () => {
    if (!selectedReview || !flagCategory) return;
    const reason = flagDetails.trim()
      ? `${flagCategory} — ${flagDetails.trim()}`
      : flagCategory;
    try {
      const res = await fetch(`/api/admin/reviews/${selectedReview.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "flag", reason }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Review flagged" });
      setFlagDialogOpen(false);
      fetchReviews();
    } catch {
      toast({
        title: "Error",
        description: "Failed to flag review",
        variant: "destructive",
      });
    }
  };

  const confirmReply = async () => {
    if (!selectedReview) return;
    try {
      const res = await fetch(`/api/admin/reviews/${selectedReview.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reply", response: replyText }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Reply saved" });
      setReplyDialogOpen(false);
      fetchReviews();
    } catch {
      toast({
        title: "Error",
        description: "Failed to save reply",
        variant: "destructive",
      });
    }
  };

  const confirmDelete = async () => {
    if (!selectedReview) return;
    try {
      const res = await fetch(`/api/admin/reviews/${selectedReview.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast({ title: "Review deleted" });
      setDeleteDialogOpen(false);
      fetchReviews();
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete review",
        variant: "destructive",
      });
    }
  };

  const {
    table,
    searchQuery,
    setSearchQuery,
    activeFilter,
    setActiveFilter,
    filterConfigs,
    getActionItems,
  } = useReviewsTable({
    reviews: filteredReviews,
    onFlag: handleFlag,
    onApprove: handleApprove,
    onReply: handleReply,
    onDelete: handleDelete,
  });

  // Infinite scroll for mobile card grid
  const allFilteredRows = table.getFilteredRowModel().rows;
  const batchSize = table.getState().pagination.pageSize;
  const { visibleCount, sentinelRef, hasMore, reset: resetScroll } = useInfiniteScroll({
    totalCount: allFilteredRows.length,
    batchSize,
  });

  // Reset infinite scroll when filters/search/status change
  const scrollKey = `${statusFilter}|${searchQuery}|${JSON.stringify(activeFilter)}`;
  const prevScrollKey = useRef(scrollKey);
  useEffect(() => {
    if (scrollKey !== prevScrollKey.current) {
      prevScrollKey.current = scrollKey;
      resetScroll();
    }
  }, [scrollKey, resetScroll]);

  const actionBarConfig: ActionBarConfig = {
    left: [
      {
        type: "custom",
        content: (
          <Tabs
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
          >
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="PUBLISHED">Published</TabsTrigger>
              <TabsTrigger value="FLAGGED">Flagged</TabsTrigger>
              <TabsTrigger value="PENDING">Pending</TabsTrigger>
            </TabsList>
          </Tabs>
        ),
      },
      {
        type: "search",
        value: searchQuery,
        onChange: setSearchQuery,
        placeholder: "Search reviews...",
        collapse: { icon: Search },
      },
      {
        type: "filter",
        configs: filterConfigs,
        activeFilter,
        onFilterChange: setActiveFilter,
        collapse: { icon: Filter },
      },
    ],
    right: [
      {
        type: "custom",
        content: (
          <span className="text-sm text-muted-foreground whitespace-nowrap pr-4 pl-[11px] md:pl-0">
            {table.getFilteredRowModel().rows.length} Reviews
          </span>
        ),
      },
      {
        type: "custom",
        content: (
          <div className="hidden lg:block">
            <DataTablePageSizeSelector table={table} />
          </div>
        ),
      },
      {
        type: "custom",
        content: (
          <div className="hidden md:block">
            <DataTablePagination table={table} />
          </div>
        ),
      },
    ],
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Loading reviews...
      </div>
    );
  }

  return (
    <div>
      <DataTableActionBar config={actionBarConfig} className="flex-col-reverse items-start gap-1 md:flex-row md:items-center" />

      {/* Desktop table */}
      <div className="hidden md:block">
        <DataTable
          table={table}
          emptyMessage="No reviews found."
        />
      </div>

      {/* Mobile cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
        {allFilteredRows.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 col-span-full">
            No reviews found.
          </p>
        ) : (
          <>
            {allFilteredRows.slice(0, visibleCount).map((row) => (
              <ReviewCard
                key={row.original.id}
                review={row.original}
                actionItems={getActionItems(row.original)}
              />
            ))}
            {hasMore && (
              <div
                ref={sentinelRef as React.RefObject<HTMLDivElement>}
                className="col-span-full flex justify-center py-4"
              >
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </>
        )}
      </div>

      {/* Flag Dialog */}
      <Dialog open={flagDialogOpen} onOpenChange={setFlagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Flag Review</DialogTitle>
            <DialogDescription>
              This review will be shown on the storefront with a warning banner.
              Please provide a reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="flag-reason">Reason</Label>
              <Select value={flagCategory} onValueChange={setFlagCategory}>
                <SelectTrigger id="flag-reason">
                  <SelectValue placeholder="Select a reason..." />
                </SelectTrigger>
                <SelectContent>
                  {FLAG_REASONS.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {reason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="flag-details">
                Details{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Textarea
                id="flag-details"
                placeholder="Additional details..."
                value={flagDetails}
                onChange={(e) => setFlagDetails(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFlagDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              className="bg-amber-600 hover:bg-amber-700"
              onClick={confirmFlag}
              disabled={!flagCategory}
            >
              Flag Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reply Dialog */}
      <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reply to Review</DialogTitle>
            <DialogDescription>
              Your response will be displayed publicly on the storefront below
              the review.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Write your response..."
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReplyDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={confirmReply} disabled={!replyText.trim()}>
              Save Reply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete AlertDialog */}
      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Review</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this review. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={confirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
