import { startTransition, useDeferredValue, useMemo, useState } from 'react';
import { Clock3, FolderOpen, Trash2 } from 'lucide-react';

import { formatTimestamp } from '@/lib/utils';
import type { CampaignSession } from '@/types/campaign';

interface HistoryPanelProps {
  sessions: CampaignSession[];
  activeSessionId?: string;
  onOpen: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
}

export function HistoryPanel({
  sessions,
  activeSessionId,
  onDelete,
  onOpen,
}: HistoryPanelProps) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  const filteredSessions = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return sessions;
    }

    return sessions.filter((session) => {
      const haystack = [
        session.name,
        session.plan.brief.productName,
        session.plan.brief.platform,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [deferredQuery, sessions]);

  return (
    <section className="glass-panel rounded-[1.75rem] border border-white/10 bg-[rgba(11,22,16,0.74)] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.16em] text-[#d7f171]">
            Local History
          </div>
          <h3 className="font-display text-2xl font-semibold text-white">
            Saved sessions
          </h3>
        </div>
        <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-[#8ca296]">
          {sessions.length} total
        </div>
      </div>

      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="mb-4 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-[#6f8577] focus:border-[#d7f171]/40"
        placeholder="Search saved campaigns"
      />

      <div className="scroll-shadow max-h-[22rem] overflow-auto pr-1">
        {filteredSessions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 p-4 text-sm leading-6 text-[#8ca296]">
            No saved sessions yet. Once you generate a kit, HiveLaunch keeps it
            locally so you can reopen and export it later.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSessions.map((session) => (
              <div
                key={session.id}
                className={`rounded-2xl border p-4 ${
                  session.id === activeSessionId
                    ? 'border-[#d7f171]/30 bg-[#d7f171]/8'
                    : 'border-white/8 bg-black/10'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-semibold text-white">
                      {session.plan.brief.productName}
                    </div>
                    <div className="text-sm text-[#8ca296]">{session.name}</div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-[#718778]">
                      <Clock3 className="h-3.5 w-3.5" />
                      {formatTimestamp(session.plan.createdAt)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        startTransition(() => {
                          onOpen(session.id);
                        })
                      }
                      className="rounded-full border border-white/10 bg-white/6 p-2 text-[#d7f171] transition hover:border-[#d7f171]/40"
                      aria-label={`Open ${session.plan.brief.productName}`}
                    >
                      <FolderOpen className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(session.id)}
                      className="rounded-full border border-white/10 bg-white/6 p-2 text-[#ff9789] transition hover:border-[#ff9789]/40"
                      aria-label={`Delete ${session.plan.brief.productName}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
