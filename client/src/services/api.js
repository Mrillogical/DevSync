import { api } from '../api/axios.js';

export const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  signup: (email, password, display_name) =>
    api.post('/auth/signup', { email, password, display_name }),
  profile: () => api.get('/auth/profile'),
};
export const projectService = {
  list: () => api.get('/projects'),
  get: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.patch(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
};

export const taskService = {
  list: (projectId) => api.get(`/projects/${projectId}/tasks`),
  get: (projectId, taskId) => api.get(`/projects/${projectId}/tasks/${taskId}`),
  create: (projectId, data) => api.post(`/projects/${projectId}/tasks`, data),
  update: (projectId, taskId, data) =>
    api.patch(`/projects/${projectId}/tasks/${taskId}`, data),
  delete: (projectId, taskId) =>
    api.delete(`/projects/${projectId}/tasks/${taskId}`),
};
export const memberService = {
  list: (projectId) => api.get(`/projects/${projectId}/members`),
  add: (projectId, email, role = 'member') =>
    api.post(`/projects/${projectId}/members`, { email, role }),
  remove: (projectId, userId) =>
    api.delete(`/projects/${projectId}/members/${userId}`),
};
