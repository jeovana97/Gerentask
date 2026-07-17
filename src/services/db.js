const API_URL = `http://${window.location.hostname}:3000/api`;

export const getDBData = async (key, includeDeleted = false) => {
  try {
    let endpoint = '';
    if (key === 'gt_users') endpoint = '/users';
    if (key === 'gt_tasks') endpoint = '/tasks';
    if (key === 'gt_departments') endpoint = '/departments';
    if (key === 'gt_jobTitles') endpoint = '/job-titles';
    
    if (!endpoint) return [];

    const query = includeDeleted ? '?includeDeleted=true' : '';
    const res = await fetch(`${API_URL}${endpoint}${query}`);
    if (!res.ok) throw new Error('Falha ao buscar dados');
    return await res.json();
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const setDBData = async (key, data) => {
  // Para manter a compatibilidade da assinatura da função
  // O backend trata inserções e atualizações específicas por ID
  // Esta função é menos utilizada em um backend REST tradicional.
};

export const api = {
  get: async (endpoint) => {
    const res = await fetch(`${API_URL}${endpoint}`);
    if (!res.ok) throw new Error('Erro no GET');
    return res.json();
  },
  post: async (endpoint, data) => {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro no POST');
    return result;
  },
  put: async (endpoint, data) => {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro no PUT');
    return result;
  },
  delete: async (endpoint) => {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Erro no DELETE');
    return res.json();
  }
};
