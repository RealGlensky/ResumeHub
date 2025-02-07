import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ArrowDownAZ, ArrowUpAZ, Calendar, Filter } from "lucide-react"

export type SortOption = {
  type: 'date' | 'user' | 'mode';
  order: 'asc' | 'desc';
}

interface FilterBarProps {
  onSortChange: (sort: SortOption) => void;
  activeSort?: SortOption;
}

export function NetworkResumeFilters({ onSortChange, activeSort }: FilterBarProps) {
  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            {activeSort ? `Sort by ${activeSort.type}` : 'Sort by'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[200px]">
          <DropdownMenuItem 
            onClick={() => onSortChange({ type: 'date', order: 'desc' })}
            className="gap-2"
          >
            <Calendar className="h-4 w-4" />
            Newest first
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => onSortChange({ type: 'date', order: 'asc' })}
            className="gap-2"
          >
            <Calendar className="h-4 w-4" />
            Oldest first
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => onSortChange({ type: 'user', order: 'asc' })}
            className="gap-2"
          >
            <ArrowDownAZ className="h-4 w-4" />
            Username (A-Z)
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => onSortChange({ type: 'user', order: 'desc' })}
            className="gap-2"
          >
            <ArrowUpAZ className="h-4 w-4" />
            Username (Z-A)
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => onSortChange({ type: 'mode', order: 'asc' })}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            Mode (Share first)
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => onSortChange({ type: 'mode', order: 'desc' })}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            Mode (Collaborate first)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
