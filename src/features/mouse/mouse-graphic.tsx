import { useId } from 'react';

type MouseGraphicProps = {
  className?: string;
};

/**
 * 顶级电竞无线鼠标高保真 SVG 矢量组件 (GPW 风格)
 * viewBox: 0 0 600 1000
 * 饱满圆润的尾部、优雅人体工学腰线、精致按键指槽与滚轮侧键全细节
 */
export function MouseGraphic({ className = '' }: MouseGraphicProps) {
  const uid = useId();
  const bodyGradId = `mg-body-${uid}`;
  const glossId = `mg-gloss-${uid}`;
  const rimGradId = `mg-rim-${uid}`;
  const wheelGradId = `mg-wheel-${uid}`;
  const sideGradId = `mg-side-${uid}`;
  const shadowFilterId = `mg-shadow-${uid}`;
  const fingerLeftId = `mg-finger-l-${uid}`;
  const fingerRightId = `mg-finger-r-${uid}`;

  return (
    <svg
      viewBox="0 0 600 1000"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none ${className}`}
      role="img"
      aria-label="High End Esports Mouse Graphic"
    >
      <defs>
        {/* 立体三层立体柔柔滤镜 */}
        <filter id={shadowFilterId} x="-25%" y="-15%" width="150%" height="140%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="32" stdDeviation="28" floodColor="#000000" floodOpacity="0.22" />
          <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#090d16" floodOpacity="0.12" />
        </filter>

        {/* 鼠标机身核心金属质感渐变 */}
        <linearGradient id={bodyGradId} x1="300" y1="70" x2="300" y2="940" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="25%" stopColor="#f8fafc" />
          <stop offset="60%" stopColor="#f1f5f9" />
          <stop offset="88%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>

        {/* 边缘倒角精致高光 */}
        <linearGradient id={rimGradId} x1="100" y1="70" x2="500" y2="930" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="30%" stopColor="#e2e8f0" stopOpacity="0.7" />
          <stop offset="70%" stopColor="#cbd5e1" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.8" />
        </linearGradient>

        {/* 鼠标背部弧形立体高光 */}
        <radialGradient id={glossId} cx="0.5" cy="0.32" r="0.55">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>

        {/* 左主按键指槽暗影 */}
        <radialGradient id={fingerLeftId} cx="0.35" cy="0.22" r="0.25">
          <stop offset="0%" stopColor="#000000" stopOpacity="0.03" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
        {/* 右主按键指槽暗影 */}
          <radialGradient id={fingerRightId} cx="0.65" cy="0.22" r="0.25">
          <stop offset="0%" stopColor="#000000" stopOpacity="0.03" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>

        {/* 金属/防滑橡胶滚轮 */}
        <linearGradient id={wheelGradId} x1="268" y1="150" x2="332" y2="270" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="35%" stopColor="#0f172a" />
          <stop offset="70%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>

        {/* 侧键黑锆材质 */}
        <linearGradient id={sideGradId} x1="90" y1="360" x2="135" y2="540" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="50%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>
      </defs>

      {/* 1. 主机身与阴影层 */}
      <g filter={`url(#${shadowFilterId})`}>
        {/* 底盘黑色防滑圈隐约底边 */}
        <path
          d="M 210 72
             C 270 68, 330 68, 390 72
             C 475 78, 515 170, 522 320
             C 528 440, 502 560, 485 680
             C 468 800, 415 934, 300 934
             C 185 934, 132 800, 115 680
             C 98 560, 72 440, 78 320
             C 85 170, 125 78, 210 72 Z"
          fill="#0f172a"
          opacity="0.25"
        />

        {/* 经典电竞机身整体造型：圆润饱满的尾部、顺滑的人体工学曲率 */}
        <path
          d="M 210 75
             C 270 70, 330 70, 390 75
             C 470 82, 510 170, 516 320
             C 522 435, 498 550, 480 675
             C 462 795, 410 925, 300 925
             C 190 925, 138 795, 120 675
             C 102 550, 78 435, 84 320
             C 90 170, 130 82, 210 75 Z"
          fill={`url(#${bodyGradId})`}
          stroke={`url(#${rimGradId})`}
          strokeWidth="3.5"
        />
      </g>

      {/* 2. 人体工学微下凹指槽面板暗纹 */}
      <rect x="95" y="85" width="195" height="260" fill={`url(#${fingerLeftId})`} />
      <rect x="310" y="85" width="195" height="260" fill={`url(#${fingerRightId})`} />

      {/* 3. 背部立体弧形高光反射 */}
      <path
        d="M 210 75
           C 270 70, 330 70, 390 75
           C 470 82, 510 170, 516 320
           C 420 280, 180 280, 84 320
           C 90 170, 130 82, 210 75 Z"
        fill={`url(#${glossId})`}
      />

      {/* 4. 左右按键中缝缝隙 */}
      <path d="M 300 75 L 300 355" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
      <path d="M 300 77 L 300 350" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.95" />

      {/* 5. 左右主按键横向人体工学分缝弧线 */}
      <path d="M 85 325 C 160 365, 440 365, 515 325" stroke="#cbd5e1" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M 86 327 C 160 366, 440 366, 514 327" stroke="#ffffff" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.9" />

      {/* 6. 中间滚轮舱槽与发光线 */}
      <rect x="264" y="152" width="72" height="126" rx="22" fill="#090d16" />
      <rect x="268" y="156" width="64" height="118" rx="18" fill="#1e293b" stroke="#334155" strokeWidth="2" />

      {/* 滚轮主体 */}
      <rect x="276" y="162" width="48" height="106" rx="14" fill={`url(#${wheelGradId})`} />
      {/* 滚轮中央亮色防滑中轴环 */}
      <rect x="297" y="165" width="6" height="100" rx="3" fill="#f97316" opacity="0.9" />
      {/* 滚轮防滑横条刻度 */}
      {[178, 192, 206, 220, 234, 248, 260].map((y) => (
        <line key={y} x1="280" y1={y} x2="320" y2={y} stroke="#64748b" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      ))}

      {/* 7. DPI 切换按键及精致高光 (位于滚轮正下方 300, 305 处) */}
      <g>
        <rect x="278" y="292" width="44" height="24" rx="10" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
        <rect x="282" y="296" width="36" height="16" rx="7" fill="#1e293b" />
        <circle cx="300" cy="304" r="3.5" fill="#f97316" />
      </g>

      {/* 8. 左侧 Forward 按键 (自然贴合在左侧腰线内) */}
      <g>
        <path
          d="M 85 380 
             C 105 383, 118 390, 118 412 
             C 118 434, 105 442, 89 445 
             C 86 422, 85 400, 85 380 Z"
          fill={`url(#${sideGradId})`}
          stroke="#475569"
          strokeWidth="1.5"
        />
        {/* 前进按键细节边框 */}
        <path
          d="M 87 385 C 103 388, 113 394, 113 412 C 113 430, 103 437, 90 440"
          fill="none"
          stroke="#f97316"
          strokeWidth="1.5"
          opacity="0.8"
        />
      </g>

      {/* 9. 左侧 Backward 按键 (自然贴合在左侧腰线内) */}
      <g>
        <path
          d="M 90 455 
             C 107 458, 118 466, 118 488 
             C 118 510, 107 518, 97 525 
             C 93 502, 91 478, 90 455 Z"
          fill={`url(#${sideGradId})`}
          stroke="#475569"
          strokeWidth="1.5"
        />
        {/* 后退按键细节边框 */}
        <path
          d="M 92 460 C 103 463, 113 470, 113 488 C 113 506, 103 513, 98 518"
          fill="none"
          stroke="#f97316"
          strokeWidth="1.5"
          opacity="0.8"
        />
      </g>

      {/* 10. 掌心处的现代极简 G 品牌/电竞 RGB 哑光标识 */}
      <g opacity="0.35">
        <circle cx="300" cy="710" r="28" stroke="#94a3b8" strokeWidth="2" fill="none" />
        <path d="M 314 710 A 14 14 0 1 0 300 724 L 300 710 Z" fill="#64748b" />
      </g>
    </svg>
  );
}

export default MouseGraphic;
