import axios from 'axios';
import type { CommissionMaster } from '../types/index';

const API_BASE_URL = import.meta.env.VITE_BASE_URL;

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
});

export interface CommissionMasterQuery {
  search?: string;
  category?: string;
  isActive?: boolean;
}

export interface CommissionMasterInput {
  category: string;
  sub_category: string;
  commission_percentage: number;
  is_active?: boolean;
}

export const getAllCommissionMaster = async (
  query?: CommissionMasterQuery
): Promise<CommissionMaster[]> => {
  const params = new URLSearchParams();
  if (query?.search) params.append('search', query.search);
  if (query?.category) params.append('category', query.category);
  if (typeof query?.isActive === 'boolean')
    params.append('isActive', query.isActive ? 'true' : 'false');

  const qs = params.toString();
  const url = `${API_BASE_URL}/api/v1/commission-master${qs ? `?${qs}` : ''}`;
  const res = await axios.get(url, authHeaders());
  return res.data;
};

export const createCommissionMaster = async (
  data: CommissionMasterInput
): Promise<CommissionMaster> => {
  const res = await axios.post(`${API_BASE_URL}/api/v1/commission-master`, data, authHeaders());
  return res.data;
};

export const updateCommissionMaster = async (
  id: string,
  data: Partial<CommissionMasterInput>
): Promise<CommissionMaster> => {
  const res = await axios.patch(
    `${API_BASE_URL}/api/v1/commission-master/${id}`,
    data,
    authHeaders()
  );
  return res.data;
};

export const updateCommissionMasterStatus = async (
  id: string,
  isActive: boolean
): Promise<CommissionMaster> => {
  const res = await axios.patch(
    `${API_BASE_URL}/api/v1/commission-master/${id}/status`,
    { is_active: isActive },
    authHeaders()
  );
  return res.data;
};
