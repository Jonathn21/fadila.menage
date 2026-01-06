
import React from "react";
import { Search, FilterX } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

interface FilterOption {
  value: string;
  label: string;
}

interface FilterConfig {
  name: string;
  placeholder: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

interface FilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  filters: FilterConfig[];
  onResetFilters: () => void;
}

const FilterBar: React.FC<FilterBarProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  filters,
  onResetFilters
}) => {
  const hasActiveFilters = () => {
    return filters.some(filter => {
      // Check if the filter is not set to its default value (first option)
      const defaultValue = filter.options[0]?.value;
      return filter.value !== defaultValue;
    }) || searchValue !== "";
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start mb-6">
      <div className="relative flex-1">
        <Label htmlFor="search-input" className="mb-1 block">Recherche</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            id="search-input"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>
      
      {filters.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-4">
            {filters.map((filter) => (
              <div key={filter.name} className="flex flex-col gap-1">
                <Label htmlFor={`filter-${filter.name}`}>{filter.label || filter.placeholder}</Label>
                <Select 
                  value={filter.value} 
                  onValueChange={filter.onChange}
                >
                  <SelectTrigger id={`filter-${filter.name}`} className="w-[155px]">
                    <SelectValue placeholder={filter.placeholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {filter.options.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          
          <Button 
            variant="outline" 
            onClick={onResetFilters}
            size="sm"
            className={`self-end mt-2 flex items-center gap-1 ${!hasActiveFilters() ? 'opacity-50' : ''}`}
            disabled={!hasActiveFilters()}
          >
            <FilterX className="h-4 w-4" />
            Réinitialiser
          </Button>
        </div>
      )}
    </div>
  );
};

export default FilterBar;
