'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search } from 'lucide-react';
import { C, sans, serif, mono } from '@/lib/design-tokens';

interface User {
  id: string;
  display_name: string;
  email: string;
  role: 'superadmin' | 'institutional_admin' | 'faculty' | 'advisor' | 'student';
  institution: { id: string; name: string } | null;
  is_active: boolean;
  is_course_director: boolean;
  last_login_at: string | null;
}

interface PaginationData {
  page: number;
  limit: number;
  total_pages: number;
  total_count: number;
}

type SortColumn = 'name' | 'email' | 'role' | 'status' | 'last_login';
type SortDirection = 'asc' | 'desc';

const getRoleBadgeColor = (role: User['role']) => {
  switch (role) {
    case 'superadmin': return { bg: 'rgba(128,0,128,0.1)', text: '#800080', border: 'rgba(128,0,128,0.2)' };
    case 'institutional_admin': return { bg: 'rgba(43,113,185,0.1)', text: C.blueMid, border: 'rgba(43,113,185,0.2)' };
    case 'faculty': return { bg: 'rgba(105,163,56,0.1)', text: C.greenDark, border: 'rgba(105,163,56,0.2)' };
    case 'advisor': return { bg: 'rgba(250,157,51,0.1)', text: '#fa9d33', border: 'rgba(250,157,51,0.2)' };
    case 'student': return { bg: 'rgba(113,128,150,0.1)', text: C.textMuted, border: 'rgba(113,128,150,0.2)' };
  }
};

const getRoleLabel = (role: User['role']) => {
  switch (role) {
    case 'superadmin': return 'Super Admin';
    case 'institutional_admin': return 'Inst Admin';
    case 'faculty': return 'Faculty';
    case 'advisor': return 'Advisor';
    case 'student': return 'Student';
  }
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
};

export default function AdminUserDirectory() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1, limit: 25, total_pages: 1, total_count: 0,
  });
  const [filters, setFilters] = useState({ search: '', role: 'all', status: 'all' });
  const [sort] = useState<{ by: SortColumn; dir: SortDirection }>({ by: 'name', dir: 'asc' });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      const mockUsers: User[] = [
        { id: '1', display_name: 'Dr. Jane Smith', email: 'jane.smith@msm.edu', role: 'faculty', institution: { id: '1', name: 'Morehouse School of Medicine' }, is_active: true, is_course_director: true, last_login_at: '2026-02-19T10:30:00Z' },
        { id: '2', display_name: 'John Doe', email: 'john.doe@msm.edu', role: 'student', institution: { id: '1', name: 'Morehouse School of Medicine' }, is_active: true, is_course_director: false, last_login_at: '2026-02-18T14:20:00Z' },
        { id: '3', display_name: 'Dr. Sarah Johnson', email: 'sarah.johnson@example.edu', role: 'institutional_admin', institution: { id: '2', name: 'Example Medical School' }, is_active: true, is_course_director: false, last_login_at: '2026-02-17T09:15:00Z' },
        { id: '4', display_name: 'Michael Chen', email: 'm.chen@msm.edu', role: 'advisor', institution: { id: '1', name: 'Morehouse School of Medicine' }, is_active: false, is_course_director: false, last_login_at: null },
        { id: '5', display_name: 'Dr. Robert Brown', email: 'rbrown@example.edu', role: 'faculty', institution: { id: '2', name: 'Example Medical School' }, is_active: true, is_course_director: false, last_login_at: '2026-02-20T08:45:00Z' },
      ];
      setUsers(mockUsers);
      setPagination({ page: 1, limit: 25, total_pages: 1, total_count: mockUsers.length });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, sort, filters]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  return (
    <div style={{ maxWidth: 1400 }}>
      {/* Header Stats */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontFamily: mono, fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted, margin: 0 }}>
          {pagination.total_count} users
        </p>
      </div>

      {/* Filter Bar */}
      <div style={{ background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 240 }}>
            <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.textMuted }} />
            <input
              type="search"
              placeholder="Search by name or email..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              style={{ width: '100%', height: 40, background: C.parchment, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0 16px 0 40px', fontFamily: sans, fontSize: 15, color: C.ink, outline: 'none' }}
            />
          </div>
          <select value={filters.role} onChange={(e) => setFilters({ ...filters, role: e.target.value })} style={{ width: 160, height: 40, background: C.parchment, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0 32px 0 12px', fontFamily: sans, fontSize: 15, color: C.ink, outline: 'none', cursor: 'pointer' }}>
            <option value="all">All Roles</option>
            <option value="superadmin">Super Admin</option>
            <option value="institutional_admin">Inst Admin</option>
            <option value="faculty">Faculty</option>
            <option value="advisor">Advisor</option>
            <option value="student">Student</option>
          </select>
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} style={{ width: 144, height: 40, background: C.parchment, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0 32px 0 12px', fontFamily: sans, fontSize: 15, color: C.ink, outline: 'none', cursor: 'pointer' }}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <span style={{ marginLeft: 'auto', fontFamily: mono, fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', color: C.textMuted }}>
            {pagination.total_count} users
          </span>
        </div>
      </div>

      {/* Data Table */}
      <div style={{ background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 24 }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ height: 48, background: C.parchment, borderRadius: 6, marginBottom: 8 }} className="animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <p style={{ fontFamily: sans, fontSize: 15, color: C.danger, marginBottom: 16 }}>{error}</p>
            <button onClick={fetchUsers} style={{ padding: '8px 16px', background: C.parchment, border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: sans, fontSize: 14, fontWeight: 600, color: C.navyDeep, cursor: 'pointer' }}>Retry</button>
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: 64, textAlign: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(0,44,118,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <span style={{ fontSize: 36, color: 'rgba(0,44,118,0.3)' }}>◇</span>
            </div>
            <h3 style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, color: C.navyDeep, marginBottom: 8 }}>No users found</h3>
            <p style={{ fontFamily: sans, fontSize: 15, color: C.textSecondary, marginBottom: 20 }}>Try adjusting your filters</p>
            <button onClick={() => setFilters({ search: '', role: 'all', status: 'all' })} style={{ padding: '10px 20px', background: C.parchment, border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: sans, fontSize: 14, fontWeight: 600, color: C.navyDeep, cursor: 'pointer' }}>Reset Filters</button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: C.parchment, borderBottom: `1px solid ${C.borderLight}` }}>
                <tr>
                  {['Name', 'Email', 'Role', 'Institution', 'Status', 'Last Login'].map((col) => (
                    <th key={col} style={{ padding: '12px 16px', textAlign: 'left', fontFamily: mono, fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted, whiteSpace: 'nowrap' }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const roleColors = getRoleBadgeColor(user.role);
                  return (
                    <tr key={user.id} style={{ background: C.white, borderBottom: `1px solid ${C.borderLight}`, transition: 'background 0.15s ease' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = C.parchment; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = C.white; }}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontFamily: sans, fontSize: 15, fontWeight: 600, color: C.textPrimary }}>{user.display_name}</span>
                          {user.is_course_director && (
                            <span style={{ fontFamily: mono, fontSize: 9, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', background: 'rgba(250,157,51,0.1)', color: '#fa9d33', border: '1px solid rgba(250,157,51,0.2)', padding: '1px 4px', borderRadius: 3 }}>CD</span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontFamily: mono, fontSize: 10, color: C.textSecondary }}>{user.email}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontFamily: mono, fontSize: 9, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', background: roleColors.bg, color: roleColors.text, border: `1px solid ${roleColors.border}`, padding: '2px 8px', borderRadius: 3, display: 'inline-block' }}>{getRoleLabel(user.role)}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontFamily: sans, fontSize: 14, color: C.textSecondary }}>{user.institution?.name || '—'}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: user.is_active ? C.green : C.warmGray }} />
                          <span style={{ fontFamily: sans, fontSize: 13, color: C.textSecondary }}>{user.is_active ? 'Active' : 'Inactive'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontFamily: mono, fontSize: 9, color: C.textMuted }}>{formatDate(user.last_login_at)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && users.length > 0 && (
          <div style={{ background: C.parchment, borderTop: `1px solid ${C.borderLight}`, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })} disabled={pagination.page === 1} style={{ padding: '6px 12px', background: 'transparent', border: 'none', borderRadius: 6, fontFamily: sans, fontSize: 14, fontWeight: 600, color: pagination.page === 1 ? C.textMuted : C.navyDeep, cursor: pagination.page === 1 ? 'not-allowed' : 'pointer' }}>
              ← Previous
            </button>
            <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', color: C.textMuted }}>
              Page {pagination.page} of {pagination.total_pages}
            </span>
            <button onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })} disabled={pagination.page === pagination.total_pages} style={{ padding: '6px 12px', background: 'transparent', border: 'none', borderRadius: 6, fontFamily: sans, fontSize: 14, fontWeight: 600, color: pagination.page === pagination.total_pages ? C.textMuted : C.navyDeep, cursor: pagination.page === pagination.total_pages ? 'not-allowed' : 'pointer' }}>
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
