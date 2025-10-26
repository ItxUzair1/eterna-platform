import api from './api';

export const signup = async (data) => {
  const res = await api.post('/auth/signup', data);
  return res.data;
};

export const signin = async (data) => {
  const res = await api.post('/auth/signin', data);
  return res.data;
};
