import type { ReactNode } from 'react';
import { Download, FileJson, FileText, PackageOpen } from 'lucide-react';

import type { CampaignSession } from '@/types/campaign';

interface ExportPanelProps {
  session: CampaignSession | null;
  zipBusy: boolean;
  onExportMarkdown: () => void;
  onExportJson: () => void;
  onExportZip: () => Promise<void>;
}

function ExportButton(props: {
  icon: ReactNode;
  label: string;
  onClick: () => void | Promise<void>;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      disabled={props.disabled}
      onClick={() => {
        void props.onClick();
      }}
      className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-left text-sm text-white transition hover:border-[#d7f171]/30 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="flex items-center gap-3">
        {props.icon}
        {props.label}
      </span>
      <Download className="h-4 w-4 text-[#8ca296]" />
    </button>
  );
}

export function ExportPanel({
  session,
  zipBusy,
  onExportJson,
  onExportMarkdown,
  onExportZip,
}: ExportPanelProps) {
  return (
    <section className="glass-panel rounded-[1.75rem] border border-white/10 bg-[rgba(11,22,16,0.74)] p-5">
      <div className="mb-4">
        <div className="text-xs uppercase tracking-[0.16em] text-[#d7f171]">
          Export
        </div>
        <h3 className="font-display text-2xl font-semibold text-white">
          Share the campaign kit
        </h3>
      </div>

      {session ? (
        <div className="grid gap-3">
          <ExportButton
            icon={<FileText className="h-4 w-4 text-[#d7f171]" />}
            label="Export Markdown brief"
            onClick={onExportMarkdown}
            disabled={false}
          />
          <ExportButton
            icon={<FileJson className="h-4 w-4 text-[#8ff3c2]" />}
            label="Export JSON session"
            onClick={onExportJson}
            disabled={false}
          />
          <ExportButton
            icon={<PackageOpen className="h-4 w-4 text-[#f7cf79]" />}
            label={zipBusy ? 'Building ZIP bundle...' : 'Export ZIP bundle'}
            onClick={onExportZip}
            disabled={zipBusy}
          />
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 p-4 text-sm leading-6 text-[#8ca296]">
          Generate a campaign first to export the markdown brief, JSON payload,
          and a ZIP bundle with generated media.
        </div>
      )}
    </section>
  );
}
