import React, { useState, useEffect } from 'react';

/**
 * Numeric input that starts EMPTY and can be fully cleared — it never forces a
 * `0` back into the field. The parent still receives a numeric value (0 when
 * empty) for calculations, but the visible field stays exactly what the user
 * typed. Physical keyboard only; on mobile the OS numeric keypad opens via
 * inputmode="decimal".
 */
export const EditableNumber: React.FC<{
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
  className?: string;
  title?: string;
  required?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}> = ({ value, onChange, placeholder, className, title, required, onClick }) => {
  const [str, setStr] = useState<string>(value ? String(value) : '');

  useEffect(() => {
    const cur = str === '' ? NaN : parseFloat(str);
    if (cur !== value) setStr(value ? String(value) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <input
      type="text"
      inputMode="decimal"
      value={str}
      title={title}
      required={required}
      placeholder={placeholder}
      onClick={onClick}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^0-9.]/g, '');
        setStr(raw);
        const n = raw === '' ? 0 : parseFloat(raw);
        onChange(isNaN(n) ? 0 : n);
      }}
      className={className}
    />
  );
};
