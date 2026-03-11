'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Download, Search, TrendingUp, TrendingDown, Minus, AlertTriangle, RefreshCw } from 'lucide-react';
import { C, sans, serif, mono } from '@/lib/design-tokens';

const USMLE_SYSTEMS = [
  'General Principles', 'Behavioral Health', 'Biostatistics/Epi',
  'Blood & Lymph', 'Cardiovascular', 'Endocrine',
  'Gastrointestinal', 'Immune System', 'Multisystem',
  'Musculoskeletal', 'Nervous System', 'Renal/Urinary',
  'Reproductive', 'Respiratory', 'Skin/Subcutaneous', 'Social Sciences'
];

const USMLE_TARGETS: Record<string, number> = {
  'General Principles': 12, 'Behavioral Health': 6, 'Biostatistics/Epi': 4,
  'Blood & Lymph': 5, 'Cardiovascular': 10, 'Endocrine': 6,
  'Gastrointestinal': 8, 'Immune System': 7, 'Multisystem': 4,
  'Musculoskeletal': 6, 'Nervous System': 9, 'Renal/Urinary': 6,
  'Reproductive': 5, 'Respiratory': 7, 'Skin/Subcutaneous': 3, 'Social Sciences': 2,
};

interface FacultyMember {
  id: string; name: string; initials: string; title: string; department: string;
  courses: string[]; total_items: number; overall_coverage: number;
  trend: 'up' | 'down' | 'flat'; trend_value: string;
  system_coverage: Record<string, { items: number; coverage_pct: number }>;
}

const MOCK_FACULTY: FacultyMember[] = [
  { id: 'f1', name: 'Dr. Amara Osei', initials: 'AO', title: 'Associate Professor', department: 'Pharmacology', courses: ['MEDI 531 \u2014 Organ Systems I', 'PHAR 501 \u2014 Medical Pharmacology'], total_items: 342, overall_coverage: 91, trend: 'up', trend_value: '+8% this month', system_coverage: { 'General Principles': { items: 28, coverage_pct: 85 }, 'Cardiovascular': { items: 62, coverage_pct: 96 }, 'Endocrine': { items: 35, coverage_pct: 88 }, 'Gastrointestinal': { items: 42, coverage_pct: 92 }, 'Nervous System': { items: 38, coverage_pct: 78 }, 'Respiratory': { items: 30, coverage_pct: 82 }, 'Renal/Urinary': { items: 28, coverage_pct: 76 }, 'Blood & Lymph': { items: 22, coverage_pct: 70 }, 'Immune System': { items: 18, coverage_pct: 65 }, 'Musculoskeletal': { items: 15, coverage_pct: 58 }, 'Reproductive': { items: 10, coverage_pct: 45 }, 'Behavioral Health': { items: 8, coverage_pct: 35 }, 'Skin/Subcutaneous': { items: 4, coverage_pct: 20 }, 'Biostatistics/Epi': { items: 2, coverage_pct: 10 }, 'Multisystem': { items: 0, coverage_pct: 0 }, 'Social Sciences': { items: 0, coverage_pct: 0 } } },
  { id: 'f2', name: 'Dr. James Chen', initials: 'JC', title: 'Professor', department: 'Anatomy', courses: ['MEDI 511 \u2014 Human Structure & Development'], total_items: 310, overall_coverage: 87, trend: 'up', trend_value: '+5% this month', system_coverage: { 'General Principles': { items: 35, coverage_pct: 90 }, 'Musculoskeletal': { items: 58, coverage_pct: 95 }, 'Nervous System': { items: 45, coverage_pct: 88 }, 'Cardiovascular': { items: 32, coverage_pct: 75 }, 'Respiratory': { items: 28, coverage_pct: 72 }, 'Gastrointestinal': { items: 25, coverage_pct: 68 }, 'Reproductive': { items: 30, coverage_pct: 80 }, 'Renal/Urinary': { items: 20, coverage_pct: 62 }, 'Endocrine': { items: 15, coverage_pct: 50 }, 'Skin/Subcutaneous': { items: 12, coverage_pct: 55 }, 'Blood & Lymph': { items: 6, coverage_pct: 28 }, 'Immune System': { items: 4, coverage_pct: 18 }, 'Behavioral Health': { items: 0, coverage_pct: 0 }, 'Biostatistics/Epi': { items: 0, coverage_pct: 0 }, 'Multisystem': { items: 0, coverage_pct: 0 }, 'Social Sciences': { items: 0, coverage_pct: 0 } } },
  { id: 'f3', name: 'Dr. Priya Sharma', initials: 'PS', title: 'Associate Professor', department: 'Pathology', courses: ['MEDI 551 \u2014 Pathophysiology & Therapeutics'], total_items: 280, overall_coverage: 82, trend: 'flat', trend_value: 'No change', system_coverage: { 'General Principles': { items: 40, coverage_pct: 92 }, 'Cardiovascular': { items: 30, coverage_pct: 78 }, 'Gastrointestinal': { items: 35, coverage_pct: 85 }, 'Respiratory': { items: 25, coverage_pct: 72 }, 'Blood & Lymph': { items: 28, coverage_pct: 75 }, 'Renal/Urinary': { items: 22, coverage_pct: 68 }, 'Endocrine': { items: 25, coverage_pct: 72 }, 'Nervous System': { items: 20, coverage_pct: 58 }, 'Immune System': { items: 18, coverage_pct: 55 }, 'Multisystem': { items: 15, coverage_pct: 62 }, 'Musculoskeletal': { items: 10, coverage_pct: 38 }, 'Reproductive': { items: 8, coverage_pct: 32 }, 'Skin/Subcutaneous': { items: 4, coverage_pct: 18 }, 'Behavioral Health': { items: 0, coverage_pct: 0 }, 'Biostatistics/Epi': { items: 0, coverage_pct: 0 }, 'Social Sciences': { items: 0, coverage_pct: 0 } } },
];

export default function FacultyUSMLECoveragePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [faculty, setFaculty] = useState<FacultyMember[]>([]);
  const [expandedFaculty, setExpandedFaculty] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'coverage' | 'items'>('coverage');

  useEffect(() => { fetchFacultyData(); }, []);

  const fetchFacultyData = async () => {
    setLoading(true);
    setError(false);
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      setFaculty(MOCK_FACULTY);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const departments = [...new Set(MOCK_FACULTY.map(f => f.department))];

  const filteredFaculty = faculty
    .filter(f => {
      const matchesSearch = !searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase()) || f.department.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDept = departmentFilter === 'all' || f.department === departmentFilter;
      return matchesSearch && matchesDept;
    })
    .sort((a, b) => {
      if (sortBy === 'coverage') return b.overall_coverage - a.overall_coverage;
      if (sortBy === 'items') return b.total_items - a.total_items;
      return a.name.localeCompare(b.name);
    });

  const toggleExpand = (id: string) => setExpandedFaculty(expandedFaculty === id ? null : id);

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp size={14} color={C.green} />;
    if (trend === 'down') return <TrendingDown size={14} color={C.error} />;
    return <Minus size={14} color={C.textMuted} />;
  };

  const getCoverageColor = (pct: number) => {
    if (pct >= 70) return C.green;
    if (pct >= 40) return '#fa9d33';
    return C.error;
  };

  return (
    <>
      <p style={{ fontFamily: sans, fontSize: 14, color: C.textSecondary, margin: '0 0 24px' }}>
        Per-faculty USMLE system coverage compared to Step 1 recommended distribution targets
      </p>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '0 0 240px' }}>
          <Search size={14} color={C.textMuted} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search faculty..."
            style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px 8px 30px', borderRadius: 6, border: `1px solid ${C.border}`, background: C.white, fontFamily: sans, fontSize: 13, color: C.ink, outline: 'none' }} />
        </div>
        <select value={departmentFilter} onChange={e => setDepartmentFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 6, border: `1px solid ${C.border}`, background: C.white, fontFamily: sans, fontSize: 13, color: C.ink, cursor: 'pointer' }}>
          <option value="all">All Departments</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['coverage', 'items', 'name'] as const).map(s => (
            <button key={s} onClick={() => setSortBy(s)} style={{
              padding: '6px 12px', borderRadius: 4, border: `1px solid ${sortBy === s ? C.navyDeep : C.border}`,
              background: sortBy === s ? `${C.navyDeep}08` : C.white, fontFamily: sans, fontSize: 12,
              color: sortBy === s ? C.navyDeep : C.textMuted, cursor: 'pointer', fontWeight: sortBy === s ? 600 : 400,
            }}>Sort: {s === 'coverage' ? 'Coverage' : s === 'items' ? 'Items' : 'Name'}</button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 6, border: `1px solid ${C.border}`, background: C.white, fontFamily: sans, fontSize: 13, fontWeight: 500, color: C.textSecondary, cursor: 'pointer' }}>
            <Download size={14} /> Export Report
          </button>
        </div>
      </div>

      {/* Target Reference */}
      <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.borderLight}`, padding: '16px 20px', marginBottom: 24 }}>
        <h3 style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.textMuted, margin: '0 0 12px' }}>USMLE Step 1 Recommended Distribution (% of exam)</h3>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {USMLE_SYSTEMS.map(sys => (
            <div key={sys} style={{ padding: '4px 10px', borderRadius: 4, background: C.parchment, border: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontFamily: sans, fontSize: 11, color: C.textSecondary }}>{sys}</span>
              <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 600, color: C.navyDeep }}>{USMLE_TARGETS[sys]}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Faculty Cards */}
      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center' }}>
          <div style={{ width: 24, height: 24, border: `3px solid ${C.borderLight}`, borderTopColor: C.navyDeep, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ fontFamily: sans, fontSize: 14, color: C.textMuted }}>Loading faculty data...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : error ? (
        <div style={{ background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: 64, textAlign: 'center' }}>
          <AlertTriangle size={48} style={{ color: C.error, marginBottom: 16 }} />
          <h3 style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, color: C.navyDeep, marginBottom: 8 }}>Failed to load faculty data</h3>
          <p style={{ fontFamily: sans, fontSize: 15, color: C.textSecondary, marginBottom: 16 }}>Something went wrong. Please try again.</p>
          <button onClick={fetchFacultyData} style={{ padding: '10px 20px', background: C.blueMid, border: 'none', borderRadius: 8, fontFamily: sans, fontSize: 14, fontWeight: 700, color: C.white, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <RefreshCw size={16} /> Retry
          </button>
        </div>
      ) : filteredFaculty.length === 0 ? (
        <div style={{ background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: 64, textAlign: 'center' }}>
          <Search size={48} style={{ color: C.textMuted, marginBottom: 16 }} />
          <h3 style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, color: C.navyDeep, marginBottom: 8 }}>No faculty found</h3>
          <p style={{ fontFamily: sans, fontSize: 15, color: C.textSecondary }}>Try adjusting your search or filters</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredFaculty.map((fac) => {
            const isExpanded = expandedFaculty === fac.id;
            const systemsCovered = USMLE_SYSTEMS.filter(s => (fac.system_coverage[s]?.coverage_pct || 0) > 0).length;
            const gapSystems = USMLE_SYSTEMS.filter(s => (fac.system_coverage[s]?.coverage_pct || 0) === 0);
            return (
              <div key={fac.id} style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.borderLight}`, overflow: 'hidden' }}>
                <button onClick={() => toggleExpand(fac.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ width: 42, height: 42, borderRadius: '50%', background: `${C.navyDeep}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: mono, fontSize: 14, fontWeight: 600, color: C.navyDeep, flexShrink: 0 }}>{fac.initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: sans, fontSize: 15, fontWeight: 600, color: C.textPrimary }}>{fac.name}</div>
                    <div style={{ fontFamily: sans, fontSize: 12, color: C.textMuted }}>{fac.title} &middot; {fac.department}</div>
                    <div style={{ fontFamily: sans, fontSize: 11, color: C.textMuted, marginTop: 2 }}>{fac.courses.join(' \u00b7 ')}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
                    {[
                      { label: 'Items', value: fac.total_items, color: C.navyDeep },
                      { label: 'Coverage', value: `${fac.overall_coverage}%`, color: getCoverageColor(fac.overall_coverage) },
                      { label: 'Systems', value: `${systemsCovered}/16`, color: C.navyDeep },
                    ].map(stat => (
                      <div key={stat.label} style={{ textAlign: 'center' }}>
                        <div style={{ fontFamily: mono, fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.textMuted }}>{stat.label}</div>
                        <div style={{ fontFamily: serif, fontSize: 18, fontWeight: 700, color: stat.color }}>{stat.value}</div>
                      </div>
                    ))}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {getTrendIcon(fac.trend)}
                      <span style={{ fontFamily: sans, fontSize: 11, color: fac.trend === 'up' ? C.green : fac.trend === 'down' ? C.error : C.textMuted }}>{fac.trend_value}</span>
                    </div>
                    {isExpanded ? <ChevronDown size={18} color={C.textMuted} /> : <ChevronRight size={18} color={C.textMuted} />}
                  </div>
                </button>
                {isExpanded && (
                  <div style={{ padding: '0 20px 20px', borderTop: `1px solid ${C.borderLight}` }}>
                    <div style={{ paddingTop: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <h3 style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.textMuted, margin: 0 }}>USMLE System Coverage vs Target</h3>
                        <div style={{ display: 'flex', gap: 12 }}>
                          {[{ color: C.blueMid, label: 'Faculty actual' }, { color: `${C.navyDeep}30`, label: 'USMLE target' }].map(l => (
                            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <div style={{ width: 12, height: 6, borderRadius: 2, background: l.color }} />
                              <span style={{ fontFamily: sans, fontSize: 10, color: C.textMuted }}>{l.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {USMLE_SYSTEMS.map(sys => {
                          const actual = fac.system_coverage[sys]?.coverage_pct || 0;
                          const target = USMLE_TARGETS[sys] || 0;
                          const targetScaled = target * (100 / 12);
                          const items = fac.system_coverage[sys]?.items || 0;
                          const delta = actual - targetScaled;
                          return (
                            <div key={sys} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 130, fontFamily: sans, fontSize: 12, color: C.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>{sys}</div>
                              <div style={{ flex: 1, position: 'relative', height: 22, background: C.parchment, borderRadius: 4, overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', left: `${Math.min(targetScaled, 100)}%`, top: 0, bottom: 0, width: 2, background: `${C.navyDeep}40`, zIndex: 2 }} />
                                <div style={{ width: `${Math.min(actual, 100)}%`, height: '100%', background: actual >= targetScaled ? C.blueMid : actual > 0 ? '#fa9d33' : 'transparent', borderRadius: 4, transition: 'width 0.4s ease' }} />
                              </div>
                              <div style={{ width: 40, fontFamily: mono, fontSize: 11, fontWeight: 600, color: getCoverageColor(actual), textAlign: 'right', flexShrink: 0 }}>{actual}%</div>
                              <div style={{ width: 35, fontFamily: mono, fontSize: 10, color: C.textMuted, textAlign: 'right', flexShrink: 0 }}>{items}q</div>
                              <div style={{ width: 45, fontFamily: mono, fontSize: 10, textAlign: 'right', flexShrink: 0, color: delta >= 0 ? C.green : delta > -20 ? '#fa9d33' : C.error, fontWeight: 600 }}>
                                {actual === 0 ? '\u2014' : delta >= 0 ? `+${Math.round(delta)}` : Math.round(delta)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {gapSystems.length > 0 && (
                      <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(201,40,45,0.04)', borderRadius: 8, border: '1px solid rgba(201,40,45,0.1)' }}>
                        <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.error, marginBottom: 6 }}>
                          Uncovered Systems ({gapSystems.length})
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {gapSystems.map(sys => (
                            <span key={sys} style={{ padding: '3px 10px', borderRadius: 4, fontFamily: sans, fontSize: 11, background: `${C.error}14`, color: C.error, border: `1px solid ${C.error}26` }}>{sys}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
