import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getActiveBranchesListApi } from '../services/branchApi';
import { useAuth } from './AuthContext';

const BranchContext = createContext(null);

export const BranchProvider = ({ children }) => {
  const { user } = useAuth();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);

  // Read saved branch or default to all branches ('')
  const [selectedBranch, setSelectedBranchState] = useState(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('dl_active_branch') || '';
  });

  // Fetch active branches list
  const fetchBranches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getActiveBranchesListApi();
      setBranches(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load active branches:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchBranches();
    }
  }, [user, fetchBranches]);

  // Enforce branch lock for HR and Employee
  useEffect(() => {
    if (user && (user.role === 'hr' || user.role === 'employee')) {
      const userBranchId = user.branchId?._id || user.branchId || '';
      setSelectedBranchState(userBranchId ? String(userBranchId) : '');
    }
  }, [user]);

  const setSelectedBranch = (branchId) => {
    // If HR or Employee, reject switching
    if (user && (user.role === 'hr' || user.role === 'employee')) {
      return;
    }

    const val = branchId || '';
    setSelectedBranchState(val);
    if (val) {
      localStorage.setItem('dl_active_branch', val);
    } else {
      localStorage.removeItem('dl_active_branch');
    }
  };

  const currentBranch = branches.find((b) => b._id === selectedBranch) || null;
  const isAllBranches = !selectedBranch || selectedBranch === 'all';
  const canSwitchBranches = Boolean(user && (user.role === 'superadmin' || user.role === 'admin'));

  return (
    <BranchContext.Provider
      value={{
        branches,
        selectedBranch,
        setSelectedBranch,
        currentBranch,
        isAllBranches,
        canSwitchBranches,
        loading,
        refreshBranches: fetchBranches
      }}
    >
      {children}
    </BranchContext.Provider>
  );
};

export const useBranch = () => {
  const ctx = useContext(BranchContext);
  if (!ctx) {
    throw new Error('useBranch must be used within a BranchProvider');
  }
  return ctx;
};
