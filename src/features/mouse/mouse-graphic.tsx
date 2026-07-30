type MouseGraphicProps = {
  className?: string;
};

/**
 * 经典 G102/G304 风格极简线框描边鼠标 SVG 组件
 * - 1:1 参考倒八字切割分缝、中轴滚轮舱与胶囊 DPI 键
 * - 纯 Line-art 描边风格，无颜色填充，无商标
 * - viewBox: 0 0 600 1000
 */
export function MouseGraphic({ className = '' }: MouseGraphicProps) {
  return (
    <svg
      viewBox="0 0 600 1000"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none ${className}`}
      role="img"
      aria-label="Minimalist Line Art Mouse Graphic"
    >
      {/* 柔和阴影轮廓层（极淡底层背景提升立体感） */}
      <path
        d="M 220 110 
           L 380 110 
           L 495 230 
           C 512 330, 495 470, 485 580 
           C 468 740, 415 930, 300 930 
           C 185 930, 132 740, 115 580 
           C 105 470, 88 330, 105 230 Z"
        fill="currentColor"
        className="text-driver-panel/30"
      />

      {/* 1. 顶部防折拉线护套 (Cord Relief / Tail Top) */}
      <path
        d="M 284 45 L 316 45 L 316 110 L 284 110 Z"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinejoin="round"
        className="text-driver-text/80"
      />
      <line x1="284" y1="65" x2="316" y2="65" stroke="currentColor" strokeWidth="2.5" className="text-driver-text/70" />
      <line x1="284" y1="85" x2="316" y2="85" stroke="currentColor" strokeWidth="2.5" className="text-driver-text/70" />

      {/* 2. 外机身主轮廓线 (如 G102/G304 的棱角头部与饱满椭圆尾部) */}
      <path
        d="M 220 110 
           L 380 110 
           L 495 230 
           C 512 330, 495 470, 485 580 
           C 468 740, 415 930, 300 930 
           C 185 930, 132 740, 115 580 
           C 105 470, 88 330, 105 230 Z"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-driver-text"
      />

      {/* 3. 经典倒八字按键切割缝 (V-Shape Key Seam) */}
      <path
        d="M 108 480 L 268 410 M 332 410 L 492 480"
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
        height="325"
        rx="32"
        stroke="currentColor"
        strokeWidth="3.5"
        className="text-driver-text"
      />

      {/* 5. 滚轮 (Scroll Wheel) */}
      <rect
        x="274"
        y="175"
        width="52"
        height="135"
        rx="16"
        stroke="currentColor"
        strokeWidth="3"
        className="text-driver-text"
      />
      {/* 滚轮平行防滑刻度描边 */}
      {[195, 210, 225, 240, 255, 270, 285, 295].map((y) => (
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
        y="350"
        width="40"
        height="65"
        rx="20"
        stroke="currentColor"
        strokeWidth="3"
        className="text-driver-text"
      />

      {/* 7. 左侧侧前键 (Forward Side Button) */}
      <path
        d="M 90 350 L 105 355 L 108 425 L 88 420 C 86 395, 87 370, 90 350 Z"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-driver-text"
      />

      {/* 8. 左侧侧后键 (Backward Side Button) */}
      <path
        d="M 88 435 L 108 440 L 110 515 L 84 505 C 83 480, 85 455, 88 435 Z"
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
