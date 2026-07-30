type MouseGraphicProps = {
  className?: string;
};

/**
 * 1:1 参考新质感电竞无线鼠标 SVG 矢量线框组件
 * - 顶部平滑大半圆拱形 (Rounded Top Arc)
 * - 标准平直横切键缝 (Horizontal Flat Seam) 与 垂直中缝 (Vertical Center Seam)
 * - 宽大圆润、饱满大臀围掌托底尾 (Full Rounded Bottom Palm Rest)
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
      aria-label="Flagship Wireless Esports Mouse Graphic"
    >
      {/* 柔和阴影/底衬轮廓 */}
      <path
        d="M 100 200 
           C 100 95, 200 45, 300 45 
           C 400 45, 500 95, 500 200 
           C 500 320, 484 440, 482 560 
           C 478 720, 420 940, 300 940 
           C 180 940, 122 720, 118 560 
           C 116 440, 100 320, 100 200 Z"
        fill="currentColor"
        className="text-driver-panel/30"
      />

      {/* 1. 外机身主轮廓线 (圆拱平滑头 + 人体工学侧腰 + 饱满半圆屁股) */}
      <path
        d="M 100 200 
           C 100 95, 200 45, 300 45 
           C 400 45, 500 95, 500 200 
           C 500 320, 484 440, 482 560 
           C 478 720, 420 940, 300 940 
           C 180 940, 122 720, 118 560 
           C 116 440, 100 320, 100 200 Z"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-driver-text"
      />

      {/* 2. 平直横向按键切缝 (Horizontal Seam Line) */}
      <line
        x1="106"
        y1="430"
        x2="494"
        y2="430"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        className="text-driver-text/85"
      />

      {/* 3. 垂直中央按键分缝线 (Vertical Center Seam Line) */}
      <line
        x1="300"
        y1="45"
        x2="300"
        y2="430"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        className="text-driver-text/85"
      />

      {/* 4. 跑道型滚轮 (Rounded Capsule Scroll Wheel) */}
      <rect
        x="266"
        y="90"
        width="68"
        height="150"
        rx="34"
        stroke="currentColor"
        strokeWidth="3.5"
        className="text-driver-text"
      />
      <rect
        x="272"
        y="96"
        width="56"
        height="138"
        rx="28"
        stroke="currentColor"
        strokeWidth="2"
        className="text-driver-text/40"
      />
      {/* 滚轮横向防滑刻度 */}
      {[115, 132, 149, 166, 183, 200, 215].map((y) => (
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

      {/* 5. 左侧侧前键 (Forward Side Button) */}
      <path
        d="M 94 290 C 104 292, 108 300, 108 322 C 108 345, 103 352, 92 355 C 90 332, 91 310, 94 290 Z"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-driver-text"
      />

      {/* 6. 左侧侧后键 (Backward Side Button) */}
      <path
        d="M 91 368 C 105 370, 108 378, 108 400 C 108 422, 102 430, 89 435 C 87 412, 88 390, 91 368 Z"
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
