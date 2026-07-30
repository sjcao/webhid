type MouseGraphicProps = {
  className?: string;
};

/**
 * 还原最开始的原生图片 MouseGraphic 组件 (引用 public/ic-moouse.png)
 */
export function MouseGraphic({ className = '' }: MouseGraphicProps) {
  return (
    <img
      src="./ic-moouse.png"
      alt="Mouse"
      className={`mx-auto block h-full w-full object-contain ${className}`}
    />
  );
}

export default MouseGraphic;
