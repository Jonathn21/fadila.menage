import React from "react";
import { UseFormReturn } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormValues } from "@/hooks/useProcessInternshipForm";

interface RemunerationSectionProps {
  form: UseFormReturn<FormValues>;
  isPaid: boolean;
}

const RemunerationSection: React.FC<RemunerationSectionProps> = ({
  form,
  isPaid,
}) => {

  const remunerationOptions = [
    { value: "45000", label: "45000 FCFA/mois" },
    { value: "55000", label: "55000 FCFA/mois" },
    { value: "80000", label: "80000 FCFA/mois" },
  ];

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="isPaid"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>Stage rémunéré</FormLabel>
              <FormDescription>
                Cochez cette case si le stage est rémunéré
              </FormDescription>
            </div>
          </FormItem>
        )}
      />

      {isPaid && (
        <FormField
          control={form.control}
          name="remunerationAmount"
          render={({ field }) => (
            <FormItem className="ml-6">
              <FormLabel>Montant de la rémunération mensuelle</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={String(field.value)}>
                <FormControl>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Sélectionnez le montant" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {remunerationOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Sélectionnez le montant mensuel brut de la rémunération
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  );
};

export default RemunerationSection;