'use client';

import { useEffect, useState } from 'react';
import { Check, ChevronDown, UserRound } from 'lucide-react';

type TeamMember = {
  userId: string;
  name: string;
  role: 'owner' | 'admin' | 'manager' | 'member';
  isMe: boolean;
};

type MembersResponse = {
  success?: boolean;
  members?: TeamMember[];
  currentUserId?: string | null;
  permissions?: { canManageTeamPlanning?: boolean };
};

type Props = {
  value: string;
  onChange: (userId: string) => void;
  disabled?: boolean;
};

const roleLabels: Record<TeamMember['role'], string> = {
  owner: 'Artisan',
  admin: 'Administrateur',
  manager: 'Responsable',
  member: 'Collaborateur',
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase();
}

export default function AppointmentAssigneeSelect({ value, onChange, disabled = false }: Props) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [canManageTeam, setCanManageTeam] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    const loadMembers = async () => {
      try {
        const response = await fetch('/api/team/members-lite', { signal: controller.signal });
        const json = await response.json() as MembersResponse;
        if (!response.ok || !json.success) throw new Error('Unable to load team members.');

        const nextMembers = Array.isArray(json.members) ? json.members : [];
        const fallbackUserId = json.currentUserId || nextMembers.find((member) => member.isMe)?.userId || null;
        if (controller.signal.aborted) return;

        setMembers(nextMembers);
        setCurrentUserId(fallbackUserId);
        setCanManageTeam(Boolean(json.permissions?.canManageTeamPlanning));
        if (!value && fallbackUserId) onChange(fallbackUserId);
      } catch {
        if (!controller.signal.aborted) setMembers([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void loadMembers();
    return () => controller.abort();
  }, [onChange, value]);

  const availableMembers = canManageTeam
    ? members
    : members.filter((member) => member.userId === currentUserId);
  const selectedMember = availableMembers.find((member) => member.userId === value)
    || members.find((member) => member.userId === value)
    || null;

  return (
    <label className="block text-sm font-medium text-[#E7EDF4]">
      Affecté à
      <span className="relative mt-2 block">
        <UserRound className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-[#8291A2]" />
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled || loading || !availableMembers.length}
          className="w-full appearance-none rounded-lg border border-[#3A4A59] bg-[#111F2E] py-2.5 pl-9 pr-10 text-sm text-[#F8FAFC] outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/25 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? <option>Chargement des collaborateurs...</option> : null}
          {!loading && !availableMembers.length ? <option>Aucun collaborateur disponible</option> : null}
          {availableMembers.map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.name} - {roleLabels[member.role]}{member.isMe ? ' (Vous)' : ''}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#8291A2]" />
      </span>
      {selectedMember ? (
        <span className="mt-2 flex items-center gap-2 rounded-lg border border-[#344657] bg-[#111F2E] px-3 py-2 text-xs text-[#B7C4D1]">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-emerald-400/15 text-[10px] font-bold text-emerald-300">{initials(selectedMember.name)}</span>
          <span className="min-w-0 flex-1"><span className="block truncate font-semibold text-[#E7EDF4]">{selectedMember.name}</span><span>{roleLabels[selectedMember.role]}</span></span>
          {selectedMember.isMe ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-1 text-[11px] font-semibold text-emerald-300"><Check className="size-3" />Vous</span> : null}
        </span>
      ) : null}
    </label>
  );
}
