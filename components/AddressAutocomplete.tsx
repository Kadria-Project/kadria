'use client';

import { useEffect, useRef, useState } from 'react';
import type { AddressSuggestion } from '@/src/lib/address/types';

export interface AddressSelection {
  address: string;
  city: string;
  postalCode: string;
  latitude: number | null;
  longitude: number | null;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (selection: AddressSelection) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  inputId?: string;
  inputClassName?: string;
}

async function fetchAddressSuggestions(query: string): Promise<AddressSuggestion[]> {
  const res = await fetch(`/api/address/search?q=${encodeURIComponent(query)}`, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) {
    throw new Error('Recherche d’adresse indisponible');
  }
  const data = await res.json();
  return data?.success && Array.isArray(data.suggestions) ? data.suggestions : [];
}

const defaultInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid #27272a',
  background: '#18181b',
  color: '#fff',
  fontSize: '14px',
  outline: 'none',
};

export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  style,
  inputId,
  inputClassName,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errored, setErrored] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (value.trim().length < 3) {
      return;
    }

    timerRef.current = setTimeout(async () => {
      setLoading(true);
      setErrored(false);
      try {
        const results = await fetchAddressSuggestions(value.trim());
        setSuggestions(results);
      } catch {
        setErrored(true);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value]);

  function handleSelect(s: AddressSuggestion) {
    onChange(s.label);
    setOpen(false);
    setSuggestions([]);
    onSelect?.({
      address: s.label,
      city: s.city || '',
      postalCode: s.postcode || '',
      latitude: s.latitude ?? null,
      longitude: s.longitude ?? null,
    });
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <input
        id={inputId}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        autoComplete="off"
        className={inputClassName}
        style={{ ...defaultInputStyle, ...style }}
      />

      {open && value.trim().length >= 3 && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 50,
            background: '#18181b',
            border: '1px solid #27272a',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            overflow: 'hidden',
            maxHeight: '240px',
            overflowY: 'auto',
          }}
        >
          {loading && (
            <div style={{ padding: '10px 12px', fontSize: '13px', color: '#a1a1aa' }}>
              Recherche en cours...
            </div>
          )}

          {!loading && errored && (
            <div style={{ padding: '10px 12px', fontSize: '13px', color: '#f59e0b' }}>
              Adresse indisponible, saisie manuelle possible.
            </div>
          )}

          {!loading && !errored && suggestions.length === 0 && (
            <div style={{ padding: '10px 12px', fontSize: '13px', color: '#71717a' }}>
              Aucun résultat
            </div>
          )}

          {!loading &&
            !errored &&
            suggestions.map((s, i) => (
              <button
                key={`${s.label}-${i}`}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(s)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 12px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: i < suggestions.length - 1 ? '1px solid #27272a' : 'none',
                  color: '#fff',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#27272a')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ fontWeight: 600 }}>{s.label}</div>
                <div style={{ color: '#a1a1aa', fontSize: '12px', marginTop: '2px' }}>
                  {s.postcode || ''} {s.city || ''}
                </div>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
