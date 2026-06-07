// components/TrackApplication/SearchBar.tsx
import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

interface SearchBarProps {
  trackingCode: string;
  setTrackingCode: (code: string) => void;
  onSearch: () => void;
  isSearching: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  trackingCode,
  setTrackingCode,
  onSearch,
  isSearching
}) => {
  return (
    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
      <div className="flex-1">
        <label htmlFor="tracking-code" className="text-sm">
          Code de suivi
        </label>
        <Input
          id="tracking-code"
          placeholder="Code de suivi (ex: CEB-ABC123XYZ)"
          value={trackingCode}
          onChange={(e) => setTrackingCode(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && onSearch()}
          className="h-10 sm:h-11"
        />
      </div>
      <div className="flex items-end">
        <Button 
          onClick={onSearch} 
          disabled={isSearching} 
          className="w-full sm:w-auto h-10 sm:h-11 px-4 sm:px-6"
        >
          {isSearching ? (
            <>
              <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white mr-2"></div>
              <span className="text-sm">Recherche...</span>
            </>
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              Rechercher
            </>
          )}
        </Button>
      </div>
    </div>
  );
};