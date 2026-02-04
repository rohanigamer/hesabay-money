# Production readiness checklist

Use this list to verify the app before release.

---

## Done

- [x] **Error Boundary** – Catches render errors and shows “Something went wrong” + Try again (no blank crash screen).
- [x] **Auth** – Firebase email/password, guest mode; no default or hardcoded password in app or README.
- [x] **Multi-currency** – Up to 3 wallets, exchange rates, conversion on Calculation page.
- [x] **Exchange rates** – Stored in Settings, synced to Firebase and backup/restore.
- [x] **Delete all transactions** – With confirmation and type-“DELETE” verification; clears local + cloud when signed in.
- [x] **Backup / restore** – Export/import .Mbackup (customers, transactions, wallets, theme, language, exchange rates).
- [x] **Firebase sync** – Sync, refresh, merge on login; wallets and exchange rates included.
- [x] **i18n** – English, Dari (pr), Pashto (ps) for main flows and new features.
- [x] **Theme** – Light / dark / system.
- [x] **App lock** – Passcode and biometric (where supported), auto-lock timeout.
- [x] **Feedback** – Toasts and confirmation dialogs via FeedbackContext.
- [x] **Safe area** – Insets used on main screens and modals.
- [x] **Version** – 2.0.0 in app.json, package.json, About, Settings footer.

---

## Before store submission

### 1. Firebase / backend

- [x] **Firestore rules** – `firestore.rules` in project root; deploy via Firebase Console (Rules tab) or `firebase deploy --only firestore`. Restricts `users/{userId}` to `request.auth.uid == userId`.
- [ ] **Auth** – Email/Password enabled; Google (or other providers) configured if used.
- [ ] **Quotas** – Monitor read/write and auth usage; set budgets if needed.

### 2. Store listing

- [x] **Privacy policy** – Link in Settings (Help & Support) and About; URL from `app.json` → `extra.privacyPolicyUrl` (default: Google Sites placeholder). Replace with your real URL before submission.
- [ ] **Terms of service** – Optional but recommended; link from About or Settings if you have one.
- [ ] **Store assets** – Screenshots, short/long description, correct category.
- [x] **Rate app** – “Rate App” in Settings opens store link: Android uses `extra.rateAppAndroidUrl` (default: Play Store `id=com.hesabay.money`); iOS uses `extra.rateAppIosUrl`. Replace iOS URL in `app.json` with your App Store app ID when published.

### 3. Build and signing

- [ ] **Android** – `versionCode` in app.json incremented for each release; signing configured (EAS or local).
- [ ] **iOS** – Bundle ID, provisioning, and TestFlight/App Store connect set up if you ship iOS.
- [ ] **Web** – If you host the web build, use HTTPS and a proper domain.

### 4. Optional improvements

- [ ] **Console logs** – Many `console.log`/`console.error` remain; consider wrapping in `if (__DEV__)` or stripping in production build if you want cleaner logs.
- [ ] **Long lists** – Transaction/customer lists use `ScrollView` + `map`. For 500+ items, consider `FlatList` for better performance.
- [ ] **Analytics** – Optional: add Firebase Analytics or similar for crashes/usage (and privacy policy must mention it).
- [ ] **Deep links** – `scheme: hesabaymoney` is set; implement handling if you need password reset or marketing links to open the app.
- [ ] **Splash** – `expo-splash-screen` is present; ensure “keep splash visible until app ready” is used if you want to avoid a flash of empty content.

---

## Quick pre-release test

1. **Guest flow** – Use as guest, add transactions/customers, backup to file, clear data (delete all), restore from file.
2. **Signed-in flow** – Sign up, add data, sync, open on another device (or refresh), confirm data appears.
3. **Multi-currency** – Add 2+ currencies, set exchange rates, check Calculation “Display total in” and converted total.
4. **App lock** – Enable passcode or biometric, background app, return and confirm lock screen.
5. **Error case** – Trigger an error (e.g. bad backup import) and confirm user sees a message, not a blank screen.

---

## Summary

Core behavior, auth, sync, backup, and error handling are in place. Before going production, complete Firebase rules, add privacy (and optionally terms) links, fix store links and assets, and run the quick test above. Optional items (logs, FlatList, analytics) can follow after first release.
