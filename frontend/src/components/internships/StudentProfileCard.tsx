import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Mail, Phone, User, Calendar as CalendarIcon } from "lucide-react";

interface StudentProps {
  student: {
    name: string;
    email: string;
    phone: string;
    avatar: string;
    photo?: string;
    program: string;
    year: string;
  };
  showActions?: boolean;
}

const StudentProfileCard = ({ student }: StudentProps) => {
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false);

  const handlePhotoClick = () => {
    if (student.photo) {
      setIsPhotoDialogOpen(true);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Étudiant</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-10 mb-4">
            {/* Photo column */}
            <div className="flex-shrink-0">
              <Avatar
                className="h-24 w-24 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={handlePhotoClick}
              >
                <AvatarImage src={student.photo} alt={student.name} />
                <AvatarFallback className="text-lg ">
                  {student.avatar}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Information column */}
            <div className="flex-1 space-y-2">
              <p className="font-medium text-sm">{student.name}</p>

              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{student.email}</span>
              </div>

              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{student.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {student.program}, {student.year}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isPhotoDialogOpen} onOpenChange={setIsPhotoDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Photo de {student.name}</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center p-4">
            <img
              src={student.photo}
              alt={student.name}
              className="max-w-full max-h-[60vh] object-contain rounded-lg border"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default StudentProfileCard;
