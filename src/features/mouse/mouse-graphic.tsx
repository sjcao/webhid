import { useId } from 'react';

type MouseGraphicProps = {
  className?: string;
};

/**
 * 高清矢量鼠标俯视图组件
 * 采用 627×1102 比例 viewBox，完美对齐按键定位与视觉呈现
 */
export function MouseGraphic({ className = '' }: MouseGraphicProps) {
  const uid = useId();
  const bodyGradId = `mg-body-${uid}`;
  const glossId = `mg-gloss-${uid}`;
  const wheelGradId = `mg-wheel-${uid}`;
  const sideGradId = `mg-side-${uid}`;
  const shadowId = `mg-shadow-${uid}`;
  const rimId = `mg-rim-${uid}`;

  return (
    <svg
      viewBox="0 0 627 1102"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none ${className}`}
      role="img"
      aria-label="High Definition Vector Mouse Graphic"
    >
      <defs>
        {/* 鼠标外阴影与投影 filter */}
        <filter id={shadowId} x="-20%" y="-10%" width="140%" height="130%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="28" stdDeviation="32" floodColor="#000000" floodOpacity="0.25" />
          <feDropShadow dx="0" dy="6" stdDeviation="12" floodColor="#000000" floodOpacity="0.12" />
        </filter>

        {/* 鼠标机身渐变 (白灰细腻漆质感) */}
        <linearGradient id={bodyGradId} x1="313" y1="14" x2="313" y2="1088" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="35%" stopColor="#f8f9fa" />
          <stop offset="70%" stopColor="#e9ecef" />
          <stop offset="100%" stopColor="#dbe0e6" />
        </linearGradient>

        {/* 边缘高光反射 */}
        <linearGradient id={rimId} x1="50" y1="50" x2="577" y2="1050" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#e2e8f0" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.8" />
        </linearGradient>

        {/* 弧度高光 */}
        <radialGradient id={glossId} cx="0.5" cy="0.18" r="0.65">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#ffffff" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>

        {/* 滚轮金属铝/橡胶材质 */}
        <linearGradient id={wheelGradId} x1="274" y1="84" x2="352" y2="244" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#374151" />
          <stop offset="30%" stopColor="#111827" />
          <stop offset="70%" stopColor="#1f2937" />
          <stop offset="100%" stopColor="#030712" />
        </linearGradient>

        {/* 侧键质感 */}
        <linearGradient id={sideGradId} x1="20" y1="280" x2="60" y2="500" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1f2937" />
          <stop offset="100%" stopColor="#111827" />
        </linearGradient>
      </defs>

      {/* 机身底盘及主阴影层 */}
      <g filter={`url(#${shadowId})`}>
        {/* 侧面黑护翼底垫 */}
        <path
          d="M313 14 C218 14 148 22 126 40 C68 86 38 180 31 320 C24 470 28 640 68 800 C108 960 198 1088 313 1088 C428 1088 518 960 558 800 C598 640 602 470 595 320 C588 180 558 86 500 40 C478 22 408 14 313 14 Z"
          fill="#1e293b"
          opacity="0.15"
        />

        {/* 主机身面板 */}
        <path
          d="M313 14 C220 14 150 22 128 40 C70 86 40 180 33 320 C26 470 30 640 70 800 C110 960 200 1088 313 1088 C426 1088 516 960 556 800 C596 640 600 470 593 320 C586 180 556 86 498 40 C476 22 406 14 313 14 Z"
          fill={`url(#${bodyGradId})`}
          stroke={`url(#${rimId})`}
          strokeWidth="4"
        />
      </g>

      {/* 顶部抛光/光线反射 */}
      <path
        d="M313 14 C220 14 150 22 128 40 C90 74 62 130 48 220 C150 150 220 128 313 128 C406 128 476 150 578 220 C564 130 536 74 498 40 C476 22 406 14 313 14 Z"
        fill={`url(#${glossId})`}
      />

      {/* 左右按键中缝缝隙 */}
      <path d="M313 18 L313 388" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" opacity="0.75" />
      <path d="M313 20 L313 380" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />

      {/* 主按键弧形分割线 */}
      <path d="M92 300 C 160 405 466 405 535 300" stroke="#cbd5e1" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M94 302 C 160 406 466 406 533 302" stroke="#ffffff" strokeWidth="1.5" fill="none" strokeLinecap="round" />

      {/* DPI 切换键指示圈及凹槽 */}
      <rect x="291" y="56" width="44" height="20" rx="10" fill="#0f172a" opacity="0.85" />
      <rect x="293" y="58" width="40" height="16" rx="8" fill="#334155" />
      <circle cx="313" cy="66" r="4" fill="#f97316" />

      {/* 滚轮开槽与外框 */}
      <rect x="270" y="82" width="86" height="164" rx="32" fill="#090d16" />
      <rect x="274" y="86" width="78" height="156" rx="28" fill="#1e293b" stroke="#334155" strokeWidth="2" />

      {/* 滚轮主体 */}
      <rect x="286" y="94" width="54" height="140" rx="26" fill={`url(#${wheelGradId})`} />
      {/* 滚轮中央防滑金属环 */}
      <rect x="309" y="98" width="8" height="132" rx="4" fill="#f97316" opacity="0.9" />
      {/* 滚轮横向防滑刻度 */}
      {[110, 126, 142, 158, 174, 190, 206, 222].map((y) => (
        <line key={y} x1="290" y1={y} x2="336" y2={y} stroke="#475569" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      ))}

      {/* 左侧侧键 1 (Forward 侧前键) */}
      <g>
        <path
          d="M26 286 L60 292 C56 325 50 350 42 366 L20 360 C21 330 23 305 26 286 Z"
          fill={`url(#${sideGradId})`}
          stroke="#475569"
          strokeWidth="1.5"
        />
        <rect x="24" y="286" width="36" height="78" rx="17" fill="#1e293b" transform="rotate(-8 44 325)" opacity="0.95" />
        <rect x="26" y="288" width="32" height="74" rx="15" fill="none" stroke="#f97316" strokeWidth="1.5" opacity="0.6" transform="rotate(-8 44 325)" />
      </g>

      {/* 左侧侧键 2 (Backward 侧后键) */}
      <g>
        <path
          d="M22 384 L58 390 C50 430 42 470 32 504 L12 498 C18 460 20 420 22 384 Z"
          fill={`url(#${sideGradId})`}
          stroke="#475569"
          strokeWidth="1.5"
        />
        <rect x="20" y="384" width="38" height="120" rx="18" fill="#1e293b" transform="rotate(-4 41 444)" opacity="0.95" />
        <rect x="22" y="386" width="34" height="116" rx="16" fill="none" stroke="#f97316" strokeWidth="1.5" opacity="0.6" transform="rotate(-4 41 444)" />
      </g>

      {/* 掌心品牌 logo 凹印指示线 */}
      <path
        d="M293 720 L313 740 L333 720 L313 700 Z"
        fill="none"
        stroke="#94a3b8"
        strokeWidth="3"
        strokeLinejoin="round"
        opacity="0.35"
      />
      <circle cx="313" cy="720" r="2.5" fill="#f97316" opacity="0.8" />
    </svg>
  );
}

export default MouseGraphic;
