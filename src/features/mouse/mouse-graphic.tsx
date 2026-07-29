import { useId } from 'react';

type MouseGraphicProps = {
  className?: string;
};

/**
 * 纯矢量的鼠标俯视图，替代此前较大的位图 (ic-moouse.png)。
 * 使用浅银灰机身 + 深色滚轮，在深色首页与浅色驱动界面上都清晰可读。
 * viewBox 采用 26:25 比例，与按键画布容器的 aspect-[26/25] 对齐，
 * 便于按百分比在其上叠加按键标签与高亮圆点。
 */
export function MouseGraphic({ className }: MouseGraphicProps) {
  const uid = useId();
  const bodyId = `mg-body-${uid}`;
  const wheelId = `mg-wheel-${uid}`;
  const glossId = `mg-gloss-${uid}`;

  return (
    <svg
      viewBox="0 0 260 250"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="mouse"
    >
      <defs>
        <linearGradient id={bodyId} x1="130" y1="12" x2="130" y2="240" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fbfcfd" />
          <stop offset="0.55" stopColor="#e4e7ec" />
          <stop offset="1" stopColor="#c7ccd4" />
        </linearGradient>
        <linearGradient id={wheelId} x1="130" y1="44" x2="130" y2="92" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3a3d44" />
          <stop offset="1" stopColor="#1d1f23" />
        </linearGradient>
        <radialGradient id={glossId} cx="0.5" cy="0.26" r="0.62">
          <stop stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* 机身轮廓 */}
      <path
        d="M130 14 C92 14 68 26 61 66 C55 104 42 118 42 152 C42 206 80 238 130 238 C180 238 218 206 218 152 C218 118 205 104 199 66 C192 26 168 14 130 14 Z"
        fill={`url(#${bodyId})`}
        stroke="#aeb4bd"
        strokeWidth="2"
      />

      {/* 顶部高光 */}
      <path
        d="M130 14 C92 14 68 26 61 66 C58 84 52 96 48 108 C70 92 100 84 130 84 C160 84 190 92 212 108 C208 96 202 84 199 66 C192 26 168 14 130 14 Z"
        fill={`url(#${glossId})`}
        opacity="0.7"
      />

      {/* 左右键分缝 */}
      <path d="M130 20 L130 96" stroke="#aeb4bd" strokeWidth="2" strokeLinecap="round" />

      {/* 滚轮 */}
      <rect x="122" y="44" width="16" height="48" rx="8" fill={`url(#${wheelId})`} />
      <line x1="130" y1="52" x2="130" y2="84" stroke="#ffffff" strokeOpacity="0.25" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default MouseGraphic;
