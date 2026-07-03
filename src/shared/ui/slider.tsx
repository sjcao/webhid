import * as SliderPrimitive from '@radix-ui/react-slider';

type SliderProps = {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
};

export function Slider({ value, min, max, step = 1, onChange }: SliderProps) {
  return (
    <SliderPrimitive.Root
      className="relative flex h-8 w-full touch-none select-none items-center"
      min={min}
      max={max}
      step={step}
      value={[value]}
      onValueChange={([next]) => onChange(next)}
    >
      <SliderPrimitive.Track className="relative h-2 grow overflow-hidden rounded-full bg-surface-4">
        <SliderPrimitive.Range className="absolute h-full bg-brand" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-bg bg-brand shadow-soft focus:outline-none focus:ring-2 focus:ring-brand" />
    </SliderPrimitive.Root>
  );
}
