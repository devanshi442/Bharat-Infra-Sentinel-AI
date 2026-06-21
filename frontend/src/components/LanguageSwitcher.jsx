import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const languages = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'bn', name: 'বাংলা' },
  { code: 'mr', name: 'मराठी' },
  { code: 'te', name: 'తెలుగు' },
  { code: 'ta', name: 'தமிழ்' },
  { code: 'gu', name: 'ગુજરાતી' },
  { code: 'kn', name: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'മലയാളം' },
  { code: 'pa', name: 'ਪੰਜਾਬੀ' },
];

export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation();

  return (
    <div className="relative inline-flex items-center gap-2">
      <Globe className="w-4 h-4 text-slate-500" />
      <select
        value={i18n.resolvedLanguage || i18n.language || 'en'}
        onChange={(e) => i18n.changeLanguage(e.target.value)}
        className="appearance-none bg-transparent border border-slate-200 rounded-md py-1 pl-2 pr-6 text-sm text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-accent cursor-pointer"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
          backgroundPosition: 'right 0.2rem center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: '1.5em 1.5em'
        }}
      >
        {languages.map((lng) => (
          <option key={lng.code} value={lng.code}>
            {lng.name}
          </option>
        ))}
      </select>
      {!(i18n.resolvedLanguage === 'en' || i18n.resolvedLanguage === 'hi' || i18n.language === 'en' || i18n.language === 'hi') && (
        <span className="absolute -top-1 -right-1 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-accent opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-accent" title={t('full_translation_in_progress', 'Full translation in progress')}></span>
        </span>
      )}
      {!(i18n.resolvedLanguage === 'en' || i18n.resolvedLanguage === 'hi' || i18n.language === 'en' || i18n.language === 'hi') && (
        <span className="hidden sm:inline text-[10px] text-brand-accent bg-brand-light px-1.5 py-0.5 rounded ml-1 border border-brand-accent/30">
          {t('translation_in_progress', 'translation in progress')}
        </span>
      )}
    </div>
  );
}
