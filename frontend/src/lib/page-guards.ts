import { redirect } from 'next/navigation';
import { requireRole } from './auth';
import type { UserProfile } from './auth';
import { createServerSupabaseClient } from './supabase-server';

export async function requireCourseDirector(): Promise<UserProfile> {
  const user = await requireRole(['faculty', 'superadmin']);

  if (user.role === 'superadmin') return user;

  if (!user.is_course_director) {
    redirect('/unauthorized');
  }

  return user;
}

export async function requireItemOwnerOrAdmin(itemId: string): Promise<UserProfile> {
  const user = await requireRole(['faculty', 'superadmin']);

  if (user.role === 'superadmin') return user;

  const supabase = await createServerSupabaseClient();
  const { data: item } = await supabase
    .from('assessment_items')
    .select('created_by')
    .eq('id', itemId)
    .single();

  if (!item || item.created_by !== user.id) {
    redirect('/unauthorized');
  }

  return user;
}

export async function requireCourseAccess(courseId: string): Promise<UserProfile> {
  const user = await requireRole(['faculty', 'superadmin']);

  if (user.role === 'superadmin') return user;

  const supabase = await createServerSupabaseClient();
  const { data: assignment } = await supabase
    .from('course_faculty')
    .select('id')
    .eq('course_id', courseId)
    .eq('faculty_id', user.id)
    .single();

  if (!assignment) {
    redirect('/unauthorized');
  }

  return user;
}
