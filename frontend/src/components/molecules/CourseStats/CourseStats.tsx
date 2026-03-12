'use client';

import { BookOpen, FileText, Layers } from 'lucide-react';

interface CourseStatsProps {
  courseCount: number;
  itemCount: number;
  subconceptCount: number;
}

export default function CourseStats({ courseCount, itemCount, subconceptCount }: CourseStatsProps) {
  const stats = [
    { label: 'Total Courses', value: courseCount, icon: BookOpen, iconBg: 'bg-[#FFC645]/10', iconColor: 'text-[#FFC645]' },
    { label: 'Total Items', value: itemCount, icon: FileText, iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
    { label: 'Total SubConcepts', value: subconceptCount, icon: Layers, iconBg: 'bg-green-100', iconColor: 'text-green-600' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-white rounded-[--radius-xl] border border-[--border-light] p-4 hover:border-[--blue-mid] hover:shadow-[--shadow-sm] transition-all">
          <div className="flex items-center gap-3">
            <div className={`size-10 rounded-lg ${stat.iconBg} flex items-center justify-center`}>
              <stat.icon className={`size-5 ${stat.iconColor}`} />
            </div>
            <div>
              <p className="text-sm text-[--text-secondary]">{stat.label}</p>
              <p className="text-xl font-semibold text-[--ink]">{stat.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
