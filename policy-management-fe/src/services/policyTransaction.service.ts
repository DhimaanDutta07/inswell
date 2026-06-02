import axios from 'axios';
import type { PolicyTransaction } from '../types/index';

const API_BASE_URL = import.meta.env.VITE_BASE_URL;

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
});

export interface PolicyTransactionInput {
  policy_number: string;
  customer_name: string;
  category: string;
  sub_category: string;
  premium_amount: number;
  commission_percentage?: number;
}

export const getAllPolicyTransactions = async (search?: string): Promise<PolicyTransaction[]> => {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  const qs = params.toString();
  const url = `${API_BASE_URL}/api/v1/policy-transactions${qs ? `?${qs}` : ''}`;
  const res = await axios.get(url, authHeaders());
  return res.data;
};

export const createPolicyTransaction = async (
  data: PolicyTransactionInput
): Promise<PolicyTransaction> => {
  const res = await axios.post(`${API_BASE_URL}/api/v1/policy-transactions`, data, authHeaders());
  return res.data;
};
