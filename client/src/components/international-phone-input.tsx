import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";

interface InternationalPhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  "data-testid"?: string;
}

function toAsciiDigits(value: string) {
  return value
    .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x06f0));
}

function countryFlag(country: string) {
  return Array.from(country.toUpperCase())
    .map(letter => String.fromCodePoint(127397 + letter.charCodeAt(0)))
    .join("");
}

export function InternationalPhoneInput({
  value,
  onChange,
  id,
  placeholder,
  className = "",
  required,
  disabled,
  "data-testid": testId,
}: InternationalPhoneInputProps) {
  const { i18n } = useTranslation();
  const language = i18n.language.startsWith("ar") ? "ar" : "en";
  const [country, setCountry] = useState<CountryCode>("SA");
  const parsedValue = useMemo(
    () => (value ? parsePhoneNumberFromString(value) : undefined),
    [value],
  );
  const countryOptions = useMemo(() => {
    const names = new Intl.DisplayNames([language], { type: "region" });
    return getCountries()
      .map(code => ({
        code,
        name: names.of(code) || code,
        callingCode: getCountryCallingCode(code),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, language));
  }, [language]);

  useEffect(() => {
    if (parsedValue?.country) setCountry(parsedValue.country);
  }, [parsedValue?.country]);

  const activeCountry = parsedValue?.country || country;
  const activeCallingCode = getCountryCallingCode(activeCountry);
  const digits = toAsciiDigits(value).replace(/\D/g, "");
  const nationalValue = parsedValue?.countryCallingCode === activeCallingCode
    ? parsedValue.nationalNumber
    : digits.startsWith(activeCallingCode)
      ? digits.slice(activeCallingCode.length)
      : digits;

  const handleCountryChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextCountry = event.target.value as CountryCode;
    setCountry(nextCountry);
    const localDigits = nationalValue.replace(/\D/g, "");
    onChange(localDigits ? `+${getCountryCallingCode(nextCountry)}${localDigits}` : "");
  };

  const handleNumberChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = toAsciiDigits(event.target.value).trim();
    const internationalInput = raw.startsWith("00") ? `+${raw.slice(2)}` : raw;
    const pastedInternational = parsePhoneNumberFromString(internationalInput);
    if ((raw.startsWith("+") || raw.startsWith("00")) && pastedInternational) {
      if (pastedInternational.country) setCountry(pastedInternational.country);
      onChange(pastedInternational.number);
      return;
    }

    const parsedNational = parsePhoneNumberFromString(raw, activeCountry);
    const localDigits = parsedNational?.nationalNumber
      || raw.replace(/\D/g, "").replace(/^0/, "");
    onChange(localDigits ? `+${activeCallingCode}${localDigits.slice(0, 15)}` : "");
  };

  return (
    <div className={`flex w-full gap-2 ${className}`} dir="ltr">
      <select
        aria-label={language === "ar" ? "البلد ومفتاح الاتصال" : "Country calling code"}
        value={activeCountry}
        onChange={handleCountryChange}
        disabled={disabled}
        className="h-11 w-[132px] shrink-0 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        data-testid={testId ? `${testId}-country` : undefined}
      >
        {countryOptions.map(option => (
          <option key={option.code} value={option.code}>
            {countryFlag(option.code)} +{option.callingCode} {option.name}
          </option>
        ))}
      </select>
      <Input
        id={id}
        type="tel"
        inputMode="tel"
        value={nationalValue}
        onChange={handleNumberChange}
        placeholder={placeholder || (language === "ar" ? "أدخل رقم الجوال" : "Enter phone number")}
        autoComplete="tel-national"
        required={required}
        disabled={disabled}
        dir="ltr"
        className="min-w-0 flex-1"
        data-testid={testId}
      />
    </div>
  );
}