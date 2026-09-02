const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const CUSTOMER_BASE_URL = `${API_BASE_URL}/customers`;

const getToken = () => {
  const possibleKeys = [
    'dl_token',
    'token',
    'accessToken',
    'authToken',
    'jwt'
  ];

  for (const key of possibleKeys) {
    const value = localStorage.getItem(key);

    if (value) {
      return value;
    }
  }

  return null;
};

const getHeaders = () => {
  const token = getToken();

  const headers = {
    Accept: 'application/json'
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

const parseResponse = async (response) => {
  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message =
      data?.message ||
      data?.error ||
      `Request failed with status ${response.status}`;

    const error = new Error(message);
    error.status = response.status;
    error.data = data;

    throw error;
  }

  return data;
};

const normalizeListResponse = (data) => {
  const customers =
    data?.customers ||
    data?.data?.customers ||
    data?.data ||
    data?.results ||
    [];

  const pagination =
    data?.pagination ||
    data?.data?.pagination ||
    {};

  return {
    customers: Array.isArray(customers) ? customers : [],
    pagination: {
      page:
        Number(
          pagination.page ??
          data?.page ??
          1
        ) || 1,

      limit:
        Number(
          pagination.limit ??
          data?.limit ??
          25
        ) || 25,

      total:
        Number(
          pagination.total ??
          data?.total ??
          customers.length
        ) || 0,

      totalPages:
        Number(
          pagination.totalPages ??
          data?.totalPages ??
          1
        ) || 1
    },
    raw: data
  };
};

const normalizeSingleResponse = (data) => {
  const customer =
    data?.customer ||
    data?.data?.customer ||
    data?.data ||
    data;

  return customer;
};

export const getCustomers = async ({
  page = 1,
  limit = 25,
  search = '',
  status = '',
  customerType = ''
} = {}) => {
  const params = new URLSearchParams();

  params.set('page', String(page));
  params.set('limit', String(limit));

  if (search.trim()) {
    params.set('search', search.trim());
  }

  if (status) {
    params.set('status', status);
  }

  if (customerType) {
    params.set('customerType', customerType);
  }

  const response = await fetch(
    `${CUSTOMER_BASE_URL}?${params.toString()}`,
    {
      method: 'GET',
      headers: getHeaders()
    }
  );

  const data = await parseResponse(response);

  return normalizeListResponse(data);
};

export const getCustomer = async (id) => {
  if (!id) {
    throw new Error('Customer ID is required.');
  }

  const response = await fetch(
    `${CUSTOMER_BASE_URL}/${encodeURIComponent(id)}`,
    {
      method: 'GET',
      headers: getHeaders()
    }
  );

  const data = await parseResponse(response);

  return normalizeSingleResponse(data);
};

export const createCustomer = async (customerData) => {
  const response = await fetch(
    CUSTOMER_BASE_URL,
    {
      method: 'POST',
      headers: {
        ...getHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(customerData)
    }
  );

  const data = await parseResponse(response);

  return normalizeSingleResponse(data);
};

export const updateCustomer = async (id, customerData) => {
  if (!id) {
    throw new Error('Customer ID is required.');
  }

  const response = await fetch(
    `${CUSTOMER_BASE_URL}/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headers: {
        ...getHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(customerData)
    }
  );

  const data = await parseResponse(response);

  return normalizeSingleResponse(data);
};

export const lookupCustomer = async (phone) => {
  if (!phone?.trim()) {
    return null;
  }

  const params = new URLSearchParams();
  params.set('phone', phone.trim());

  const response = await fetch(
    `${CUSTOMER_BASE_URL}/lookup?${params.toString()}`,
    {
      method: 'GET',
      headers: getHeaders()
    }
  );

  const data = await parseResponse(response);

  return normalizeSingleResponse(data);
};

export default {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  lookupCustomer
};