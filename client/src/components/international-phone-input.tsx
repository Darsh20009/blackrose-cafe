import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";
import { Check, ChevronsUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
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
  const activeCountryName = countryOptions.find(option => option.code === activeCountry)?.name || activeCountry;
  const digits = toAsciiDigits(value).replace(/\D/g, "");
  const nationalValue = parsedValue?.countryCallingCode === activeCallingCode
    ? parsedValue.nationalNumber
    : digits.startsWith(activeCallingCode)
      ? digits.slice(activeCallingCode.length)
      : digits;

  const selectCountry = (nextCountry: CountryCode) => {
    setCountry(nextCountry);
    const localDigits = nationalValue.replace(/\D/g, "");
    onChange(localDigits ? `+${getCountryCallingCode(nextCountry)}${localDigits}` : "");
  };

  const handleCountryChange = (event: ChangeEvent<HTMLSelectElement>) => {
    selectCountry(event.target.value as CountryCode);
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
      <Popover open={countryPickerOpen} onOpenChange={setCountryPickerOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={countryPickerOpen}
            aria-label={`${language === "ar" ? "البلد ومفتاح الاتصال" : "Country calling code"}: ${activeCountryName} +${activeCallingCode}`}
            disabled={disabled}
            className="h-11 min-h-11 w-[132px] shrink-0 justify-between px-2 font-normal"
            data-testid={testId ? `${testId}-country` : undefined}
          >
            <span className="flex min-w-0 items-center gap-1.5" dir="ltr">
              <span aria-hidden="true">{countryFlag(activeCountry)}</span>
              <span>+{activeCallingCode}</span>
            </span>
            <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          side="bottom"
          sideOffset={4}
          className="w-[min(22rem,calc(100vw-1rem))] max-h-[70vh] overflow-hidden p-0"
        >
          <Command dir={language} className="max-h-[70vh]">
            <CommandInput
              placeholder={language === "ar" ? "ابحث عن الدولة أو مفتاح الاتصال..." : "Search country or calling code..."}
              aria-label={language === "ar" ? "ابحث عن الدولة أو مفتاح الاتصال" : "Search country or calling code"}
            />
            <CommandList className="max-h-[min(55vh,320px)] overscroll-contain">
              <CommandEmpty>{language === "ar" ? "لا توجد دولة مطابقة" : "No country found."}</CommandEmpty>
              {countryOptions.map(option => (
                <CommandItem
                  key={option.code}
                  value={`${option.name} ${option.code} +${option.callingCode}`}
                  onSelect={() => {
                    selectCountry(option.code);
                    setCountryPickerOpen(false);
                  }}
                  className="min-h-10"
                >
                  <span aria-hidden="true">{countryFlag(option.code)}</span>
                  <span className="min-w-0 flex-1 truncate">{option.name}</span>
                  <span dir="ltr" className="text-muted-foreground">+{option.callingCode}</span>
                  {activeCountry === option.code && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
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