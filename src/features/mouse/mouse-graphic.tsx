type MouseGraphicProps = {
  className?: string;
};

/**
 * 经典 G102/G304 风格极简线框描边鼠标 SVG 组件 (圆润饱满尾部)
 * - viewBox: 0 0 600 900
 * - 宽阔圆润、饱满敦实的尾部线条
 * - 纯 Line-art 描边风格，无颜色填充，无商标
 */
export function MouseGraphic({ className = '' }: MouseGraphicProps) {
  return (
    <svg
      viewBox="0 0 600 900"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none ${className}`}
      role="img"
      aria-label="Minimalist Line Art Mouse Graphic with Rounded Tail"
    >
      {/* 柔和阴影轮廓层 */}
      <path
        d="M 220 110 
           L 380 110 
           L 495 230 
           C 515 330, 502 460, 492 570 
           C 480 700, 430 840, 300 840 
           C 170 840, 120 700, 108 570 
           C 98 460, 85 330, 105 230 Z"
        fill="currentColor"
        className="text-driver-panel/30"
      />

      {/* 1. 顶部防折拉线护套 (Cord Relief) */}
      <path
        d="M 284 45 L 316 45 L 316 110 L 284 110 Z"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinejoin="round"
        className="text-driver-text/80"
      />
      <line x1="284" y1="65" x2="316" y2="65" stroke="currentColor" strokeWidth="2.5" className="text-driver-text/70" />
      <line x1="284" y1="85" x2="316" y2="85" stroke="currentColor" strokeWidth="2.5" className="text-driver-text/70" />

      {/* 2. 外机身主轮廓线 (宽阔饱满圆润的下屁股/尾部) */}
      <path
        d="M 220 110 
           L 380 110 
           L 495 230 
           C 515 330, 502 460, 492 570 
           C 480 700, 430 840, 300 840 
           C 170 840, 120 700, 108 570 
           C 98 460, 85 330, 105 230 Z"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-driver-text"
      />

      {/* 3. 经典倒八字按键切割缝 (V-Shape Key Seam) */}
      <path
        d="M 108 470 L 268 400 M 332 400 L 492 470"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        className="text-driver-text/85"
      />

      {/* 4. 中轴黑色长条框架 (Center Island) */}
      <rect
        x="268"
        y="110"
        width="64"
        height="315"
        rx="32"
        stroke="currentColor"
        strokeWidth="3.5"
        className="text-driver-text"
      />

      {/* 5. 滚轮 (Scroll Wheel) */}
      <rect
        x="274"
        y="170"
        width="52"
        height="130"
        rx="16"
        stroke="currentColor"
        strokeWidth="3"
        className="text-driver-text"
      />
      {/* 滚轮平行防滑刻度描边 */}
      {[190, 205, 220, 235, 250, 265, 280].map((y) => (
        <line
          key={y}
          x1="278"
          y1={y}
          x2="322"
          y2={y}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="text-driver-text/60"
        />
      ))}

      {/* 6. DPI 胶囊按键 (DPI Capsule Button) */}
      <rect
        x="280"
        y="340"
        width="40"
        height="60"
        rx="20"
        stroke="currentColor"
        strokeWidth="3"
        className="text-driver-text"
      />

      {/* 7. 左侧侧前键 (Forward Side Button) */}
      <path
        d="M 90 340 L 105 345 L 108 415 L 88 410 C 86 385, 87 360, 90 340 Z"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-driver-text"
      />

      {/* 8. 左侧侧后键 (Backward Side Button) */}
      <path
        d="M 88 425 L 108 430 L 110 505 L 84 495 C 83 470, 85 445, 88 425 Z"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-driver-text"
      />
    </svg>
  );
}

export default MouseGraphic;
