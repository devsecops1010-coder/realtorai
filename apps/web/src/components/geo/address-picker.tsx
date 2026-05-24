'use client';

/**
 * Composite address picker: city + street + house number, hooked up to
 * the IL geo dataset (1,306 cities · 63,563 streets).
 *
 * State model:
 *   - The parent owns the `value` (a structured address object). The
 *     picker is fully controlled so it can be used in any form library
 *     (react-hook-form, plain useState, etc.) without integration code.
 *   - Hebrew text fields (`city`, `street`) are kept in sync with the
 *     picks so a property saved through this control gets both
 *     human-readable + structured data.
 *
 * Picking a new city clears the street selection — the previous
 * streetId is meaningless in a different city.
 */

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CityAutocomplete } from './city-autocomplete';
import { StreetAutocomplete } from './street-autocomplete';

export interface AddressValue {
  /** Free-text city — always kept in sync with the picked settlement. */
  city: string;
  /** UUID of `IlSettlement` if picked from the autocomplete; null for free-text. */
  settlementId: string | null;
  /** Free-text street — synced with the picked street + house number. */
  street: string;
  /** UUID of `IlStreet` if picked from the autocomplete; null otherwise. */
  streetId: string | null;
  /** House number — free integer (no comprehensive open IL dataset). */
  houseNumber: number | null;
  /** Auto-derived from the picked settlement centroid; null if no pick. */
  latitude: number | null;
  longitude: number | null;
}

export const EMPTY_ADDRESS: AddressValue = {
  city: '',
  settlementId: null,
  street: '',
  streetId: null,
  houseNumber: null,
  latitude: null,
  longitude: null,
};

export function AddressPicker({
  value,
  onChange,
  cityLabel = 'עיר',
  streetLabel = 'רחוב',
  numberLabel = 'מס׳ בית',
  className,
}: {
  value: AddressValue;
  onChange: (next: AddressValue) => void;
  cityLabel?: string;
  streetLabel?: string;
  numberLabel?: string;
  className?: string;
}) {
  return (
    <div className={`grid gap-3 ${className ?? ''}`}>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>{cityLabel}</Label>
          <CityAutocomplete
            value={value.city}
            onChange={(v) =>
              onChange({
                ...value,
                city: v,
                // Free-typing breaks the structured link — drop the
                // settlementId + coords so we don't keep a stale ref to
                // a different city. Re-picking from the dropdown puts
                // them back.
                ...(v !== value.city
                  ? { settlementId: null, latitude: null, longitude: null }
                  : {}),
              })
            }
            onSelectCity={(s) =>
              onChange({
                ...value,
                city: s.nameHe,
                settlementId: s.id,
                latitude: s.latitude,
                longitude: s.longitude,
                // City change → blow away street selection. The street
                // text stays so the user sees what they had typed.
                streetId: null,
              })
            }
          />
        </div>

        <div className="space-y-1.5">
          <Label>{streetLabel}</Label>
          <StreetAutocomplete
            settlementId={value.settlementId}
            value={value.street}
            onChange={(v) =>
              onChange({
                ...value,
                street: v,
                ...(v !== value.street ? { streetId: null } : {}),
              })
            }
            onSelectStreet={(st) =>
              onChange({ ...value, street: st.nameHe, streetId: st.id })
            }
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_180px]">
        <div className="space-y-1.5">
          <Label>כתובת מלאה (תצוגה)</Label>
          {/* Read-only preview so the operator sees exactly what gets
              saved. Mirrors how IL listing sites display addresses. */}
          <Input
            value={
              [value.street, value.houseNumber, value.city]
                .filter(Boolean)
                .join(' · ') || '—'
            }
            readOnly
            tabIndex={-1}
            className="bg-muted/30"
          />
        </div>
        <div className="space-y-1.5">
          <Label>{numberLabel}</Label>
          <Input
            type="number"
            min={0}
            max={9999}
            value={value.houseNumber ?? ''}
            onChange={(e) => {
              const n = e.target.value === '' ? null : Number(e.target.value);
              onChange({ ...value, houseNumber: Number.isFinite(n as number) ? (n as number) : null });
            }}
            placeholder="לדוגמה 42"
          />
        </div>
      </div>
    </div>
  );
}
