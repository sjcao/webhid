type MouseGraphicProps = {
  className?: string;
};

/**
 * 引用 WebP 格式的 MouseGraphic 组件 (public/ic-moouse.webp)
 * 自适应容器高度与宽度，保持原始精致宽高比例
 */
export function MouseGraphic({ className = '' }: MouseGraphicProps) {
  return (
    <img
      src="./ic-moouse.webp"
      alt="Mouse"
      className={`mx-auto block max-h-full max-w-full object-contain ${className}`}
    />
  );
}

export default MouseGraphic;
