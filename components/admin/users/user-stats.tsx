import React from 'react';
import { Users, Shield, Building2, UserCheck } from 'lucide-react';

interface UserStatsProps {
  stats: {
    total: number;
    superAdmins: number;
    departmentAdmins: number;
    active: number;
    inactive: number;
  };
}

export function UserStats({ stats }: UserStatsProps) {
  const cards = [
    {
      label: 'Total Staff',
      value: stats.total,
      icon: Users,
      color: 'text-[#171717]',
      bg: 'bg-stone-50',
    },
    {
      label: 'Super Admins',
      value: stats.superAdmins,
      icon: Shield,
      color: 'text-[#B58A55]',
      bg: 'bg-amber-50',
    },
    {
      label: 'Department Admins',
      value: stats.departmentAdmins,
      icon: Building2,
      color: 'text-blue-700',
      bg: 'bg-blue-50',
    },
    {
      label: 'Active Accounts',
      value: stats.active,
      icon: UserCheck,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="p-4 bg-white border border-[#E8E2D8] rounded-sm shadow-xs flex items-center justify-between"
          >
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#77736C] block">
                {card.label}
              </span>
              <span className="font-serif text-2xl font-bold text-[#171717] mt-0.5 block">
                {card.value}
              </span>
            </div>
            <div className={`p-2.5 rounded-sm ${card.bg} ${card.color}`}>
              <Icon className="w-5 h-5" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
