
export interface Internship {
    id: string;
    student: string;
    nationality: string;
    gender: string;
    photo: string;
    speciality: string;
    educationLevel: string;
    startDate: string;
    endDate: string;
    submissionDate: string;
    agreementDate: string;
    direction: string;
    service: string,
    site: string,
    supervisor: string,
    internshipType: string;
    status: string;
    schoolName: string;
    schoolContact: string;
    schoolContactPhone: string;
    schoolContactEmail: string;
}

export const internshipsData: Internship[] = [
    
    
  
];


export const genderOptions = ["Tous", "Masculin", "Féminin"];
export const statusOptions = ["Tous", "En cours", "En attente", "Terminé", "Refusée"];
export const specializationOptions = ["Toutes", "Informatique", "Télécommunication", "Secrétariat", "Electricité", "Génie Civil", "Comptabilité", "Management des projets", "Passation des marchés", "Génie Mécanique"];
export const internshipTypeOptions = ["Tous", "Académique", "Fonctionnel", "Libre"];
export const directionOptions = ["Toutes","DG", "DCGIS", "DFC", "DARH", "DEPP", "DT", "DM"];
export const educationLevelOptions = ["Tous", "BAC +1", "BAC +2", "Licence", "Master 1", "Master 2"];
export const serviceOptions = ["Tous", "Informatique", "Comptabilité", "Secrétariat", "Exploitation", "Préparation et suivi des marchés", "Mécanique", "Génie Civil", "Préparation des projets"];
export const siteOptions = ["Tous", "Direction Générale", "DRB", "DRT", "DCN", "Poste Kara", "CFPP"];
