import { useTranslation } from "react-i18next";
import { useState } from "react";
import ClickOutside from "../ClickOutside";

const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const languages = [
    { code: "en", label: t("common.english") },
    { code: "es", label: t("common.spanish") },
    { code: "fr", label: t("common.french") },
  ];

  const changeLanguage = (langCode: string) => {
    i18n.changeLanguage(langCode);
    setDropdownOpen(false);
  };

  return (
    <li className="relative">
      <ClickOutside onClick={() => setDropdownOpen(false)}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="relative flex h-8.5 w-8.5 items-center justify-center rounded-full border-[0.5px] border-stroke bg-gray hover:text-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
        >
          <span className="text-sm font-medium">
            {i18n.language.toUpperCase()}
          </span>
        </button>

        {/* Dropdown Menu */}
        <div
          className={`absolute right-0 mt-4 flex w-40 flex-col rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark ${
            dropdownOpen === true ? "block" : "hidden"
          }`}
        >
          <ul className="flex flex-col gap-2 border-b border-stroke px-6 py-4 dark:border-strokedark">
            {languages.map((lang) => (
              <li key={lang.code}>
                <button
                  onClick={() => changeLanguage(lang.code)}
                  className={`flex items-center gap-2 text-sm font-medium duration-300 ease-in-out hover:text-primary ${
                    i18n.language === lang.code
                      ? "text-primary"
                      : "text-black dark:text-white"
                  }`}
                >
                  {lang.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </ClickOutside>
    </li>
  );
};

export default LanguageSwitcher;
