const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getToken = () => {
  return (
    localStorage.getItem('dl_token') ||
    localStorage.getItem('token') ||
    localStorage.getItem('accessToken') ||
    localStorage.getItem('authToken') ||
    localStorage.getItem('jwt') ||
    ''
  );
};

const getHeaders = () => {
  const token = getToken();

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

const handleResponse = async (response) => {
  let result = null;

  try {
    result = await response.json();
  } catch {
    result = null;
  }

  if (!response.ok) {
    throw new Error(
      result?.message ||
        `Request failed with status ${response.status}`
    );
  }

  return result;
};

// GET /api/suppliers
export const getSuppliers = async (params = {}) => {
  const queryParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ''
    ) {
      queryParams.append(key, value);
    }
  });

  const queryString = queryParams.toString();

  const response = await fetch(
    `${API_BASE_URL}/suppliers${queryString ? `?${queryString}` : ''}`,
    {
      method: 'GET',
      headers: getHeaders()
    }
  );

  const result = await handleResponse(response);

  return {
    success: result?.success ?? true,
    data: result?.data || [],
    pagination: result?.pagination || {
      page: Number(params.page) || 1,
      limit: Number(params.limit) || 25,
      total: Array.isArray(result?.data) ? result.data.length : 0,
      pages: 1
    }
  };
};

// GET /api/suppliers/:id
export const getSupplier = async (id) => {
  if (!id) {
    throw new Error('Supplier ID is required');
  }

  const response = await fetch(
    `${API_BASE_URL}/suppliers/${id}`,
    {
      method: 'GET',
      headers: getHeaders()
    }
  );

  const result = await handleResponse(response);

  return result?.data || result;
};

// POST /api/suppliers
export const createSupplier = async (supplierData) => {
  const response = await fetch(
    `${API_BASE_URL}/suppliers`,
    {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(supplierData)
    }
  );

  const result = await handleResponse(response);

  return result?.data || result;
};

// PATCH /api/suppliers/:id
export const updateSupplier = async (id, supplierData) => {
  if (!id) {
    throw new Error('Supplier ID is required');
  }

  const response = await fetch(
    `${API_BASE_URL}/suppliers/${id}`,
    {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(supplierData)
    }
  );

  const result = await handleResponse(response);

  return result?.data || result;
};

export default {
  getSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier
};