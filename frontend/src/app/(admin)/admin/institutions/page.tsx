'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Download, MoreVertical, Building2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { C, sans, serif, mono } from '@/lib/design-tokens';

interface Institution {
  id: string;
  name: string;
  status: 'active' | 'pending' | 'suspended';
  user_count: number;
  course_count: number;
  last_activity: string | null;
  created_at: string;
}

interface PaginationData {
  page: number;
  limit: number;
  total_pages: number;
  total_count: number;
}

type SortColumn = 'name' | 'status' | 'users' | 'courses' | 'last_activity' | 'created';
type SortDirection = 'asc' | 'desc';

const getStatusColor = (status: Institution['status']) => {
  switch (status) {
    case 'active': return { bg: 'rgba(105,163,56,0.1)', text: C.green, border: 'rgba(105,163,56,0.2)' };
    case 'pending': return { bg: 'rgba(250,157,51,0.1)', text: '#fa9d33', border: 'rgba(250,157,51,0.2)' };
    case 'suspended': return { bg: 'rgba(201,40,45,0.1)', text: '#c9282d', border: 'rgba(201,40,45,0.2)' };
  }
};

const getStatusIcon = (status: Institution['status']) => {
  switch (status) {
    case 'active': return <CheckCircle2 size={14} />;
    case 'pending': return <Clock size={14} />;
    case 'suspended': return <XCircle size={14} />;
  }
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
};

const formatRelativeTime = (dateString: string | null) => {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
};

export default function InstitutionListDashboard() {
  const router = useRouter();
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationData>({ page: 1, limit: 25, total_pages: 1, total_count: 0 });
  const [filters, setFilters] = useState({ search: '', status: 'all' });
  const [sort] = useState<{ by: SortColumn; dir: SortDirection }>({ by: 'name', dir: 'asc' });
  const [selectedInstitutions, setSelectedInstitutions] = useState<Set<string>>(new Set());
  const [searchDebounce, setSearchDebounce] = useState<ReturnType<typeof setTimeout> | null>(null);

  const fetchInstitutions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      const mockInstitutions: Institution[] = [
        { id: '1', name: 'Morehouse School of Medicine', status: 'active', user_count: 342, course_count: 28, last_activity: '2026-02-20T08:30:00Z', created_at: '2024-08-15T00:00:00Z' },
        { id: '2', name: 'Howard University College of Medicine', status: 'active', user_count: 289, course_count: 24, last_activity: '2026-02-19T14:22:00Z', created_at: '2024-09-01T00:00:00Z' },
        { id: '3', name: 'Meharry Medical College', status: 'active', user_count: 198, course_count: 18, last_activity: '2026-02-18T10:15:00Z', created_at: '2024-10-12T00:00:00Z' },
        { id: '4', name: 'Charles R. Drew University', status: 'pending', user_count: 0, course_count: 0, last_activity: null, created_at: '2026-02-15T00:00:00Z' },
        { id: '5', name: 'University of California, San Francisco', status: 'active', user_count: 512, course_count: 42, last_activity: '2026-02-20T09:45:00Z', created_at: '2024-07-20T00:00:00Z' },
        { id: '6', name: 'Emory University School of Medicine', status: 'suspended', user_count: 156, course_count: 12, last_activity: '2026-01-10T16:30:00Z', created_at: '2024-11-03T00:00:00Z' },
      ];
      setInstitutions(mockInstitutions);
      setPagination({ page: 1, limit: 25, total_pages: 1, total_count: mockInstitutions.length });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, sort, filters]);

  useEffect(() => { fetchInstitutions(); }, [fetchInstitutions]);

  const handleSearchChange = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
    if (searchDebounce) clearTimeout(searchDebounce);
    const timeout = setTimeout(() => { fetchInstitutions(); }, 300);
    setSearchDebounce(timeout);
  };

  const handleSelectAll = () => {
    if (selectedInstitutions.size === institutions.length) {
      setSelectedInstitutions(new Set());
    } else {
      setSelectedInstitutions(new Set(institutions.map((i) => i.id)));
    }
  };

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedInstitutions);
    if (newSelected.has(id)) { newSelected.delete(id); } else { newSelected.add(id); }
    setSelectedInstitutions(newSelected);
  };

  return (
    <div style={{ maxWidth: 1400 }}>
      {/* Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Institutions', value: pagination.total_count, color: C.navyDeep },
          { label: 'Active', value: institutions.filter((i) => i.status === 'active').length, color: C.green },
          { label: 'Pending', value: institutions.filter((i) => i.status === 'pending').length, color: '#fa9d33' },
          { label: 'Total Users', value: institutions.reduce((sum, i) => sum + i.user_count, 0).toLocaleString(), color: C.blueMid },
        ].map((stat) => (
          <div key={stat.label} style={{ background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 8, padding: 16 }}>
            <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 8 }}>{stat.label}</div>
            <div style={{ fontFamily: serif, fontSize: 28, fontWeight: 700, color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div style={{ background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 240 }}>
            <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.textMuted }} />
            <input type="search" placeholder="Search institutions..." value={filters.search} onChange={(e) => handleSearchChange(e.target.value)} style={{ width: '100%', height: 40, background: C.parchment, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0 16px 0 40px', fontFamily: sans, fontSize: 15, color: C.ink, outline: 'none' }} />
          </div>
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} style={{ width: 160, height: 40, background: C.parchment, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0 32px 0 12px', fontFamily: sans, fontSize: 15, color: C.ink, outline: 'none', cursor: 'pointer' }}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
          </select>
          {selectedInstitutions.size > 0 && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', color: C.textMuted }}>{selectedInstitutions.size} selected</span>
              <button style={{ padding: '8px 16px', background: C.parchment, border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: sans, fontSize: 14, fontWeight: 600, color: C.navyDeep, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Download size={16} /> Export
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Data Table */}
      <div style={{ background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 24 }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ height: 56, background: C.parchment, borderRadius: 6, marginBottom: 8 }} className="animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <p style={{ fontFamily: sans, fontSize: 15, color: '#c9282d', marginBottom: 16 }}>{error}</p>
            <button onClick={fetchInstitutions} style={{ padding: '8px 16px', background: C.parchment, border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: sans, fontSize: 14, fontWeight: 600, color: C.navyDeep, cursor: 'pointer' }}>Retry</button>
          </div>
        ) : institutions.length === 0 ? (
          <div style={{ padding: 64, textAlign: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(0,44,118,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Building2 size={36} color="rgba(0,44,118,0.3)" />
            </div>
            <h3 style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, color: C.navyDeep, marginBottom: 8 }}>No institutions found</h3>
            <p style={{ fontFamily: sans, fontSize: 15, color: C.textSecondary, marginBottom: 20 }}>Try adjusting your filters</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: C.parchment, borderBottom: `1px solid ${C.borderLight}` }}>
                <tr>
                  <th style={{ padding: '12px 16px', width: 40 }}>
                    <input type="checkbox" checked={selectedInstitutions.size === institutions.length} onChange={handleSelectAll} style={{ cursor: 'pointer' }} />
                  </th>
                  {['Name', 'Status', 'Users', 'Courses', 'Last Activity', 'Created'].map((col) => (
                    <th key={col} style={{ padding: '12px 16px', textAlign: 'left', fontFamily: mono, fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted, whiteSpace: 'nowrap' }}>{col}</th>
                  ))}
                  <th style={{ padding: '12px 16px', width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {institutions.map((inst) => {
                  const statusColors = getStatusColor(inst.status);
                  return (
                    <tr key={inst.id} style={{ background: C.white, borderBottom: `1px solid ${C.borderLight}`, transition: 'background 0.15s ease', cursor: 'pointer' }}
                      onClick={() => router.push(`/admin/institutions/${inst.id}`)}
                      onMouseEnter={(e) => { e.currentTarget.style.background = C.parchment; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = C.white; }}
                    >
                      <td style={{ padding: '12px 16px' }} onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={selectedInstitutions.has(inst.id)} onChange={() => handleSelectOne(inst.id)} style={{ cursor: 'pointer' }} />
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 6, background: 'rgba(0,44,118,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Building2 size={16} color={C.navyDeep} />
                          </div>
                          <span style={{ fontFamily: sans, fontSize: 15, fontWeight: 600, color: C.textPrimary }}>{inst.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: mono, fontSize: 9, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', background: statusColors.bg, color: statusColors.text, border: `1px solid ${statusColors.border}`, padding: '4px 8px', borderRadius: 4 }}>
                          {getStatusIcon(inst.status)} {inst.status}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}><span style={{ fontFamily: sans, fontSize: 15, fontWeight: 600, color: C.textPrimary }}>{inst.user_count.toLocaleString()}</span></td>
                      <td style={{ padding: '12px 16px' }}><span style={{ fontFamily: sans, fontSize: 15, fontWeight: 600, color: C.textPrimary }}>{inst.course_count}</span></td>
                      <td style={{ padding: '12px 16px' }}><span style={{ fontFamily: mono, fontSize: 10, color: C.textSecondary }}>{formatRelativeTime(inst.last_activity)}</span></td>
                      <td style={{ padding: '12px 16px' }}><span style={{ fontFamily: mono, fontSize: 10, color: C.textMuted }}>{formatDate(inst.created_at)}</span></td>
                      <td style={{ padding: '12px 16px' }} onClick={(e) => e.stopPropagation()}>
                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: C.textMuted }}><MoreVertical size={16} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && institutions.length > 0 && (
          <div style={{ background: C.parchment, borderTop: `1px solid ${C.borderLight}`, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })} disabled={pagination.page === 1} style={{ padding: '6px 12px', background: 'transparent', border: 'none', borderRadius: 6, fontFamily: sans, fontSize: 14, fontWeight: 600, color: pagination.page === 1 ? C.textMuted : C.navyDeep, cursor: pagination.page === 1 ? 'not-allowed' : 'pointer' }}>← Previous</button>
            <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', color: C.textMuted }}>Page {pagination.page} of {pagination.total_pages}</span>
            <button onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })} disabled={pagination.page === pagination.total_pages} style={{ padding: '6px 12px', background: 'transparent', border: 'none', borderRadius: 6, fontFamily: sans, fontSize: 14, fontWeight: 600, color: pagination.page === pagination.total_pages ? C.textMuted : C.navyDeep, cursor: pagination.page === pagination.total_pages ? 'not-allowed' : 'pointer' }}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}
