'use client';

import { useState, useEffect } from 'react';
import { Search, X, CheckCircle2, Clock, Mail, Phone, Globe, Hash, FileCheck } from 'lucide-react';
import { C, sans, serif, mono } from '@/lib/design-tokens';

interface Application {
  id: string;
  institution_name: string;
  institution_type: 'md' | 'do' | 'combined';
  accreditation_body: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  student_count: number;
  website_url: string | null;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
};

const getTypeLabel = (type: Application['institution_type']) => {
  switch (type) {
    case 'md': return 'MD (Allopathic)';
    case 'do': return 'DO (Osteopathic)';
    case 'combined': return 'Combined MD/DO';
  }
};

export default function ApplicationReviewQueue() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', status: 'pending' });
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [modalAction, setModalAction] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => { fetchApplications(); }, [filters]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      const mockApplications: Application[] = [
        { id: '1', institution_name: 'Tuskegee University School of Veterinary Medicine', institution_type: 'md', accreditation_body: 'LCME', contact_name: 'Dr. Patricia Williams', contact_email: 'pwilliams@tuskegee.edu', contact_phone: '+1-334-727-8800', student_count: 320, website_url: 'https://www.tuskegee.edu/programs-courses/colleges-schools/veterinary-medicine', reason: 'Interested in improving assessment quality and curriculum mapping for LCME accreditation.', status: 'pending', submitted_at: '2026-02-18T14:30:00Z', reviewed_at: null, reviewed_by: null },
        { id: '2', institution_name: 'Xavier University of Louisiana Pre-Med', institution_type: 'combined', accreditation_body: 'SACSCOC', contact_name: 'Dr. James Martinez', contact_email: 'jmartinez@xula.edu', contact_phone: null, student_count: 180, website_url: 'https://www.xula.edu', reason: null, status: 'pending', submitted_at: '2026-02-17T09:15:00Z', reviewed_at: null, reviewed_by: null },
        { id: '3', institution_name: 'Florida A&M University College of Pharmacy', institution_type: 'do', accreditation_body: 'ACPE', contact_name: 'Dr. Angela Thompson', contact_email: 'athompson@famu.edu', contact_phone: '+1-850-599-3000', student_count: 425, website_url: 'https://pharmacy.famu.edu', reason: 'Looking for AI-powered assessment tools to support our curriculum revision process.', status: 'pending', submitted_at: '2026-02-16T11:45:00Z', reviewed_at: null, reviewed_by: null },
      ];
      const filtered = mockApplications.filter((app) => {
        if (filters.status !== 'all' && app.status !== filters.status) return false;
        if (filters.search) {
          const search = filters.search.toLowerCase();
          return app.institution_name.toLowerCase().includes(search) || app.contact_name.toLowerCase().includes(search) || app.contact_email.toLowerCase().includes(search);
        }
        return true;
      });
      setApplications(filtered);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (application: Application, action: 'approve' | 'reject') => {
    setSelectedApplication(application);
    setModalAction(action);
    setRejectionReason('');
  };

  const handleCloseModal = () => {
    setSelectedApplication(null);
    setModalAction(null);
    setRejectionReason('');
  };

  const handleConfirmAction = async () => {
    if (!selectedApplication || !modalAction) return;
    setIsProcessing(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await fetchApplications();
      handleCloseModal();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      {/* Review Modal */}
      {selectedApplication && modalAction && (
        <ReviewModal
          application={selectedApplication}
          action={modalAction}
          rejectionReason={rejectionReason}
          onRejectionReasonChange={setRejectionReason}
          isProcessing={isProcessing}
          onClose={handleCloseModal}
          onConfirm={handleConfirmAction}
        />
      )}

      <div style={{ maxWidth: 1400 }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Pending Review', value: applications.filter((a) => a.status === 'pending').length, color: '#fa9d33', icon: <Clock size={20} /> },
            { label: 'Approved', value: applications.filter((a) => a.status === 'approved').length, color: C.green, icon: <CheckCircle2 size={20} /> },
            { label: 'Total Applications', value: applications.length, color: C.navyDeep, icon: <FileCheck size={20} /> },
          ].map((stat) => (
            <div key={stat.label} style={{ background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 8, padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 8, background: `${stat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color, flexShrink: 0 }}>{stat.icon}</div>
              <div>
                <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 4 }}>{stat.label}</div>
                <div style={{ fontFamily: serif, fontSize: 28, fontWeight: 700, color: stat.color }}>{stat.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filter Bar */}
        <div style={{ background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
            <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 240 }}>
              <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.textMuted }} />
              <input type="search" placeholder="Search applications..." value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} style={{ width: '100%', height: 40, background: C.parchment, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0 16px 0 40px', fontFamily: sans, fontSize: 15, color: C.ink, outline: 'none' }} />
            </div>
            <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} style={{ width: 160, height: 40, background: C.parchment, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0 32px 0 12px', fontFamily: sans, fontSize: 15, color: C.ink, outline: 'none', cursor: 'pointer' }}>
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Applications List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {loading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} style={{ height: 120, background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 12 }} className="animate-pulse" />
            ))
          ) : applications.length === 0 ? (
            <div style={{ background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: 64, textAlign: 'center' }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(0,44,118,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <FileCheck size={36} color="rgba(0,44,118,0.3)" />
              </div>
              <h3 style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, color: C.navyDeep, marginBottom: 8 }}>No applications found</h3>
              <p style={{ fontFamily: sans, fontSize: 15, color: C.textSecondary }}>Try adjusting your filters</p>
            </div>
          ) : (
            applications.map((app) => (
              <div key={app.id} style={{ background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: 24, transition: 'box-shadow 0.2s ease' }}>
                <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, color: C.navyDeep, margin: '0 0 4px' }}>{app.institution_name}</h3>
                    <div style={{ fontFamily: sans, fontSize: 14, color: C.textSecondary, marginBottom: 12 }}>
                      {getTypeLabel(app.institution_type)} · {app.student_count.toLocaleString()} students
                    </div>
                    <div style={{ fontFamily: mono, fontSize: 10, color: C.textMuted }}>Submitted {formatDate(app.submitted_at)}</div>
                  </div>
                  {app.status === 'pending' && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => handleOpenModal(app, 'approve')} style={{ padding: '8px 16px', background: C.green, border: 'none', borderRadius: 6, fontFamily: sans, fontSize: 14, fontWeight: 700, color: C.white, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CheckCircle2 size={16} /> Approve
                      </button>
                      <button onClick={() => handleOpenModal(app, 'reject')} style={{ padding: '8px 16px', background: C.white, border: `2px solid ${C.border}`, borderRadius: 6, fontFamily: sans, fontSize: 14, fontWeight: 700, color: '#c9282d', cursor: 'pointer' }}>
                        Reject
                      </button>
                    </div>
                  )}
                </div>
                <div style={{ background: C.parchment, border: `1px solid ${C.borderLight}`, borderRadius: 8, padding: 12, display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                  <div style={{ flex: '1 1 200px' }}>
                    <div style={{ fontFamily: mono, fontSize: 9, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 4 }}>Contact</div>
                    <div style={{ fontFamily: sans, fontSize: 14, fontWeight: 600, color: C.ink }}>{app.contact_name}</div>
                    <div style={{ fontFamily: mono, fontSize: 10, color: C.textSecondary }}>{app.contact_email}</div>
                  </div>
                  <div style={{ flex: '1 1 200px' }}>
                    <div style={{ fontFamily: mono, fontSize: 9, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 4 }}>Accreditation</div>
                    <div style={{ fontFamily: sans, fontSize: 14, color: C.textSecondary }}>{app.accreditation_body}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

function ReviewModal({ application, action, rejectionReason, onRejectionReasonChange, isProcessing, onClose, onConfirm }: {
  application: Application;
  action: 'approve' | 'reject';
  rejectionReason: string;
  onRejectionReasonChange: (v: string) => void;
  isProcessing: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,44,118,0.12)', backdropFilter: 'blur(4px)', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 640, maxHeight: '90vh', background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 12, boxShadow: '0 16px 64px rgba(0,44,118,0.12)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '24px 32px', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, color: C.navyDeep, margin: 0 }}>
            {action === 'approve' ? 'Approve Application' : 'Reject Application'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: C.textMuted }}><X size={20} /></button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 8 }}>Institution</div>
            <h3 style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, color: C.navyDeep, margin: '0 0 4px' }}>{application.institution_name}</h3>
            <div style={{ fontFamily: sans, fontSize: 14, color: C.textSecondary }}>{getTypeLabel(application.institution_type)} · {application.accreditation_body}</div>
          </div>

          <div style={{ background: C.parchment, border: `1px solid ${C.borderLight}`, borderRadius: 8, padding: 16, marginBottom: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ fontFamily: mono, fontSize: 9, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 4 }}>Contact</div>
                <div style={{ fontFamily: sans, fontSize: 14, fontWeight: 600, color: C.ink, marginBottom: 2 }}>{application.contact_name}</div>
                <div style={{ fontFamily: mono, fontSize: 10, color: C.textSecondary, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}><Mail size={12} />{application.contact_email}</div>
                {application.contact_phone && <div style={{ fontFamily: mono, fontSize: 10, color: C.textSecondary, display: 'flex', alignItems: 'center', gap: 6 }}><Phone size={12} />{application.contact_phone}</div>}
              </div>
              <div>
                <div style={{ fontFamily: mono, fontSize: 9, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 4 }}>Details</div>
                <div style={{ fontFamily: sans, fontSize: 14, color: C.textSecondary, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}><Hash size={12} />{application.student_count.toLocaleString()} students</div>
                {application.website_url && <div style={{ fontFamily: mono, fontSize: 10, color: C.blueMid, display: 'flex', alignItems: 'center', gap: 6 }}><Globe size={12} /><a href={application.website_url} target="_blank" rel="noopener noreferrer" style={{ color: C.blueMid }}>Website</a></div>}
              </div>
            </div>
          </div>

          {application.reason && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 8 }}>Reason for Interest</div>
              <div style={{ fontFamily: sans, fontSize: 15, color: C.textSecondary, lineHeight: 1.7 }}>{application.reason}</div>
            </div>
          )}

          {action === 'reject' && (
            <div>
              <label style={{ display: 'block', fontFamily: mono, fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 8 }}>Reason for Rejection (Optional)</label>
              <textarea value={rejectionReason} onChange={(e) => onRejectionReasonChange(e.target.value)} placeholder="Provide context for this decision..." rows={3} style={{ width: '100%', background: C.parchment, border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 16px', fontFamily: sans, fontSize: 15, color: C.ink, resize: 'none', outline: 'none' }} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '20px 32px', borderTop: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={onClose} disabled={isProcessing} style={{ padding: '10px 20px', background: 'transparent', border: 'none', borderRadius: 6, fontFamily: sans, fontSize: 15, fontWeight: 700, color: C.navyDeep, cursor: isProcessing ? 'not-allowed' : 'pointer' }}>Cancel</button>
          <button onClick={onConfirm} disabled={isProcessing} style={{ padding: '12px 24px', background: isProcessing ? C.textMuted : (action === 'approve' ? C.green : '#c9282d'), border: 'none', borderRadius: 6, fontFamily: sans, fontSize: 15, fontWeight: 700, color: C.white, cursor: isProcessing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            {isProcessing ? 'Processing...' : action === 'approve' ? (<><CheckCircle2 size={18} />Approve Application</>) : (<><X size={18} />Reject Application</>)}
          </button>
        </div>
      </div>
    </div>
  );
}
