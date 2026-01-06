import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


const applicationSchema = z.object({
  firstName: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  lastName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Adresse e-mail invalide"),
  phone: z.string().min(10, "Numéro de téléphone invalide"),
  school: z.string().min(2, "Le nom de l'école est requis"),
  program: z.string().min(2, "Le programme d'études est requis"),
  company: z.string().min(2, "Le nom de l'entreprise est requis"),
  startDate: z.date({
    required_error: "La date de début est obligatoire",
  }),
  endDate: z.date({
    required_error: "La date de fin est obligatoire",
  }),
  position: z.string().min(2, "L'intitulé du poste est requis"),
  skills: z.string().optional(),
  description: z
    .string()
    .min(10, "La description doit contenir au moins 10 caractères"),
  motivationLetter: z
    .string()
    .min(50, "La lettre de motivation doit contenir au moins 50 caractères"),
  cvUploaded: z.boolean().default(false).optional(),
});

type ApplicationFormValues = z.infer<typeof applicationSchema>;

const InternshipApplicationForm = () => {
  const { toast } = useToast();

  const form = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      school: "",
      program: "",
      company: "",
      position: "",
      skills: "",
      description: "",
      motivationLetter: "",
      cvUploaded: false,
    },
  });

  const onSubmit = (data: ApplicationFormValues) => {
    console.log("Demande de stage:", data);

    // Simuler la génération d'un identifiant unique
    const applicationId =
      "INT-" +
      Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, "0");

    toast({
      title: "Demande envoyée avec succès",
      description: `Votre demande a été enregistrée avec l'identifiant ${applicationId}. Un email de confirmation vous a été envoyé.`,
    });

    // Réinitialiser le formulaire
    form.reset();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Informations personnelles</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prénom</FormLabel>
                  <FormControl>
                    <Input placeholder="Prénom" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom</FormLabel>
                  <FormControl>
                    <Input placeholder="Nom" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="email@exemple.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Téléphone</FormLabel>
                  <FormControl>
                    <Input placeholder="+228 90 00 00 00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="program"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Domaine</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un domaine" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="informatique">Informatique</SelectItem>
                      <SelectItem value="data-science">Comptabilité</SelectItem>
                      <SelectItem value="design">Electricité</SelectItem>
                      <SelectItem value="marketing">Logistique</SelectItem>
                      <SelectItem value="reseaux">Secrétariat</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="program"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Niveau d'études</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un niveau" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="informatique">BAC +1</SelectItem>
                      <SelectItem value="data-science">BAC +2 (BTS)</SelectItem>
                      <SelectItem value="design">Licence</SelectItem>
                      <SelectItem value="marketing">Master 1</SelectItem>
                      <SelectItem value="reseaux">Master 1</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Documents</h3>

          <FormField
            control={form.control}
            name="cvUploaded"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CV</FormLabel>
                <FormControl>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          field.onChange(true);
                        } else {
                          field.onChange(false);
                        }
                      }}
                    />
                  </div>
                </FormControl>
                <FormDescription>
                  Format accepté: PDF(Max 5MB)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cvUploaded"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Diplôme / Attestation</FormLabel>
                <FormControl>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          field.onChange(true);
                        } else {
                          field.onChange(false);
                        }
                      }}
                    />
                  </div>
                </FormControl>
                <FormDescription>Format accepté: PDF (Max 5MB)</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

<FormField
            control={form.control}
            name="cvUploaded"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lettre de motivation</FormLabel>
                <FormControl>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          field.onChange(true);
                        } else {
                          field.onChange(false);
                        }
                      }}
                    />
                  </div>
                </FormControl>
                <FormDescription>Format accepté: PDF (Max 5MB)</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" className="w-full">
          Soumettre ma demande de stage
        </Button>
      </form>
    </Form>
  );
};

export default InternshipApplicationForm;
