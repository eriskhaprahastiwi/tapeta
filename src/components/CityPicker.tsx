import { useEffect, useRef, useState } from "react";
import type { CityMeta, CitySearchResult } from "../types";
import { searchCities } from "../lib/api";
import { CloseIcon, LocateIcon, PinIcon, SearchIcon } from "./Icons";

const TYPE_LABELS: Record<string, string> = {
  city: "Kota",
  town: "Kota",
  municipality: "Kota",
  county: "Kabupaten",
  city_district: "Kota administratif",
};

interface SearchState {
  query: string;
  status: "idle" | "loading" | "done" | "error";
  results: CitySearchResult[];
  error: string | null;
}

const EMPTY_SEARCH: SearchState = {
  query: "",
  status: "idle",
  results: [],
  error: null,
};

interface CityPickerProps {
  open: boolean;
  currentCity: CityMeta | null;
  locating: boolean;
  onClose: () => void;
  onSelect: (city: CityMeta) => void;
  onUseLocation: () => void;
}

export function CityPicker({
  open,
  currentCity,
  locating,
  onClose,
  onSelect,
  onUseLocation,
}: CityPickerProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [wasOpen, setWasOpen] = useState(open);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<SearchState>(EMPTY_SEARCH);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setQuery("");
      setSearch(EMPTY_SEARCH);
    }
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      window.setTimeout(() => inputRef.current?.focus(), 0);
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const trimmed = query.trim();
    if (trimmed.length < 2) return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      searchCities(trimmed, controller.signal)
        .then((cities) => {
          if (controller.signal.aborted) return;
          setSearch({ query: trimmed, status: "done", results: cities, error: null });
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          setSearch({
            query: trimmed,
            status: "error",
            results: [],
            error:
              error instanceof Error
                ? error.message
                : "Pencarian kota gagal. Coba lagi.",
          });
        });
    }, 450);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, query]);

  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery.length >= 2;
  const activeSearch = hasQuery && search.query === trimmedQuery;
  const status = !hasQuery ? "idle" : activeSearch ? search.status : "loading";
  const results = activeSearch ? search.results : [];
  const error = activeSearch ? search.error : null;

  return (
    <dialog
      ref={dialogRef}
      className="city-dialog"
      aria-labelledby="city-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="city-dialog__panel">
        <header className="city-dialog__head">
          <div>
            <p className="eyebrow">Ganti wilayah</p>
            <h2 id="city-dialog-title" className="city-dialog__title">
              Pilih kota atau kabupaten
            </h2>
          </div>
          <button
            type="button"
            className="city-dialog__close"
            onClick={onClose}
            aria-label="Tutup pencarian kota"
          >
            <CloseIcon size={20} />
          </button>
        </header>

        <div className="city-dialog__body">
          <p className="city-dialog__current">
            Kota saat ini <strong>{currentCity?.name ?? "memuat..."}</strong>
          </p>

          <div className="city-search">
            <SearchIcon size={18} className="city-search__icon" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ketik nama kota, misalnya Bandung"
              aria-label="Cari kota atau kabupaten"
              autoComplete="off"
              spellCheck={false}
            />
            {query && (
              <button
                type="button"
                className="city-search__clear"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                aria-label="Hapus kata kunci"
              >
                <CloseIcon size={15} />
              </button>
            )}
          </div>

          <button
            type="button"
            className="location-button city-dialog__locate"
            onClick={() => {
              onClose();
              onUseLocation();
            }}
            disabled={locating}
          >
            <LocateIcon size={16} />
            {locating ? "Mencari lokasi..." : "Deteksi kota dari lokasi saya"}
          </button>

          <div className="city-dialog__results" aria-live="polite">
            {status === "idle" && (
              <p className="city-dialog__hint">
                Cari kota atau kabupaten di seluruh Indonesia. Batas kecamatan dimuat
                sesuai kebutuhan dari OpenStreetMap.
              </p>
            )}
            {status === "loading" && (
              <p className="city-dialog__hint">Mencari kota...</p>
            )}
            {status === "error" && error && (
              <p className="inline-alert" role="alert">
                {error}
              </p>
            )}
            {status === "done" && results.length === 0 && (
              <p className="city-dialog__hint">
                Tidak ada kota yang cocok. Coba nama lain, misalnya “Kota Bandung”
                atau “Kabupaten Bogor”.
              </p>
            )}
            {results.length > 0 && (
              <ul className="city-results">
                {results.map((city) => {
                  const isCurrent = city.relationId === currentCity?.relationId;
                  return (
                    <li key={city.relationId}>
                      <button
                        type="button"
                        className="city-result"
                        aria-current={isCurrent ? "true" : undefined}
                        onClick={() => onSelect(city)}
                      >
                        <span className="city-result__icon" aria-hidden="true">
                          <PinIcon size={17} />
                        </span>
                        <span className="city-result__body">
                          <span className="city-result__name">{city.name}</span>
                          <span className="city-result__meta">
                            {TYPE_LABELS[city.type] ?? "Wilayah"}
                            {city.province ? ` · ${city.province}` : ""}
                          </span>
                        </span>
                        {isCurrent && <span className="city-result__current">Dibuka</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <p className="city-dialog__note">
            Batas wilayah berasal dari OpenStreetMap (ODbL) dan disimpan di peramban
            setelah dimuat.
          </p>
        </div>
      </div>
    </dialog>
  );
}
