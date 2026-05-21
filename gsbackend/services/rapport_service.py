# services/rapport_service.py

import time
from io import BytesIO
from datetime import date, timedelta
from django.utils import timezone
from django.db.models import Q, Count, Avg, F

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from stages.models import UserAction, Stagiaire, Demande, DemandeAttestation, ConventionStage
from utilisateurs.models import Utilisateur


# ── Helpers PDF ──────────────────────────────────────────────────────────────

HEADER_COLOR  = colors.HexColor('#1e293b')
ACCENT_COLOR  = colors.HexColor('#6366f1')
SUCCESS_COLOR = colors.HexColor('#10b981')
DANGER_COLOR  = colors.HexColor('#ef4444')
WARNING_COLOR = colors.HexColor('#f59e0b')
LIGHT_BG      = colors.HexColor('#f8fafc')
BORDER_COLOR  = colors.HexColor('#e2e8f0')

def make_pdf_doc(buffer, title, subtitle=""):
    """Crée un SimpleDocTemplate avec en-tête standard CEB"""
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        rightMargin=2*cm, leftMargin=2*cm,
        topMargin=2.5*cm, bottomMargin=2*cm,
        title=title,
    )
    return doc

def pdf_header(title, subtitle, styles):
    """Bloc d'en-tête réutilisable"""
    elements = []
    elements.append(Spacer(1, 0.5*cm))
    elements.append(Paragraph(
        f'<font color="#6366f1"><b>CEB</b></font> — Gestion des Stages',
        ParagraphStyle('org', fontSize=9, textColor=colors.HexColor('#64748b'), alignment=TA_LEFT)
    ))
    elements.append(Spacer(1, 0.3*cm))
    elements.append(Paragraph(f'<b>{title}</b>', ParagraphStyle('title', fontSize=16, textColor=HEADER_COLOR, spaceAfter=4)))
    if subtitle:
        elements.append(Paragraph(subtitle, ParagraphStyle('sub', fontSize=10, textColor=colors.HexColor('#64748b'), spaceAfter=8)))
    elements.append(HRFlowable(width="100%", thickness=1, color=ACCENT_COLOR, spaceAfter=12))
    elements.append(Paragraph(
        f'Généré le {date.today().strftime("%d/%m/%Y")} à {timezone.now().strftime("%H:%M")}',
        ParagraphStyle('date', fontSize=8, textColor=colors.HexColor('#94a3b8'), spaceAfter=16)
    ))
    return elements

def pdf_table(data, col_widths, header_color=None):
    """Table ReportLab avec style standard"""
    hc = header_color or ACCENT_COLOR
    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        # En-tête
        ('BACKGROUND',   (0,0), (-1,0), hc),
        ('TEXTCOLOR',    (0,0), (-1,0), colors.white),
        ('FONTNAME',     (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE',     (0,0), (-1,0), 9),
        ('ALIGN',        (0,0), (-1,0), 'CENTER'),
        ('BOTTOMPADDING',(0,0), (-1,0), 8),
        ('TOPPADDING',   (0,0), (-1,0), 8),
        # Corps
        ('FONTNAME',     (0,1), (-1,-1), 'Helvetica'),
        ('FONTSIZE',     (0,1), (-1,-1), 8),
        ('ROWBACKGROUNDS',(0,1),(-1,-1), [colors.white, LIGHT_BG]),
        ('ALIGN',        (0,1), (-1,-1), 'LEFT'),
        ('TOPPADDING',   (0,1), (-1,-1), 5),
        ('BOTTOMPADDING',(0,1), (-1,-1), 5),
        # Bordures
        ('GRID',         (0,0), (-1,-1), 0.3, BORDER_COLOR),
        ('LINEBELOW',    (0,0), (-1,0), 1, hc),
    ]))
    return t

# ── Helpers Excel ─────────────────────────────────────────────────────────────

def make_excel_wb(title):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = title[:30]
    return wb, ws

def excel_header_row(ws, headers, row=1, fill_color="1e293b"):
    fill = PatternFill("solid", fgColor=fill_color)
    font = Font(bold=True, color="FFFFFF", size=10)
    for col, h in enumerate(headers, 1):
        cell = ws.cell(row=row, column=col, value=h)
        cell.fill = fill
        cell.font = font
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    ws.row_dimensions[row].height = 28

def excel_data_row(ws, values, row, even=False):
    fill = PatternFill("solid", fgColor="F8FAFC") if even else None
    for col, v in enumerate(values, 1):
        cell = ws.cell(row=row, column=col, value=v)
        cell.alignment = Alignment(vertical="center", wrap_text=True)
        if fill: cell.fill = fill
    ws.row_dimensions[row].height = 18

def excel_autofit(ws):
    for col in ws.columns:
        max_len = max((len(str(c.value or "")) for c in col), default=10)
        ws.column_dimensions[get_column_letter(col[0].column)].width = min(max_len + 4, 50)


# ── Service principal ─────────────────────────────────────────────────────────

class RapportGeneratorService:

    # ─────────────────────────────────────────────────────────────────────────
    # OPÉRATIONNEL
    # ─────────────────────────────────────────────────────────────────────────

    @staticmethod
    def generer_demandes_en_cours(params, format='pdf'):
        statut       = params.get('statut', 'tous')
        seuil_jours  = int(params.get('seuil_jours', 14))

        qs = Demande.objects.filter(est_archivee=False).exclude(statut_stage__in=["Acceptée","Refusée"])
        if statut != 'tous':
            qs = qs.filter(statut_stage=statut)
        qs = qs.select_related('etablissement').order_by('date_soumission')

        today = date.today()
        rows = []
        for d in qs:
            delta = (today - d.date_soumission.date()).days if d.date_soumission else 0
            rows.append({
                'tracking_id':  d.tracking_id,
                'nom':          f"{d.etudiant_prenom} {d.etudiant_nom}",
                'statut':       d.statut_stage,
                'date_soumission': d.date_soumission.strftime('%d/%m/%Y') if d.date_soumission else '',
                'jours_ecoules': delta,
                'alerte':       delta >= seuil_jours,
                'etablissement': d.etablissement.nom if d.etablissement else 'N/A',
                'type_stage':   d.type_stage or '',
            })

        filename = f"demandes_en_cours_{today}"

        if format == 'excel':
            wb, ws = make_excel_wb("Demandes en cours")
            # Titre
            ws.merge_cells('A1:G1')
            ws['A1'] = f"Demandes en cours — {today.strftime('%d/%m/%Y')}"
            ws['A1'].font = Font(bold=True, size=13)
            ws['A1'].alignment = Alignment(horizontal='center')
            ws.row_dimensions[1].height = 32

            headers = ['N° Suivi', 'Étudiant', 'Statut', 'Date soumission', 'Jours écoulés', 'Alerte', 'Établissement']
            excel_header_row(ws, headers, row=3)
            for i, r in enumerate(rows, 4):
                vals = [r['tracking_id'], r['nom'], r['statut'], r['date_soumission'], r['jours_ecoules'], '⚠️' if r['alerte'] else '', r['etablissement']]
                excel_data_row(ws, vals, i, even=(i%2==0))
                if r['alerte']:
                    ws.cell(i, 5).font = Font(color="EF4444", bold=True)
            excel_autofit(ws)
            buffer = BytesIO(); wb.save(buffer); buffer.seek(0)
            return buffer, filename

        # PDF
        buffer = BytesIO()
        doc = make_pdf_doc(buffer, "Demandes en cours")
        styles = getSampleStyleSheet()
        elements = pdf_header("Demandes en cours", f"Statut : {statut} · Seuil alerte : {seuil_jours} jours · {len(rows)} dossier(s)", styles)

        if rows:
            data = [['N° Suivi', 'Étudiant', 'Statut', 'Soumission', 'Jours', 'Alerte']]
            for r in rows:
                alerte_cell = Paragraph('<font color="red"><b>⚠ RETARD</b></font>', styles['Normal']) if r['alerte'] else ''
                data.append([r['tracking_id'], r['nom'], r['statut'], r['date_soumission'], str(r['jours_ecoules']), alerte_cell])
            elements.append(pdf_table(data, [3*cm, 4.5*cm, 3.5*cm, 2.5*cm, 1.5*cm, 2.5*cm]))
        else:
            elements.append(Paragraph("Aucune demande en cours.", styles['Normal']))

        doc.build(elements)
        buffer.seek(0)
        return buffer, filename

    @staticmethod
    def generer_stages_actifs(params, format='pdf'):
        direction = params.get('direction', 'tous')
        today = date.today()

        qs = Stagiaire.objects.filter(statut='Actuel').select_related('etablissement')
        if direction != 'tous':
            qs = qs.filter(direction=direction)
        qs = qs.order_by('direction', 'service', 'nom')

        filename = f"stages_actifs_{today}"

        if format == 'excel':
            wb, ws = make_excel_wb("Stages actifs")
            ws.merge_cells('A1:I1')
            ws['A1'] = f"Stages actifs — {today.strftime('%d/%m/%Y')}"
            ws['A1'].font = Font(bold=True, size=13)
            ws['A1'].alignment = Alignment(horizontal='center')
            ws.row_dimensions[1].height = 32
            headers = ['Nom', 'Prénom', 'Direction', 'Service', 'Superviseur', 'Début', 'Fin', 'J. restants', 'Établissement']
            excel_header_row(ws, headers, row=3)
            for i, s in enumerate(qs, 4):
                jours = (s.date_fin - today).days if s.date_fin else 0
                excel_data_row(ws, [s.nom, s.prenom, s.direction, s.service, s.superviseur,
                    s.date_debut.strftime('%d/%m/%Y') if s.date_debut else '',
                    s.date_fin.strftime('%d/%m/%Y') if s.date_fin else '',
                    jours, s.etablissement.nom if s.etablissement else ''], i, even=(i%2==0))
                if jours < 15 and jours >= 0:
                    ws.cell(i, 8).font = Font(color="EF4444", bold=True)
            excel_autofit(ws)
            buffer = BytesIO(); wb.save(buffer); buffer.seek(0)
            return buffer, filename

        buffer = BytesIO()
        doc = make_pdf_doc(buffer, "Stages actifs")
        styles = getSampleStyleSheet()
        elements = pdf_header("Stages actifs", f"Direction : {direction} · {qs.count()} stagiaire(s) en cours", styles)
        data = [['Nom & Prénom', 'Direction / Service', 'Superviseur', 'Début', 'Fin', 'J. restants']]
        for s in qs:
            jours = (s.date_fin - today).days if s.date_fin else 0
            jours_cell = Paragraph(f'<font color="red"><b>{jours}</b></font>', styles['Normal']) if jours < 15 else str(jours)
            data.append([f"{s.prenom} {s.nom}", f"{s.direction} / {s.service}", s.superviseur or '',
                s.date_debut.strftime('%d/%m/%Y') if s.date_debut else '',
                s.date_fin.strftime('%d/%m/%Y') if s.date_fin else '', jours_cell])
        elements.append(pdf_table(data, [4.5*cm, 4*cm, 3*cm, 2.5*cm, 2.5*cm, 1.5*cm]))
        doc.build(elements); buffer.seek(0)
        return buffer, filename

    @staticmethod
    def generer_fins_imminentes(params, format='pdf'):
        horizon = int(params.get('horizon_jours', 15))
        today   = date.today()
        limite  = today + timedelta(days=horizon)

        qs = Stagiaire.objects.filter(
            statut='Actuel', date_fin__gte=today, date_fin__lte=limite
        ).select_related('etablissement').order_by('date_fin')

        filename = f"fins_imminentes_{today}"

        if format == 'excel':
            wb, ws = make_excel_wb("Fins imminentes")
            ws['A1'] = f"Fins de stage dans les {horizon} prochains jours — {today.strftime('%d/%m/%Y')}"
            ws['A1'].font = Font(bold=True, size=12)
            ws.merge_cells('A1:G1'); ws.row_dimensions[1].height = 28
            headers = ['Stagiaire', 'Direction', 'Service', 'Date de fin', 'Jours restants', 'Email', 'Déjà renouvelé']
            excel_header_row(ws, headers, row=3, fill_color="EF4444")
            for i, s in enumerate(qs, 4):
                jours = (s.date_fin - today).days
                excel_data_row(ws, [f"{s.prenom} {s.nom}", s.direction, s.service,
                    s.date_fin.strftime('%d/%m/%Y'), jours, s.email,
                    'Oui' if getattr(s, 'a_ete_renouvele', False) else 'Non'], i, even=(i%2==0))
            excel_autofit(ws)
            buffer = BytesIO(); wb.save(buffer); buffer.seek(0)
            return buffer, filename

        buffer = BytesIO()
        doc = make_pdf_doc(buffer, "Fins de stage imminentes")
        styles = getSampleStyleSheet()
        elements = pdf_header("Fins de stage imminentes",
            f"Horizon : {horizon} jours · {qs.count()} stage(s) concerné(s)", styles, )
        data = [['Stagiaire', 'Direction / Service', 'Date de fin', 'J. restants', 'Email']]
        for s in qs:
            jours = (s.date_fin - today).days
            data.append([f"{s.prenom} {s.nom}", f"{s.direction}/{s.service}",
                s.date_fin.strftime('%d/%m/%Y'),
                Paragraph(f'<font color="red"><b>{jours}</b></font>', styles['Normal']),
                s.email])
        elements.append(pdf_table(data, [4*cm, 4*cm, 2.5*cm, 2*cm, 5*cm], header_color=DANGER_COLOR))
        doc.build(elements); buffer.seek(0)
        return buffer, filename

    @staticmethod
    def generer_attestations_en_attente(params, format='pdf'):
        today = date.today()
        qs = DemandeAttestation.objects.filter(statut='en_attente').select_related('stagiaire').order_by('date_demande')
        filename = f"attestations_en_attente_{today}"

        if format == 'excel':
            wb, ws = make_excel_wb("Attestations en attente")
            ws['A1'] = f"Demandes d'attestation en attente — {today.strftime('%d/%m/%Y')}"
            ws['A1'].font = Font(bold=True, size=12)
            ws.merge_cells('A1:F1'); ws.row_dimensions[1].height = 28
            excel_header_row(ws, ['Stagiaire', 'Direction', 'Service', 'Fin de stage', 'Date demande', 'Jours d\'attente'], row=3)
            for i, da in enumerate(qs, 4):
                s = da.stagiaire
                jours = (today - da.date_demande.date()).days if da.date_demande else 0
                excel_data_row(ws, [f"{s.prenom} {s.nom}", s.direction, s.service,
                    s.date_fin.strftime('%d/%m/%Y') if s.date_fin else '',
                    da.date_demande.strftime('%d/%m/%Y') if da.date_demande else '', jours], i, even=(i%2==0))
            excel_autofit(ws)
            buffer = BytesIO(); wb.save(buffer); buffer.seek(0)
            return buffer, filename

        buffer = BytesIO()
        doc = make_pdf_doc(buffer, "Attestations en attente")
        styles = getSampleStyleSheet()
        elements = pdf_header("Attestations en attente", f"{qs.count()} demande(s) non traitée(s)", styles)
        data = [['Stagiaire', 'Direction', 'Date demande', 'Jours d\'attente']]
        for da in qs:
            s = da.stagiaire
            jours = (today - da.date_demande.date()).days if da.date_demande else 0
            data.append([f"{s.prenom} {s.nom}", f"{s.direction}/{s.service}",
                da.date_demande.strftime('%d/%m/%Y') if da.date_demande else '', str(jours)])
        elements.append(pdf_table(data, [5*cm, 4*cm, 3.5*cm, 3*cm]))
        doc.build(elements); buffer.seek(0)
        return buffer, filename

    # ─────────────────────────────────────────────────────────────────────────
    # PERFORMANCE
    # ─────────────────────────────────────────────────────────────────────────

    @staticmethod
    def generer_synthese_mensuelle(params, format='pdf'):
        annee = int(params.get('annee', date.today().year))
        mois  = int(params.get('mois',  date.today().month))
        today = date.today()

        qs_mois = Demande.objects.filter(date_soumission__year=annee, date_soumission__month=mois)
        total       = qs_mois.count()
        acceptees   = qs_mois.filter(statut_stage='Acceptée').count()
        refusees    = qs_mois.filter(statut_stage='Refusée').count()
        en_cours    = qs_mois.exclude(statut_stage__in=['Acceptée','Refusée']).count()
        taux_acc    = round(acceptees / total * 100, 1) if total else 0

        # Mois précédent pour comparaison
        if mois == 1: mois_prec, annee_prec = 12, annee - 1
        else:         mois_prec, annee_prec = mois - 1, annee
        qs_prec   = Demande.objects.filter(date_soumission__year=annee_prec, date_soumission__month=mois_prec)
        total_prec = qs_prec.count()
        taux_prec  = round(qs_prec.filter(statut_stage='Acceptée').count() / total_prec * 100, 1) if total_prec else 0

        import calendar
        nom_mois = ['','Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'][mois]
        filename = f"synthese_{nom_mois.lower()}_{annee}"

        kpis = [
            ('Total demandes', total, total_prec),
            ('Demandes acceptées', acceptees, qs_prec.filter(statut_stage='Acceptée').count()),
            ('Demandes refusées', refusees, qs_prec.filter(statut_stage='Refusée').count()),
            ('En cours', en_cours, qs_prec.exclude(statut_stage__in=['Acceptée','Refusée']).count()),
            ("Taux d'acceptation", f"{taux_acc}%", f"{taux_prec}%"),
        ]

        if format == 'excel':
            wb, ws = make_excel_wb(f"Synthèse {nom_mois}")
            ws['A1'] = f"Synthèse mensuelle — {nom_mois} {annee}"
            ws['A1'].font = Font(bold=True, size=13); ws.merge_cells('A1:D1'); ws.row_dimensions[1].height = 32
            excel_header_row(ws, ['Indicateur', f'{nom_mois} {annee}', f'Mois précédent', 'Évolution'], row=3)
            for i, (label, val, prec) in enumerate(kpis, 4):
                try:
                    evol = f"+{int(val)-int(prec)}" if int(val) >= int(prec) else str(int(val)-int(prec))
                except: evol = '—'
                excel_data_row(ws, [label, val, prec, evol], i, even=(i%2==0))
            excel_autofit(ws)
            buffer = BytesIO(); wb.save(buffer); buffer.seek(0)
            return buffer, filename

        buffer = BytesIO()
        doc = make_pdf_doc(buffer, f"Synthèse mensuelle — {nom_mois} {annee}")
        styles = getSampleStyleSheet()
        elements = pdf_header(f"Synthèse mensuelle — {nom_mois} {annee}", f"Comparaison avec le mois précédent", styles)
        data = [['Indicateur', f'{nom_mois} {annee}', 'Mois précédent', 'Évolution']]
        for label, val, prec in kpis:
            try:
                diff = int(str(val).replace('%','')) - int(str(prec).replace('%',''))
                evol = Paragraph(f'<font color="{"green" if diff >= 0 else "red"}">{"+" if diff >= 0 else ""}{diff}</font>', styles['Normal'])
            except: evol = '—'
            data.append([label, str(val), str(prec), evol])
        elements.append(pdf_table(data, [6*cm, 3.5*cm, 3.5*cm, 3*cm]))
        doc.build(elements); buffer.seek(0)
        return buffer, filename

    @staticmethod
    def generer_rapport_annuel(params, format='pdf'):
        annee = int(params.get('annee', date.today().year))
        today = date.today()
        qs = Demande.objects.filter(date_soumission__year=annee)

        total     = qs.count()
        acceptees = qs.filter(statut_stage='Acceptée').count()
        refusees  = qs.filter(statut_stage='Refusée').count()
        en_cours  = qs.exclude(statut_stage__in=['Acceptée','Refusée']).count()
        taux      = round(acceptees / total * 100, 1) if total else 0

        # Par mois
        import calendar
        noms_mois = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
        par_mois  = [qs.filter(date_soumission__month=m+1).count() for m in range(12)]

        # Par direction (top 5)
        par_direction = (
            Stagiaire.objects.filter(date_debut__year=annee)
            .values('direction').annotate(total=Count('id')).order_by('-total')[:8]
        )

        filename = f"rapport_annuel_{annee}"

        if format == 'excel':
            wb, ws = make_excel_wb(f"Rapport {annee}")
            ws['A1'] = f"Rapport annuel {annee}"; ws['A1'].font = Font(bold=True, size=14)
            ws.merge_cells('A1:C1'); ws.row_dimensions[1].height = 35

            # KPIs
            ws['A3'] = "Récapitulatif"; ws['A3'].font = Font(bold=True, size=11, color="6366F1")
            excel_header_row(ws, ['Indicateur', 'Valeur'], row=4)
            for i, (k, v) in enumerate([('Total demandes', total),('Acceptées', acceptees),('Refusées', refusees),('En cours', en_cours),("Taux d'acceptation", f"{taux}%")], 5):
                excel_data_row(ws, [k, v], i, even=(i%2==0))

            # Par mois
            ws.cell(11, 1, "Évolution mensuelle").font = Font(bold=True, size=11, color="6366F1")
            excel_header_row(ws, ['Mois'] + noms_mois, row=12)
            excel_data_row(ws, ['Demandes'] + par_mois, 13)
            excel_autofit(ws)
            buffer = BytesIO(); wb.save(buffer); buffer.seek(0)
            return buffer, filename

        buffer = BytesIO()
        doc = make_pdf_doc(buffer, f"Rapport annuel {annee}")
        styles = getSampleStyleSheet()
        elements = pdf_header(f"Rapport annuel {annee}", f"{total} demande(s) traitée(s) — Taux d'acceptation : {taux}%", styles)

        # KPI table
        data_kpi = [['Indicateur','Valeur'],['Total demandes', total],['Acceptées', f"{acceptees} ({taux}%)"],
            ['Refusées', refusees],['En cours de traitement', en_cours]]
        elements.append(Paragraph('<b>Récapitulatif</b>', styles['Heading3']))
        elements.append(Spacer(1, 6))
        elements.append(pdf_table(data_kpi, [8*cm, 8*cm]))
        elements.append(Spacer(1, 14))

        # Par mois
        elements.append(Paragraph('<b>Évolution mensuelle</b>', styles['Heading3']))
        elements.append(Spacer(1, 6))
        data_mois = [noms_mois, [str(v) for v in par_mois]]
        elements.append(pdf_table(data_mois, [1.4*cm]*12))
        elements.append(Spacer(1, 14))

        # Par direction
        if par_direction:
            elements.append(Paragraph('<b>Répartition par direction</b>', styles['Heading3']))
            elements.append(Spacer(1, 6))
            data_dir = [['Direction', 'Stagiaires']] + [[d['direction'] or 'N/A', d['total']] for d in par_direction]
            elements.append(pdf_table(data_dir, [10*cm, 6*cm]))

        doc.build(elements); buffer.seek(0)
        return buffer, filename

    @staticmethod
    def generer_performance_traitement(params, format='pdf'):
        annee = int(params.get('annee', date.today().year))
        mois  = params.get('mois', 'tous')
        today = date.today()

        qs = Demande.objects.filter(date_soumission__year=annee)
        if mois != 'tous':
            qs = qs.filter(date_soumission__month=int(mois))

        # Délai moyen par statut
        from django.db.models import ExpressionWrapper, DurationField
        acceptees = qs.filter(statut_stage='Acceptée', date_pre_acceptation__isnull=False)

        # Par jour de la semaine (hebdo)
        from django.db.models.functions import ExtractWeekDay
        hebdo = (qs.annotate(jour=ExtractWeekDay('date_soumission'))
                   .values('jour').annotate(total=Count('id')).order_by('jour'))
        jours_labels = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam']
        hebdo_data = {h['jour']: h['total'] for h in hebdo}

        filename = f"performance_traitement_{annee}"

        if format == 'excel':
            wb, ws = make_excel_wb("Performance")
            ws['A1'] = f"Performance de traitement — {annee}"; ws['A1'].font = Font(bold=True, size=12)
            ws.merge_cells('A1:B1'); ws.row_dimensions[1].height = 28
            excel_header_row(ws, ['Jour de la semaine', 'Demandes reçues'], row=3, fill_color="F97316")
            for i, j in enumerate(range(1, 8), 4):
                excel_data_row(ws, [jours_labels[j % 7], hebdo_data.get(j, 0)], i, even=(i%2==0))
            excel_autofit(ws)
            buffer = BytesIO(); wb.save(buffer); buffer.seek(0)
            return buffer, filename

        buffer = BytesIO()
        doc = make_pdf_doc(buffer, "Performance de traitement")
        styles = getSampleStyleSheet()
        elements = pdf_header("Performance de traitement", f"Année {annee}" + (f" — Mois {mois}" if mois != 'tous' else ""), styles)
        data = [['Jour de la semaine', 'Demandes reçues']]
        for j in range(1, 8):
            data.append([jours_labels[j % 7], str(hebdo_data.get(j, 0))])
        elements.append(pdf_table(data, [8*cm, 8*cm]))
        doc.build(elements); buffer.seek(0)
        return buffer, filename

    # ─────────────────────────────────────────────────────────────────────────
    # RH
    # ─────────────────────────────────────────────────────────────────────────

    @staticmethod
    def generer_repartition_directions(params, format='pdf'):
        annee  = int(params.get('annee', date.today().year))
        statut = params.get('statut', 'tous')
        today  = date.today()

        qs = Stagiaire.objects.filter(date_debut__year=annee)
        if statut != 'tous':
            qs = qs.filter(statut=statut)

        par_dir = qs.values('direction','service').annotate(total=Count('id')).order_by('direction','service')
        filename = f"repartition_directions_{annee}"

        if format == 'excel':
            wb, ws = make_excel_wb("Directions")
            ws['A1'] = f"Répartition par direction — {annee}"; ws['A1'].font = Font(bold=True, size=12)
            ws.merge_cells('A1:C1'); ws.row_dimensions[1].height = 28
            excel_header_row(ws, ['Direction', 'Service', 'Nombre de stagiaires'], row=3)
            for i, row in enumerate(par_dir, 4):
                excel_data_row(ws, [row['direction'] or 'N/A', row['service'] or 'N/A', row['total']], i, even=(i%2==0))
            excel_autofit(ws)
            buffer = BytesIO(); wb.save(buffer); buffer.seek(0)
            return buffer, filename

        buffer = BytesIO()
        doc = make_pdf_doc(buffer, "Répartition par direction")
        styles = getSampleStyleSheet()
        elements = pdf_header("Répartition par direction", f"Année {annee} · Statut : {statut}", styles)
        data = [['Direction', 'Service', 'Stagiaires']]
        for row in par_dir:
            data.append([row['direction'] or 'N/A', row['service'] or 'N/A', str(row['total'])])
        elements.append(pdf_table(data, [4*cm, 7*cm, 5*cm]))
        doc.build(elements); buffer.seek(0)
        return buffer, filename

    @staticmethod
    def generer_profil_stagiaires(params, format='pdf'):
        annee = int(params.get('annee', date.today().year))
        qs = Stagiaire.objects.filter(date_debut__year=annee)
        today = date.today()

        par_genre   = qs.values('genre').annotate(total=Count('id'))
        par_niveau  = qs.values('niveau_etude').annotate(total=Count('id')).order_by('-total')
        par_specialite = qs.values('specialite').annotate(total=Count('id')).order_by('-total')[:10]
        par_pays    = qs.values('pays_residence').annotate(total=Count('id')).order_by('-total')[:10]

        filename = f"profil_stagiaires_{annee}"

        if format == 'excel':
            wb, ws = make_excel_wb("Profil")
            ws['A1'] = f"Profil démographique — {annee}"; ws['A1'].font = Font(bold=True, size=12)
            ws.merge_cells('A1:B1'); ws.row_dimensions[1].height = 28

            row = 3
            for titre, data_qs, keys in [
                ("Par genre", par_genre, ['genre','total']),
                ("Par niveau d'études", par_niveau, ['niveau_etude','total']),
                ("Top 10 spécialités", par_specialite, ['specialite','total']),
                ("Top 10 pays", par_pays, ['pays_residence','total']),
            ]:
                ws.cell(row, 1, titre).font = Font(bold=True, size=10, color="6366F1"); row += 1
                excel_header_row(ws, [keys[0].replace('_',' ').capitalize(), 'Total'], row=row)
                row += 1
                for i, item in enumerate(data_qs):
                    excel_data_row(ws, [item[keys[0]] or 'N/A', item[keys[1]]], row, even=(i%2==0))
                    row += 1
                row += 1
            excel_autofit(ws)
            buffer = BytesIO(); wb.save(buffer); buffer.seek(0)
            return buffer, filename

        buffer = BytesIO()
        doc = make_pdf_doc(buffer, "Profil démographique")
        styles = getSampleStyleSheet()
        elements = pdf_header("Profil démographique", f"Année {annee} · {qs.count()} stagiaire(s)", styles)
        for titre, data_qs, key in [
            ("Répartition par genre", par_genre, 'genre'),
            ("Répartition par niveau d'études", par_niveau, 'niveau_etude'),
            ("Top 10 spécialités", par_specialite, 'specialite'),
            ("Top 10 pays de résidence", par_pays, 'pays_residence'),
        ]:
            elements.append(Paragraph(f'<b>{titre}</b>', styles['Heading3']))
            elements.append(Spacer(1, 6))
            data = [[key.replace('_',' ').capitalize(), 'Total']] + [[item[key] or 'N/A', str(item['total'])] for item in data_qs]
            elements.append(pdf_table(data, [10*cm, 6*cm]))
            elements.append(Spacer(1, 12))
        doc.build(elements); buffer.seek(0)
        return buffer, filename

    @staticmethod
    def generer_etablissements_partenaires(params, format='pdf'):
        annee = int(params.get('annee', date.today().year))
        top   = params.get('top', '10')
        today = date.today()

        qs = (Demande.objects
              .filter(date_soumission__year=annee, etablissement__isnull=False)
              .values('etablissement__nom','etablissement__email')
              .annotate(
                  total=Count('id'),
                  acceptees=Count('id', filter=Q(statut_stage='Acceptée')),
              ).order_by('-total'))
        if top != 'tous':
            qs = qs[:int(top)]

        filename = f"etablissements_partenaires_{annee}"

        if format == 'excel':
            wb, ws = make_excel_wb("Établissements")
            ws['A1'] = f"Établissements partenaires — {annee}"; ws['A1'].font = Font(bold=True, size=12)
            ws.merge_cells('A1:E1'); ws.row_dimensions[1].height = 28
            excel_header_row(ws, ['Établissement', 'Email', 'Demandes', 'Acceptées', "Taux d'acc."], row=3)
            for i, e in enumerate(qs, 4):
                taux = round(e['acceptees'] / e['total'] * 100, 1) if e['total'] else 0
                excel_data_row(ws, [e['etablissement__nom'], e['etablissement__email'] or '', e['total'], e['acceptees'], f"{taux}%"], i, even=(i%2==0))
            excel_autofit(ws)
            buffer = BytesIO(); wb.save(buffer); buffer.seek(0)
            return buffer, filename

        buffer = BytesIO()
        doc = make_pdf_doc(buffer, "Établissements partenaires")
        styles = getSampleStyleSheet()
        elements = pdf_header("Établissements partenaires", f"Année {annee} · Top {top}", styles)
        data = [['Établissement', 'Demandes', 'Acceptées', "Taux d'acc."]]
        for e in qs:
            taux = round(e['acceptees'] / e['total'] * 100, 1) if e['total'] else 0
            data.append([e['etablissement__nom'], str(e['total']), str(e['acceptees']), f"{taux}%"])
        elements.append(pdf_table(data, [7*cm, 2.5*cm, 2.5*cm, 3*cm]))
        doc.build(elements); buffer.seek(0)
        return buffer, filename

    @staticmethod
    def generer_renouvellements(params, format='pdf'):
        annee = int(params.get('annee', date.today().year))
        today = date.today()

        qs = Stagiaire.objects.filter(
            est_renouvellement=True, date_debut__year=annee
        ).select_related('stage_precedent','etablissement').order_by('-date_debut')

        filename = f"renouvellements_{annee}"

        if format == 'excel':
            wb, ws = make_excel_wb("Renouvellements")
            ws['A1'] = f"Renouvellements de stage — {annee}"; ws['A1'].font = Font(bold=True, size=12)
            ws.merge_cells('A1:F1'); ws.row_dimensions[1].height = 28
            excel_header_row(ws, ['Stagiaire', 'Direction', 'Nouveau début', 'Nouvelle fin', 'Ancien stage ID', 'Rémunéré'], row=3)
            for i, s in enumerate(qs, 4):
                excel_data_row(ws, [f"{s.prenom} {s.nom}", s.direction,
                    s.date_debut.strftime('%d/%m/%Y') if s.date_debut else '',
                    s.date_fin.strftime('%d/%m/%Y') if s.date_fin else '',
                    s.stage_precedent.id if s.stage_precedent else '',
                    'Oui' if s.remunere else 'Non'], i, even=(i%2==0))
            excel_autofit(ws)
            buffer = BytesIO(); wb.save(buffer); buffer.seek(0)
            return buffer, filename

        buffer = BytesIO()
        doc = make_pdf_doc(buffer, "Renouvellements de stage")
        styles = getSampleStyleSheet()
        elements = pdf_header("Renouvellements de stage", f"Année {annee} · {qs.count()} renouvellement(s)", styles)
        data = [['Stagiaire', 'Direction', 'Nouveau début', 'Nouvelle fin', 'Rémunéré']]
        for s in qs:
            data.append([f"{s.prenom} {s.nom}", s.direction,
                s.date_debut.strftime('%d/%m/%Y') if s.date_debut else '',
                s.date_fin.strftime('%d/%m/%Y') if s.date_fin else '',
                'Oui' if s.remunere else 'Non'])
        elements.append(pdf_table(data, [4.5*cm, 3*cm, 2.5*cm, 2.5*cm, 2.5*cm]))
        doc.build(elements); buffer.seek(0)
        return buffer, filename

    # ─────────────────────────────────────────────────────────────────────────
    # CONFORMITÉ
    # ─────────────────────────────────────────────────────────────────────────

    @staticmethod
    def generer_audit_actions(params, format='pdf'):
        annee       = int(params.get('annee', date.today().year))
        mois        = params.get('mois', 'tous')
        type_action = params.get('type_action', 'tous')
        today = date.today()

        qs = UserAction.objects.filter(created_at__year=annee).select_related('user').order_by('-created_at')
        if mois != 'tous':
            qs = qs.filter(created_at__month=int(mois))
        if type_action != 'tous':
            qs = qs.filter(action__icontains=type_action)

        filename = f"audit_actions_{annee}"

        if format == 'excel':
            wb, ws = make_excel_wb("Audit")
            ws['A1'] = f"Audit des actions — {annee}"; ws['A1'].font = Font(bold=True, size=12)
            ws.merge_cells('A1:D1'); ws.row_dimensions[1].height = 28
            excel_header_row(ws, ['Date & heure', 'Utilisateur', 'Action'], row=3, fill_color="64748B")
            for i, a in enumerate(qs[:500], 4):  # Limiter à 500 lignes
                excel_data_row(ws, [
                    a.created_at.strftime('%d/%m/%Y %H:%M') if hasattr(a, 'created_at') else '',
                    a.user.email if a.user else 'Système',
                    a.action,
                ], i, even=(i%2==0))
            excel_autofit(ws)
            buffer = BytesIO(); wb.save(buffer); buffer.seek(0)
            return buffer, filename

        buffer = BytesIO()
        doc = make_pdf_doc(buffer, "Audit des actions")
        styles = getSampleStyleSheet()
        elements = pdf_header("Audit des actions utilisateurs", f"Année {annee} · {qs.count()} action(s)", styles)
        data = [['Date & heure', 'Utilisateur', 'Action']]
        for a in qs[:200]:  # Limiter PDF
            data.append([
                a.created_at.strftime('%d/%m/%Y %H:%M') if hasattr(a, 'created_at') else '',
                a.user.email if a.user else 'Système',
                a.action[:80] + '…' if len(a.action) > 80 else a.action,
            ])
        elements.append(pdf_table(data, [3.5*cm, 4.5*cm, 9*cm], header_color=colors.HexColor('#64748b')))
        doc.build(elements); buffer.seek(0)
        return buffer, filename

    @staticmethod
    def generer_demandes_archivees(params, format='pdf'):
        annee = int(params.get('annee', date.today().year))
        today = date.today()

        qs = Demande.objects.filter(
            est_archivee=True, date_soumission__year=annee
        ).select_related('etablissement').order_by('-date_soumission')

        filename = f"demandes_archivees_{annee}"

        if format == 'excel':
            wb, ws = make_excel_wb("Archivées")
            ws['A1'] = f"Demandes archivées — {annee}"; ws['A1'].font = Font(bold=True, size=12)
            ws.merge_cells('A1:E1'); ws.row_dimensions[1].height = 28
            excel_header_row(ws, ['N° Suivi', 'Étudiant', 'Statut final', 'Date soumission', 'Établissement'], row=3, fill_color="94A3B8")
            for i, d in enumerate(qs, 4):
                excel_data_row(ws, [d.tracking_id, f"{d.etudiant_prenom} {d.etudiant_nom}", d.statut_stage,
                    d.date_soumission.strftime('%d/%m/%Y') if d.date_soumission else '',
                    d.etablissement.nom if d.etablissement else ''], i, even=(i%2==0))
            excel_autofit(ws)
            buffer = BytesIO(); wb.save(buffer); buffer.seek(0)
            return buffer, filename

        buffer = BytesIO()
        doc = make_pdf_doc(buffer, "Demandes archivées")
        styles = getSampleStyleSheet()
        elements = pdf_header("Demandes archivées", f"Année {annee} · {qs.count()} dossier(s)", styles)
        data = [['N° Suivi', 'Étudiant', 'Statut final', 'Date soumission']]
        for d in qs:
            data.append([d.tracking_id, f"{d.etudiant_prenom} {d.etudiant_nom}", d.statut_stage,
                d.date_soumission.strftime('%d/%m/%Y') if d.date_soumission else ''])
        elements.append(pdf_table(data, [3*cm, 5*cm, 4*cm, 4*cm], header_color=colors.HexColor('#94a3b8')))
        doc.build(elements); buffer.seek(0)
        return buffer, filename