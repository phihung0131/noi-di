export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" aria-hidden="true">
      <rect width="128" height="128" rx="30" fill="#0E3F3C" />
      <path d="M30 30h68a14 14 0 0 1 14 14v34a14 14 0 0 1-14 14H64L42 112V92h-12a14 14 0 0 1-14-14V44a14 14 0 0 1 14-14z" fill="#F4FAF8" />
      <g fill="#0E3F3C">
        <rect x="35" y="53" width="7" height="16" rx="3.5" /><rect x="47" y="44" width="7" height="34" rx="3.5" />
        <rect x="59" y="36" width="7" height="50" rx="3.5" /><rect x="71" y="46" width="7" height="30" rx="3.5" />
        <rect x="83" y="54" width="7" height="14" rx="3.5" />
      </g>
      <circle cx="104" cy="24" r="13" fill="#F59E0B" stroke="#0E3F3C" strokeWidth="5" />
    </svg>
  );
}
