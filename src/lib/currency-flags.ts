export interface CurrencyInfo {
  code: string;
  countryCode: string;
  countryName: string;
  currencyName: string;
  symbol: string;
}

export const CURRENCY_MAP: Record<
  string,
  { countryCode: string; countryName: string; currencyName: string; emoji: string }
> = {
  USD: { countryCode: "us", countryName: "United States", currencyName: "United States dollar", emoji: "🇺🇸" },
  EUR: { countryCode: "eu", countryName: "European Union", currencyName: "Euro", emoji: "🇪🇺" },
  AUD: { countryCode: "au", countryName: "Australia", currencyName: "Australian dollar", emoji: "🇦🇺" },
  CAD: { countryCode: "ca", countryName: "Canada", currencyName: "Canadian dollar", emoji: "🇨🇦" },
  CNY: { countryCode: "cn", countryName: "China", currencyName: "Renminbi / Yuan", emoji: "🇨🇳" },
  CZK: { countryCode: "cz", countryName: "Czech Republic", currencyName: "Czech koruna", emoji: "🇨🇿" },
  DKK: { countryCode: "dk", countryName: "Denmark", currencyName: "Danish krone", emoji: "🇩🇰" },
  EGP: { countryCode: "eg", countryName: "Egypt", currencyName: "Egyptian pound", emoji: "🇪🇬" },
  HKD: { countryCode: "hk", countryName: "Hong Kong", currencyName: "Hong Kong dollar", emoji: "🇭🇰" },
  ILS: { countryCode: "il", countryName: "Israel", currencyName: "Israeli new shekel", emoji: "🇮🇱" },
  JOD: { countryCode: "jo", countryName: "Jordan", currencyName: "Jordanian dinar", emoji: "🇯🇴" },
  JPY: { countryCode: "jp", countryName: "Japan", currencyName: "Japanese yen", emoji: "🇯🇵" },
  KRW: { countryCode: "kr", countryName: "South Korea", currencyName: "South Korean won", emoji: "🇰🇷" },
  MYR: { countryCode: "my", countryName: "Malaysia", currencyName: "Malaysian ringgit", emoji: "🇲🇾" },
  NZD: { countryCode: "nz", countryName: "New Zealand", currencyName: "New Zealand dollar", emoji: "🇳🇿" },
  PLN: { countryCode: "pl", countryName: "Poland", currencyName: "Polish zloty", emoji: "🇵🇱" },
  QAR: { countryCode: "qa", countryName: "Qatar", currencyName: "Qatari riyal", emoji: "🇶🇦" },
  SAR: { countryCode: "sa", countryName: "Saudi Arabia", currencyName: "Saudi riyal", emoji: "🇸🇦" },
  SGD: { countryCode: "sg", countryName: "Singapore", currencyName: "Singapore dollar", emoji: "🇸🇬" },
  SEK: { countryCode: "se", countryName: "Sweden", currencyName: "Swedish krona", emoji: "🇸🇪" },
  CHF: { countryCode: "ch", countryName: "Switzerland", currencyName: "Swiss franc", emoji: "🇨🇭" },
  THB: { countryCode: "th", countryName: "Thailand", currencyName: "Thai baht", emoji: "🇹🇭" },
  TRY: { countryCode: "tr", countryName: "Turkey", currencyName: "Turkish lira", emoji: "🇹🇷" },
  AED: { countryCode: "ae", countryName: "United Arab Emirates", currencyName: "UAE dirham", emoji: "🇦🇪" },
  VND: { countryCode: "vn", countryName: "Vietnam", currencyName: "Vietnamese dong", emoji: "🇻🇳" },
  GBP: { countryCode: "gb", countryName: "United Kingdom", currencyName: "British pound", emoji: "🇬🇧" },
  IDR: { countryCode: "id", countryName: "Indonesia", currencyName: "Indonesian rupiah", emoji: "🇮🇩" },
  BND: { countryCode: "bn", countryName: "Brunei", currencyName: "Brunei dollar", emoji: "🇧🇳" },
  PHP: { countryCode: "ph", countryName: "Philippines", currencyName: "Philippine peso", emoji: "🇵🇭" },
  TWD: { countryCode: "tw", countryName: "Taiwan", currencyName: "New Taiwan dollar", emoji: "🇹🇼" },
  INR: { countryCode: "in", countryName: "India", currencyName: "Indian rupee", emoji: "🇮🇳" },
  NOK: { countryCode: "no", countryName: "Norway", currencyName: "Norwegian krone", emoji: "🇳🇴" },
  RUB: { countryCode: "ru", countryName: "Russia", currencyName: "Russian ruble", emoji: "🇷🇺" },
  BRL: { countryCode: "br", countryName: "Brazil", currencyName: "Brazilian real", emoji: "🇧🇷" },
  ZAR: { countryCode: "za", countryName: "South Africa", currencyName: "South African rand", emoji: "🇿🇦" },
  MXN: { countryCode: "mx", countryName: "Mexico", currencyName: "Mexican peso", emoji: "🇲🇽" },
};

export function getCurrencyFlagUrl(code: string): string {
  const meta = CURRENCY_MAP[code.toUpperCase()];
  const countryCode = meta ? meta.countryCode : code.slice(0, 2).toLowerCase();
  return `https://flagcdn.com/w80/${countryCode}.png`;
}

export function getCurrencyInfo(code: string, fallbackName?: string) {
  const meta = CURRENCY_MAP[code.toUpperCase()];
  if (meta) {
    return {
      countryName: meta.countryName,
      currencyName: fallbackName || meta.currencyName,
      flagUrl: getCurrencyFlagUrl(code),
      emoji: meta.emoji,
    };
  }
  return {
    countryName: code,
    currencyName: fallbackName || code,
    flagUrl: getCurrencyFlagUrl(code),
    emoji: "🌐",
  };
}
