import I18n from 'i18n-js';
import * as Localization from 'expo-localization';
import { Storage } from './Storage';

// Translations
const translations = {
  en: {
    welcome: 'Welcome',
    dashboard: 'Dashboard',
    customers: 'Customers',
    transaction: 'Transaction',
    calculation: 'Calculation',
    settings: 'Settings',
    about: 'About',
    passcode: 'Passcode',
    passkey: 'Passkey',
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',
    devicePreference: 'Device Preference',
    language: 'Language',
    backup: 'Backup',
    restore: 'Restore',
    enterPasscode: 'Enter Passcode',
    confirmPasscode: 'Confirm Passcode',
    passcodeSet: 'Passcode Set',
    passcodeIncorrect: 'Incorrect Passcode',
    useFingerprint: 'Use Fingerprint',
    fingerprintPrompt: 'Authenticate with fingerprint',
    fingerprintError: 'Fingerprint authentication failed',
    backupSuccess: 'Backup created successfully',
    restoreSuccess: 'Data restored successfully',
    english: 'English',
    dari: 'Dari',
    pashto: 'Pashto',
    changePasscode: 'Change Passcode',
    enablePasscode: 'Enable Passcode',
    enablePasskey: 'Enable Passkey',
    disable: 'Disable',
    totalBalance: 'Total Balance',
    expenses: 'Expenses',
    income: 'Income',
    logout: 'Logout',
    manageYourFinances: 'Manage Your Finances',
    clearData: 'Clear All Data',
    exportData: 'Export Data',
    appVersion: 'App Version',
    privacyPolicy: 'Privacy Policy',
    termsOfService: 'Terms of Service',
    contactSupport: 'Contact Support',
    rateApp: 'Rate App',
    shareApp: 'Share App',
    selectLanguage: 'Select Language',
    selectTheme: 'Select Theme',
    cancel: 'Cancel',
    success: 'Success',
    error: 'Error',
    confirm: 'Confirm',
    delete: 'Delete',
    clear: 'Clear',
    share: 'Share',
    export: 'Export',
    version: 'Version',
    contact: 'Contact',
    rate: 'Rate',
    privacy: 'Privacy',
    terms: 'Terms',
    theme: 'Theme',
    confirmDisablePasscode: 'Are you sure you want to disable passcode?',
  },
  pr: {
    welcome: 'خوش آمدید',
    dashboard: 'داشبورد',
    customers: 'مشتریان',
    transaction: 'معاملات',
    calculation: 'محاسبه',
    settings: 'تنظیمات',
    about: 'درباره',
    passcode: 'رمز عبور',
    passkey: 'کلید عبور',
    darkMode: 'حالت تاریک',
    lightMode: 'حالت روشن',
    devicePreference: 'ترجیح دستگاه',
    language: 'زبان',
    backup: 'پشتیبان گیری',
    restore: 'بازیابی',
    enterPasscode: 'رمز عبور را وارد کنید',
    confirmPasscode: 'رمز عبور را تأیید کنید',
    passcodeSet: 'رمز عبور تنظیم شد',
    passcodeIncorrect: 'رمز عبور نادرست',
    useFingerprint: 'استفاده از اثر انگشت',
    fingerprintPrompt: 'با اثر انگشت احراز هویت کنید',
    fingerprintError: 'احراز هویت اثر انگشت ناموفق بود',
    backupSuccess: 'پشتیبان گیری با موفقیت ایجاد شد',
    restoreSuccess: 'داده ها با موفقیت بازیابی شدند',
    english: 'انگلیسی',
    dari: 'دری',
    pashto: 'پشتو',
    changePasscode: 'تغییر رمز عبور',
    enablePasscode: 'فعال کردن رمز عبور',
    enablePasskey: 'فعال کردن کلید عبور',
    disable: 'غیرفعال کردن',
    totalBalance: 'موجودی کل',
    expenses: 'هزینه ها',
    income: 'درآمد',
    logout: 'خروج',
    manageYourFinances: 'امور مالی خود را مدیریت کنید',
    clearData: 'پاک کردن تمام داده ها',
    exportData: 'صادرات داده',
    appVersion: 'نسخه برنامه',
    privacyPolicy: 'سیاست حریم خصوصی',
    termsOfService: 'شرایط استفاده',
    contactSupport: 'تماس با پشتیبانی',
    rateApp: 'امتیاز دادن به برنامه',
    shareApp: 'اشتراک گذاری برنامه',
    selectLanguage: 'انتخاب زبان',
    selectTheme: 'انتخاب تم',
    cancel: 'لغو',
    success: 'موفقیت',
    error: 'خطا',
    confirm: 'تأیید',
    delete: 'حذف',
    clear: 'پاک کردن',
    share: 'اشتراک گذاری',
    export: 'صادرات',
    version: 'نسخه',
    contact: 'تماس',
    rate: 'امتیاز',
    privacy: 'حریم خصوصی',
    terms: 'شرایط',
    theme: 'تم',
    confirmDisablePasscode: 'آیا مطمئن هستید که می خواهید رمز عبور را غیرفعال کنید؟',
  },
  ps: {
    welcome: 'ښه راغلاست',
    dashboard: 'ډشبورډ',
    customers: 'پیرودونکي',
    transaction: 'معاملات',
    calculation: 'محاسبه',
    settings: 'تنظیمات',
    about: 'په اړه',
    passcode: 'پاس کوډ',
    passkey: 'پاس کی',
    darkMode: 'تیاره حالت',
    lightMode: 'روښانه حالت',
    devicePreference: 'دستگاه غوره توب',
    language: 'ژبه',
    backup: 'بیک اپ',
    restore: 'بیا راګرځول',
    enterPasscode: 'پاس کوډ داخل کړئ',
    confirmPasscode: 'پاس کوډ تایید کړئ',
    passcodeSet: 'پاس کوډ تنظیم شو',
    passcodeIncorrect: 'ناسم پاس کوډ',
    useFingerprint: 'د ګوتو نښه وکاروئ',
    fingerprintPrompt: 'د ګوتو نښې سره تصدیق کړئ',
    fingerprintError: 'د ګوتو نښې تصدیق ناکام شو',
    backupSuccess: 'بیک اپ په بریالیتوب سره جوړ شو',
    restoreSuccess: 'ډیټا په بریالیتوب سره بیا راګرځول شو',
    english: 'انګلیسي',
    dari: 'دری',
    pashto: 'پښتو',
    changePasscode: 'پاس کوډ بدل کړئ',
    enablePasscode: 'پاس کوډ فعال کړئ',
    enablePasskey: 'پاس کی فعال کړئ',
    disable: 'غیر فعال کړئ',
    totalBalance: 'ټول موجودي',
    expenses: 'لګښتونه',
    income: 'عاید',
    logout: 'وتل',
    manageYourFinances: 'خپل مالي چارې اداره کړئ',
    clearData: 'ټول ډیټا پاک کړئ',
    exportData: 'ډیټا صادر کړئ',
    appVersion: 'د اپلیکیشن نسخه',
    privacyPolicy: 'د محرمیت پالیسي',
    termsOfService: 'د کارولو شرایط',
    contactSupport: 'د ملاتړ سره اړیکه',
    rateApp: 'د اپلیکیشن ته نمره ورکړئ',
    shareApp: 'د اپلیکیشن شریک کړئ',
    selectLanguage: 'ژبه وټاکئ',
    selectTheme: 'موضوع وټاکئ',
    cancel: 'لغوه',
    success: 'بریالیتوب',
    error: 'خطا',
    confirm: 'تایید',
    delete: 'ړنګول',
    clear: 'پاکول',
    share: 'شریکول',
    export: 'صادرول',
    version: 'نسخه',
    contact: 'اړیکه',
    rate: 'نمره',
    privacy: 'محرمیت',
    terms: 'شرایط',
    theme: 'موضوع',
    confirmDisablePasscode: 'ایا تاسو ډاډه یاست چې پاس کوډ غیر فعال کړئ؟',
  },
};

// Configure i18n
I18n.translations = translations;
I18n.locale = 'en';
I18n.fallbacks = true;
I18n.defaultLocale = 'en';

const i18n = I18n;

// Set default locale
i18n.locale = 'en';
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

// Load saved language on initialization
let currentLanguage = 'en';
Storage.getLanguage().then((lang) => {
  if (lang && translations[lang]) {
    currentLanguage = lang;
    i18n.locale = lang;
    I18n.locale = lang;
  }
});

export const setLanguage = async (lang) => {
  if (translations[lang]) {
    currentLanguage = lang;
    i18n.locale = lang;
    I18n.locale = lang;
    I18n.translations = translations;
    await Storage.setLanguage(lang);
  }
};

export const getLanguage = () => {
  return currentLanguage || i18n.locale;
};

export default i18n;
