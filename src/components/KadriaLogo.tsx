const LOGO_URL = 'https://images.fillout.com/orgid-720841/flowpublicid-trw47nuavk/widgetid-default/cxpAn6JmA4xzmAAKQq1XmC/pasted-image-1780994263740-orawifks.png';

/**
 * Kadria logo component — maintains aspect ratio, never stretched or deformed.
 * Desktop: ~140px wide, Mobile: ~100px wide.
 * Optional "Pro" badge for the professional space.
 * Always links to homepage unless noLink is set.
 */
export function KadriaLogoImg({ className = '', pro, noLink }: { className?: string; pro?: boolean; noLink?: boolean }) {
  const content = (
    <div className={`flex items-center gap-2 shrink-0 ${className}`}>
      <img
        src={LOGO_URL}
        alt="Kadria"
        className="h-auto object-contain w-[72px] md:w-[110px]"
        draggable={false}
      />
      {pro && (
        <span className="text-[11px] font-medium text-muted-foreground/70 tracking-wide uppercase">Pro</span>
      )}
    </div>
  );

  if (noLink) return content;

  return (
    <a href="/" className="hover:opacity-80 transition-opacity">
      {content}
    </a>
  );
}

export default KadriaLogoImg;
