"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SearchPaginationProps {
  currentPage: number;
  totalPages: number;
  query: string;
}

export function SearchPagination({ currentPage, totalPages, query }: SearchPaginationProps) {
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const showPages = 5;
    
    let start = Math.max(1, currentPage - Math.floor(showPages / 2));
    const end = Math.min(totalPages, start + showPages - 1);
    
    if (end - start + 1 < showPages) {
      start = Math.max(1, end - showPages + 1);
    }

    if (start > 1) {
      pages.push(1);
      if (start > 2) pages.push("...");
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < totalPages) {
      if (end < totalPages - 1) pages.push("...");
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="flex items-center justify-center gap-2 mt-12">
      <Button
        variant="outline"
        size="icon"
        disabled={currentPage <= 1}
        asChild={currentPage > 1}
      >
        {currentPage > 1 ? (
          <Link href={`/search?q=${encodeURIComponent(query)}&page=${currentPage - 1}`}>
            <ChevronLeft className="h-4 w-4" />
          </Link>
        ) : (
          <span><ChevronLeft className="h-4 w-4" /></span>
        )}
      </Button>

      <div className="flex items-center gap-1">
        {getPageNumbers().map((page, index) => (
          typeof page === "number" ? (
            <Button
              key={page}
              variant={page === currentPage ? "default" : "outline"}
              size="icon"
              asChild={page !== currentPage}
            >
              {page === currentPage ? (
                <span>{page}</span>
              ) : (
                <Link href={`/search?q=${encodeURIComponent(query)}&page=${page}`}>
                  {page}
                </Link>
              )}
            </Button>
          ) : (
            <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
              {page}
            </span>
          )
        ))}
      </div>

      <Button
        variant="outline"
        size="icon"
        disabled={currentPage >= totalPages}
        asChild={currentPage < totalPages}
      >
        {currentPage < totalPages ? (
          <Link href={`/search?q=${encodeURIComponent(query)}&page=${currentPage + 1}`}>
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <span><ChevronRight className="h-4 w-4" /></span>
        )}
      </Button>
    </div>
  );
}
