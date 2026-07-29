import { useId } from 'react';

type MouseGraphicProps = {
  className?: string;
};

/**
 * 纯矢量的白色鼠标俯视图，参照原位图 (ic-moouse.png) 重绘：
 * 竖向卵石机身、左右键分缝、顶部黑色滚轮与传感器标记、左侧两个侧键。
 * viewBox 保持与原图一致的 627×1102 比例，默认 preserveAspectRatio (meet)
 * 使其在容器内居中展示，行为等同于旧图的 object-contain，
 * 所以叠加在上面的按键标签与高亮圆点百分比定位仍然对齐。
 */
export function MouseGraphic({ className }: MouseGraphicProps) {
  const uid = useId();
  const bodyId = `mg-body-${uid}`;
  const glossId = `mg-gloss-${uid}`;
  const wheelId = `mg-wheel-${uid}`;

  return (
    <svg
      viewBox="0 0 627 1102"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="mouse"
    >
      <defs>
        <linearGradient id={bodyId} x1="313" y1="10" x2="313" y2="1090" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" />
          <stop offset="0.5" stopColor="#f3f4f6" />
          <stop offset="1" stopColor="#e2e5e9" />
        </linearGradient>
        <radialGradient id={glossId} cx="0.5" cy="0.2" r="0.7">
          <stop stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={wheelId} x1="313" y1="92" x2="313" y2="216" gradientUnits="userSpaceOnUse">
          <stop stopColor="#43464d" />
          <stop offset="1" stopColor="#161719" />
        </linearGradient>
      </defs>

      {/* 机身轮廓 */}
      <path
        d="M313 14 C220 14 150 22 128 40 C70 86 40 180 33 320 C26 470 30 640 70 800 C110 960 200 1088 313 1088 C426 1088 516 960 556 800 C596 640 600 470 593 320 C586 180 556 86 498 40 C476 22 406 14 313 14 Z"
        fill={`url(#${bodyId})`}
        stroke="#d3d6db"
        strokeWidth="3"
      />

      {/* 顶部高光 */}
      <path
        d="M313 14 C220 14 150 22 128 40 C90 74 62 130 48 220 C150 150 220 128 313 128 C406 128 476 150 578 220 C564 130 536 74 498 40 C476 22 406 14 313 14 Z"
        fill={`url(#${glossId})`}
        opacity="0.85"
      />

      {/* 左右键分缝 */}
      <path d="M313 20 L313 388" stroke="#cfd3d9" strokeWidth="3" strokeLinecap="round" />
      {/* 前部按键与机身的横向分缝 */}
      <path d="M92 300 C 160 405 466 405 535 300" stroke="#cfd3d9" strokeWidth="3" fill="none" strokeLinecap="round" />

      {/* 顶部传感器标记 */}
      <ellipse cx="313" cy="66" rx="15" ry="7" fill="#e6e8ec" stroke="#c7cad0" strokeWidth="2" />

      {/* 滚轮外壳 */}
      <rect x="274" y="84" width="78" height="160" rx="30" fill="#111214" />
      {/* 滚轮 */}
      <rect x="288" y="94" width="50" height="120" rx="24" fill={`url(#${wheelId})`} />
      <line x1="313" y1="110" x2="313" y2="198" stroke="#ffffff" strokeOpacity="0.22" strokeWidth="3" strokeLinecap="round" />

      {/* 左侧两个侧键 */}
      <rect x="26" y="286" width="36" height="78" rx="17" fill="#141518" transform="rotate(-8 44 325)" />
      <rect x="22" y="384" width="38" height="120" rx="18" fill="#141518" transform="rotate(-4 41 444)" />

      {/* 底部传感器凹陷 */}
      <ellipse cx="313" cy="640" rx="30" ry="20" fill="#000000" opacity="0.05" />
    </svg>
  );
}

export default MouseGraphic;
