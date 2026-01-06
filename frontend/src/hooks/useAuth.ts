import { useState, useEffect } from 'react';
import apiClient from '../lib/apiClient';

interface User {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
}

export const useAuth = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Vérifier l'authentification au chargement
    useEffect(() => {
        const checkAuth = async () => {
            try {
                setLoading(true);
                const { data } = await apiClient.get('/get-active-sessions/');
                setUser(data);
            } catch (err) {
                setError('Non authentifié');
            } finally {
                setLoading(false);
            }
        };

        checkAuth();
    }, []);

    // Fonction de connexion

    const login = async (email: string, password: string) => {
        try {
            setLoading(true);
            await apiClient.post('/login/', { email, password });
            const { data } = await apiClient.get('/user/me/');
            setUser(data);
            return true;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    };

    // Fonction de déconnexion
    const logout = async () => {
        try {
            await apiClient.post('/logout/');
            setUser(null);
        } catch (err) {
            setError('Erreur lors de la déconnexion');
        }
    };

    return { user, loading, error, login, logout };
};