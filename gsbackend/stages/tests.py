class DemandeDetailAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        demande = get_object_or_404(Demande, pk=pk)
        
        # Vérifier entretien
        existe_entretien = Entretien.objects.filter(demandeur=demande).exists()
        
        def build_full_url(file_field):
            if file_field:
                return request.build_absolute_uri(file_field.url)
            return None
        
        # Construire réponse formatée AVEC STATUT DES DOCUMENTS
        response_data = {
            "id": demande.id,
            "tracking_id": demande.tracking_id,
            "date_soumission": demande.date_soumission,
            "statut_stage": demande.statut_stage,
            "type_stage": demande.type_stage,
            "est_archivee": demande.est_archivee,
            
            "score_ia": demande.score_ia,
            "score_details": demande.score_details,
            "score_commentaire": demande.score_commentaire,
            "score_date": demande.score_date,
            "raison_refus": demande.raison_refus,  

            
            "etudiant": {
                "prenom": demande.etudiant_prenom,
                "nom": demande.etudiant_nom,
                "genre": demande.genre,
                "email": demande.etudiant_email,
                "telephone": demande.etudiant_telephone,
                "adresse": demande.etudiant_adresse,
                "niveau": demande.etudiant_niveau,
                "specialite": demande.etudiant_specialite,
                "pays_residence": demande.pays_residence,
                "photo_passeport": build_full_url(demande.photo_passeport),
                "resume_cv": demande.resume_cv,
            },
            
            "etablissement": {
                "name": demande.etablissement.nom if demande.etablissement else None,
                "location": demande.etablissement.adresse if demande.etablissement else None,
                "email": demande.etablissement.email if demande.etablissement else None,
                "phone": demande.etablissement.telephone if demande.etablissement else None,
            },

            # REMPLACER l'ancienne méthode par la nouvelle
            "documents": self.get_documents_with_status(request, demande),
            "existe_entretien": existe_entretien
        }
        
        return Response(response_data)

    def patch(self, request, pk):
        """Mettre à jour le résumé CV de l'étudiant"""
        demande = get_object_or_404(Demande, pk=pk)
        
        # Vérifier si resume_cv est dans les données
        resume_cv = request.data.get('resume_cv')
        if resume_cv is None:
            return Response(
                {'error': 'Le champ resume_cv est requis'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Mettre à jour le résumé
        demande.resume_cv = resume_cv
        demande.save()
        
        # Retourner la réponse mise à jour
        return Response({
            'message': 'Résumé mis à jour avec succès',
            'resume_cv': demande.resume_cv
        }, status=status.HTTP_200_OK)

    # REMPLACER l'ancienne méthode par celle-ci
    def get_documents_with_status(self, request, demande):
        """Retourne les documents avec leur statut"""
        documents_with_status = demande.get_documents_with_status(request.user)
        updated_docs = []
        
        for doc in documents_with_status:
            updated_docs.append({
                "id": doc.get("document_history_id"),  # ID pour le marquage comme vu
                "nom": doc.get("nom"),
                "url": request.build_absolute_uri(doc.get("url")) if doc.get("url") else None,
                "statut": doc.get("statut", "existing"),  # 'new', 'modified', 'existing', 'viewed'
                "date_upload": doc.get("date_upload"),
                "est_modifie": doc.get("est_modifie", False)
            })
        return updated_docs