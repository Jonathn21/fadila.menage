import apiClient from '@/lib/apiClient';

interface LoginData {
  username: string;
  password: string;
}

export const login = async (data: LoginData) => {
  const response = await apiClient.post('/login/', data);
  return response.data;
};

export const getSession = async () => {
  return await apiClient.get('/get-active-sessions');
};

export const logout = async () => {
  return await apiClient.post('/logout/');
};