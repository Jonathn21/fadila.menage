import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Trash2, CheckCircle, Bell, Mail, MessageCircle, AlertCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface DataTableProps {
  columns: {
    key: string;
    label: string;
    render?: (value: any, item: any) => React.ReactNode;
  }[];
  data: any[];
  emptyMessage: React.ReactNode;
  onRowClick?: (item: any) => void;
  onDelete?: (id: string) => void;
  onMarkAsRead?: (id: string) => void;
  onViewDetails?: (id: string) => void;
  itemsPerPage?: number;
  rowClassName?: (item: any) => string;
}

// 🔥 MAPPING DES ICÔNES POUR LES NOTIFICATIONS
const NOTIFICATION_ICONS: { [key: string]: React.ComponentType<any> } = {
  'alert': AlertCircle,
  'message': MessageCircle,
  'email': Mail,
  'default': Bell
};

const DataTable: React.FC<DataTableProps> = ({
  columns,
  data,
  emptyMessage,
  onRowClick,
  onDelete,
  onMarkAsRead,
  onViewDetails,
  itemsPerPage = 10,
  rowClassName,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();

  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = data.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // 🔥 FONCTION POUR OBTENIR L'ICÔNE DE NOTIFICATION
  const getNotificationIcon = (type: string, customIcon?: string | null) => {
    if (customIcon && NOTIFICATION_ICONS[customIcon]) {
      const IconComponent = NOTIFICATION_ICONS[customIcon];
      return <IconComponent className="h-4 w-4 text-red-500" />;
    }
    
    switch (type) {
      case "alert":
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case "message":
        return <MessageCircle className="h-4 w-4 text-red-500" />;
      case "email":
        return <Mail className="h-4 w-4 text-green-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  // 🔥 FONCTION POUR LE BADGE DE TYPE
  //const getNotificationBadge = (type: string) => {
  //  switch (type) {
  //    case "alert":
  //      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">Alerte</Badge>;
  //    case "message":
   //     return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">Message</Badge>;
  //    case "email":
   //     return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">Email</Badge>;
  //    default:
  //      return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 text-xs">Info</Badge>;
  //  }
 // };

  // 🔥 FORMATAGE DE DATE POUR LES NOTIFICATIONS
  const formatNotificationDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return (
        <>
          <div>Aujourd'hui</div>
          <div className="text-xs">
            {date.toLocaleTimeString("fr-FR", {
              hour: "2-digit",
              minute: "2-digit"
            })}
          </div>
        </>
      );
    }
    
    return (
      <>
        <div>
          {date.toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
          })}
        </div>
        <div className="text-xs">
          {date.toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit"
          })}
        </div>
      </>
    );
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pagesToShow = [];

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - 1 && i <= currentPage + 1)
      ) {
        pagesToShow.push(i);
      } else if (
        (i === currentPage - 2 && currentPage > 3) ||
        (i === currentPage + 2 && currentPage < totalPages - 2)
      ) {
        pagesToShow.push(-1);
      }
    }

    const uniquePages = [...new Set(pagesToShow)].sort((a, b) => a - b);

    return (
      <Pagination className="mt-4">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              className={
                currentPage === 1
                  ? "pointer-events-none opacity-50"
                  : "cursor-pointer"
              }
            />
          </PaginationItem>

          {uniquePages.map((page, index) =>
            page === -1 ? (
              <PaginationItem key={`ellipsis-${index}`}>
                <PaginationLink>...</PaginationLink>
              </PaginationItem>
            ) : (
              <PaginationItem key={page}>
                <PaginationLink
                  isActive={page === currentPage}
                  onClick={() => handlePageChange(page)}
                  className="cursor-pointer"
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            )
          )}

          <PaginationItem>
            <PaginationNext
              onClick={() =>
                handlePageChange(Math.min(totalPages, currentPage + 1))
              }
              className={
                currentPage === totalPages
                  ? "pointer-events-none opacity-50"
                  : "cursor-pointer"
              }
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  // 🔥 DÉTERMINER SI ON A BESOIN DE LA COLONNE ACTIONS
  const hasActions = onRowClick || onDelete || onMarkAsRead || onViewDetails;

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key}>{column.label}</TableHead>
            ))}
            {hasActions && (
              <TableHead className="text-center sticky right-0 bg-background">
                Actions
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentData.length > 0 ? (
            currentData.map((item) => (
              <TableRow 
                key={item.id}
                className={`
                  ${rowClassName ? rowClassName(item) : ''}
                  ${onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}
                  ${!item.lu ? ' border-l-4 border-l-red-500' : ''}
                `}
                onClick={() => onRowClick && onRowClick(item)}
              >
                {columns.map((column) => (
                  <TableCell key={`${item.id}-${column.key}`}>
                    {column.render
                      ? column.render(item[column.key], item)
                      : item[column.key]}
                  </TableCell>
                ))}
                {hasActions && (
                  <TableCell className="text-right sticky right-0 bg-background">
                    <div className="flex items-center justify-end gap-1">
                      {/* Marquer comme lu */}
                      {onMarkAsRead && !item.lu && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMarkAsRead(item.id);
                          }}
                          title="Marquer comme lu"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}

                      {/* Voir les détails */}
                      {onViewDetails && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewDetails(item.id);
                          }}
                          title="Voir les détails"
                          
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}

                      {/* Supprimer */}
                      {onDelete && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(item.id);
                          }}
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}

                     
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length + (hasActions ? 1 : 0)}
                className="h-24 text-center"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {renderPagination()}
    </div>
  );
};

export default DataTable;