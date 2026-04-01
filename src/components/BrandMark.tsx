import { cn } from '@/lib/utils';

export function BrandMark({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <svg
        viewBox="0 0 64 64"
        aria-hidden="true"
        className="h-11 w-11 rounded-2xl border border-white/10 bg-black/20 p-2"
      >
        <defs>
          <linearGradient id="hiveGradient" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#d7f171" />
            <stop offset="55%" stopColor="#7fe39f" />
            <stop offset="100%" stopColor="#3b6f4f" />
          </linearGradient>
        </defs>
        <path
          fill="url(#hiveGradient)"
          d="M31.5 6 49 16v20L31.5 46 14 36V16L31.5 6Zm0 9.6-8.7 5v10l8.7 5.1 8.7-5.1v-10l-8.7-5Z"
        />
        <path
          fill="#08110d"
          d="M31.5 20.8 25.3 24v7.1l6.2 3.7 6.3-3.7V24l-6.3-3.2Z"
        />
        <path
          fill="#e7f4eb"
          d="M42.4 9.8c5.2 1.4 10 5.6 12.3 11.4-5 .2-9.5-2.4-12.3-6.4V9.8Zm-20.8 0c-5.2 1.4-10 5.6-12.3 11.4 5 .2 9.5-2.4 12.3-6.4V9.8Z"
          opacity=".68"
        />
      </svg>
      <div>
        <div className="font-display text-lg font-bold tracking-[0.16em] text-[#d7f171]">
          HIVELAUNCH
        </div>
        <div className="text-sm text-[#9bb5a4]">AI Campaign Studio</div>
      </div>
    </div>
  );
}
