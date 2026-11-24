import { SimpleUIError } from '../kernel/errors.js';
import {
  getDirection,
  isPseudoLocale,
  pseudoLocalize,
  type TextDirection,
} from './locale.js';
import {
  DEFAULT_MESSAGES,
  formatMessage,
  resolvePlural,
  type MessageCatalog,
  type MessageParams,
} from './messages.js';

/**
 * Layanan locale (FND-016, docs/06-theming-a11y-i18n.md §3.2).
 *
 * - Locale dan timezone eksplisit; tidak bergantung setting mesin.
 * - Format angka/tanggal memakai `Intl`, dengan cache formatter agar format
 *   100.000 baris tidak membuat instance berulang.
 * - Fallback chain: `locale` → `fallbackLocale` → `en`.
 * - Pseudo-locale `en-XA` mengubah teks untuk visual regression.
 */

export interface LocaleOptions {
  /** BCP 47, default `en`. */
  locale?: string;
  fallbackLocale?: string;
  /** Menambah atau menimpa katalog bawaan. */
  messages?: MessageCatalog;
  /** IANA timezone; `undefined` berarti mengikuti locale. */
  timeZone?: string;
  currency?: string;
}

export interface LocaleService {
  readonly locale: string;
  readonly timeZone: string | undefined;
  readonly currency: string;
  readonly direction: TextDirection;
  t(key: string, params?: MessageParams): string;
  formatNumber(value: number, options?: Intl.NumberFormatOptions): string;
  formatDate(
    value: Date | number,
    options?: Intl.DateTimeFormatOptions,
  ): string;
  formatCurrency(value: number, options?: Intl.NumberFormatOptions): string;
  formatPercent(value: number, options?: Intl.NumberFormatOptions): string;
}

export const DEFAULT_LOCALE = 'en';
export const DEFAULT_CURRENCY = 'USD';

function canonicalize(candidate: string): string | null {
  try {
    return Intl.getCanonicalLocales(candidate)[0] ?? null;
  } catch {
    return null;
  }
}

/** Pilih locale pertama yang valid dari rantai fallback. */
export function resolveLocale(
  candidates: readonly (string | undefined)[],
): string {
  for (const candidate of candidates) {
    if (!candidate) continue;
    const canonical = canonicalize(candidate);
    if (canonical) return canonical;
  }
  return DEFAULT_LOCALE;
}

class LocaleServiceImpl implements LocaleService {
  readonly locale: string;
  readonly timeZone: string | undefined;
  readonly currency: string;
  readonly direction: TextDirection;

  readonly #catalog: MessageCatalog;
  readonly #pluralRules: Intl.PluralRules;
  readonly #pseudo: boolean;
  readonly #numberFormats = new Map<string, Intl.NumberFormat>();
  readonly #dateFormats = new Map<string, Intl.DateTimeFormat>();

  constructor(options: LocaleOptions) {
    this.locale = resolveLocale([options.locale, options.fallbackLocale]);
    this.timeZone = options.timeZone;
    this.currency = options.currency ?? DEFAULT_CURRENCY;
    this.direction = getDirection(this.locale);
    this.#pseudo = isPseudoLocale(this.locale);
    this.#catalog = { ...DEFAULT_MESSAGES, ...options.messages };
    this.#pluralRules = new Intl.PluralRules(this.locale);

    // Validasi awal agar kesalahan konfigurasi muncul saat startup.
    this.#numberFormat({
      style: 'currency',
      currency: this.currency,
    });
  }

  t(key: string, params: MessageParams = {}): string {
    const value = this.#catalog[key];
    if (value === undefined) return key;

    const text =
      typeof value === 'string'
        ? value
        : resolvePlural(value, Number(params.count ?? 0), this.#pluralRules);
    const output = formatMessage(text, params);

    return this.#pseudo ? pseudoLocalize(output) : output;
  }

  formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    return this.#numberFormat(options ?? {}).format(value);
  }

  formatPercent(value: number, options?: Intl.NumberFormatOptions): string {
    return this.#numberFormat({ style: 'percent', ...options }).format(value);
  }

  formatCurrency(value: number, options?: Intl.NumberFormatOptions): string {
    return this.#numberFormat({
      style: 'currency',
      currency: this.currency,
      ...options,
    }).format(value);
  }

  formatDate(
    value: Date | number,
    options?: Intl.DateTimeFormatOptions,
  ): string {
    const merged: Intl.DateTimeFormatOptions = this.timeZone
      ? { timeZone: this.timeZone, ...options }
      : { ...options };

    return this.#dateFormat(merged).format(value);
  }

  #numberFormat(options: Intl.NumberFormatOptions): Intl.NumberFormat {
    const key = JSON.stringify(options);
    const cached = this.#numberFormats.get(key);
    if (cached) return cached;

    const formatter = this.#guard(
      () => new Intl.NumberFormat(this.locale, options),
      `Opsi format angka tidak valid: ${key}`,
    );
    this.#numberFormats.set(key, formatter);
    return formatter;
  }

  #dateFormat(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
    const key = JSON.stringify(options);
    const cached = this.#dateFormats.get(key);
    if (cached) return cached;

    const formatter = this.#guard(
      () => new Intl.DateTimeFormat(this.locale, options),
      `Opsi format tanggal tidak valid: ${key}`,
    );
    this.#dateFormats.set(key, formatter);
    return formatter;
  }

  #guard<T>(create: () => T, message: string): T {
    try {
      return create();
    } catch (error) {
      throw new SimpleUIError('SUI-I18N-001', message, { cause: error });
    }
  }
}

/** Buat layanan locale; semua opsi bersifat opsional. */
export function createLocaleService(
  options: LocaleOptions = {},
): LocaleService {
  return new LocaleServiceImpl(options);
}
