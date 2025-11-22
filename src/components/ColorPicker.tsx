import { PROJECT_COLORS } from '../lib/colors';

interface ColorPickerProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
}

export function ColorPicker({ selectedColor, onColorSelect }: ColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-2 p-2">
      {PROJECT_COLORS.map((color) => (
        <button
          key={color.value}
          onClick={() => onColorSelect(color.value)}
          className={`w-8 h-8 rounded-full transition-all duration-200 hover:scale-110 ${
            selectedColor === color.value
              ? 'ring-4 ring-offset-2 ring-slate-400 scale-110'
              : 'hover:ring-2 hover:ring-offset-1 hover:ring-slate-300'
          }`}
          style={{ backgroundColor: color.value }}
          title={color.name}
        />
      ))}
    </div>
  );
}
