'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { C, sans, serif, mono } from '@/lib/design-tokens';

interface CourseFormData {
  code: string;
  name: string;
  term: string;
  description: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'draft';
}

export default function CreateCoursePage() {
  const router = useRouter();

  const [formData, setFormData] = useState<CourseFormData>({
    code: '',
    name: '',
    term: 'Spring 2026',
    description: '',
    start_date: '',
    end_date: '',
    status: 'draft',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof CourseFormData, string>>>({});
  const [saving, setSaving] = useState(false);

  const validateForm = () => {
    const newErrors: Partial<Record<keyof CourseFormData, string>> = {};
    if (!formData.code.trim()) newErrors.code = 'Course code is required';
    if (!formData.name.trim()) newErrors.name = 'Course name is required';
    if (!formData.term.trim()) newErrors.term = 'Term is required';
    if (!formData.start_date) newErrors.start_date = 'Start date is required';
    if (!formData.end_date) newErrors.end_date = 'End date is required';
    if (formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      if (end <= start) newErrors.end_date = 'End date must be after start date';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSaving(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      console.log('Saving course:', formData);
      router.push('/faculty/courses/1');
    } catch (err) {
      console.error('Failed to save course', err);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof CourseFormData, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) setErrors({ ...errors, [field]: undefined });
  };

  const labelStyle = { display: 'block' as const, fontFamily: mono, fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: C.textMuted, marginBottom: 8 };
  const inputStyle = (hasError: boolean) => ({ width: '100%', height: 44, background: C.parchment, border: `1px solid ${hasError ? C.error : C.border}`, borderRadius: 8, padding: '0 16px', fontFamily: sans, fontSize: 15, color: C.ink, outline: 'none' });
  const errorStyle = { fontFamily: sans, fontSize: 12, color: C.error, marginTop: 6 };

  return (
    <>
      {/* Back link */}
      <button onClick={() => router.push('/faculty/courses')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontFamily: mono, fontSize: 10, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase', color: C.blueMid, marginBottom: 24 }}>
        <ArrowLeft size={14} /> Back to Courses
      </button>

      <h1 style={{ fontFamily: serif, fontSize: 24, fontWeight: 700, color: C.navyDeep, marginBottom: 4 }}>Create Course</h1>
      <p style={{ fontFamily: sans, fontSize: 15, color: C.textMuted, marginBottom: 24 }}>Set up a new course for question generation</p>

      <div style={{ maxWidth: 900 }}>
        <form onSubmit={handleSubmit}>
          <div style={{ background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: 32 }}>
            {/* Course Code */}
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Course Code <span style={{ color: C.error }}>*</span></label>
              <input type="text" value={formData.code} onChange={(e) => handleChange('code', e.target.value)} placeholder="e.g., PHARM-501" style={inputStyle(!!errors.code)} />
              {errors.code && <div style={errorStyle}>{errors.code}</div>}
            </div>

            {/* Course Name */}
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Course Name <span style={{ color: C.error }}>*</span></label>
              <input type="text" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} placeholder="e.g., Pharmacology I" style={inputStyle(!!errors.name)} />
              {errors.name && <div style={errorStyle}>{errors.name}</div>}
            </div>

            {/* Term */}
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Term <span style={{ color: C.error }}>*</span></label>
              <select value={formData.term} onChange={(e) => handleChange('term', e.target.value)}
                style={{ ...inputStyle(!!errors.term), cursor: 'pointer' }}>
                <option value="Spring 2026">Spring 2026</option>
                <option value="Summer 2026">Summer 2026</option>
                <option value="Fall 2026">Fall 2026</option>
                <option value="Winter 2027">Winter 2027</option>
              </select>
              {errors.term && <div style={errorStyle}>{errors.term}</div>}
            </div>

            {/* Description */}
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Description</label>
              <textarea value={formData.description} onChange={(e) => handleChange('description', e.target.value)} placeholder="Provide a brief description of the course..." rows={4}
                style={{ width: '100%', background: C.parchment, border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 16px', fontFamily: sans, fontSize: 15, lineHeight: 1.6, color: C.ink, outline: 'none', resize: 'vertical' }} />
            </div>

            {/* Dates */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <div>
                <label style={labelStyle}>Start Date <span style={{ color: C.error }}>*</span></label>
                <input type="date" value={formData.start_date} onChange={(e) => handleChange('start_date', e.target.value)} style={inputStyle(!!errors.start_date)} />
                {errors.start_date && <div style={errorStyle}>{errors.start_date}</div>}
              </div>
              <div>
                <label style={labelStyle}>End Date <span style={{ color: C.error }}>*</span></label>
                <input type="date" value={formData.end_date} onChange={(e) => handleChange('end_date', e.target.value)} style={inputStyle(!!errors.end_date)} />
                {errors.end_date && <div style={errorStyle}>{errors.end_date}</div>}
              </div>
            </div>

            {/* Status */}
            <div style={{ marginBottom: 32 }}>
              <label style={labelStyle}>Status</label>
              <select value={formData.status} onChange={(e) => handleChange('status', e.target.value as 'active' | 'draft')}
                style={{ ...inputStyle(false), cursor: 'pointer' }}>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 12, paddingTop: 24, borderTop: `1px solid ${C.borderLight}` }}>
              <button type="button" onClick={() => router.push('/faculty/courses')} disabled={saving}
                style={{ flex: 1, padding: '12px 24px', background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, fontFamily: sans, fontSize: 15, fontWeight: 700, color: C.textSecondary, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.5 : 1, transition: 'all 0.2s ease' }}>
                Cancel
              </button>
              <button type="submit" disabled={saving}
                style={{ flex: 1, padding: '12px 24px', background: saving ? C.textMuted : C.green, border: 'none', borderRadius: 8, fontFamily: sans, fontSize: 15, fontWeight: 700, color: C.white, cursor: saving ? 'not-allowed' : 'pointer', transition: 'all 0.2s ease' }}
                onMouseEnter={(e) => { if (!saving) e.currentTarget.style.background = C.greenDark; }}
                onMouseLeave={(e) => { if (!saving) e.currentTarget.style.background = C.green; }}>
                {saving ? 'Saving...' : 'Create Course'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
