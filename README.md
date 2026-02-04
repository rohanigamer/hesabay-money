# Hesabay Money

A cross-platform financial management app (Android, iOS, Web) built with React Native and Expo. Manage customers, multi-currency transactions, and calculations with optional cloud sync.

## Features

- **Auth**: Sign up / Sign in with email (Firebase), Guest mode, Google Sign-In (web)
- **Transactions**: Income & expense tracking, link to customers, multi-currency (up to 3 wallets)
- **Customers**: Customer list with balances, detail screen with linked transactions
- **Calculation (Summary)**: Per-currency balances, exchange-rate conversion, top customers, recent activity
- **Exchange rates**: Set rates in Settings; view totals in another currency on the Summary page
- **Settings**: Theme, language (EN / Dari / Pashto), passcode & biometric lock, backup/restore (.Mbackup), sync/refresh from Firebase, delete all transactions (with verification)
- **Offline-first**: Data stored locally; syncs to Firebase when signed in and online

## Installation

```bash
npm install
npm start
```

Then run on a device/emulator or web:

- **Android**: `npm run android` or scan QR with Expo Go
- **iOS**: `npm run ios`
- **Web**: `npm run web`

## Building for production

### Assets

Ensure these exist in `assets/`:

- `icon.png` (1024×1024)
- `splash.png` (e.g. 1242×2436)
- `adaptive-icon.png` (1024×1024, Android)
- `favicon.png` (48×48, web)

### Android (EAS)

```bash
npm install -g eas-cli
eas login
eas build --platform android
```

### Firebase

The app uses Firebase for auth and Firestore for optional cloud sync. Configure your project and ensure:

- **Authentication**: Email/Password and (optional) Google sign-in
- **Firestore**: Database with security rules so users can only read/write their own document under `users/{userId}`

Firebase config is in `src/config/firebase.js`. For production, ensure Firestore rules restrict access by `request.auth.uid`.

## Project structure

```
├── App.js                    # Root: providers, navigation, Error Boundary
├── src/
│   ├── components/           # ErrorBoundary, BottomNavigation, GlassCard, etc.
│   ├── config/               # firebase.js
│   ├── context/              # Theme, Auth, Currency, Feedback, AppLock, Language
│   ├── screens/              # Login, Signup, Transaction, Customers, Calculation, Settings, About
│   ├── services/             # FirebaseSync, FirebaseAuthREST
│   └── utils/                # Storage, Currency, i18n
├── app.json
└── package.json
```

## Security notes

- No default password: users sign up or use Guest mode.
- Passcode/biometric and app lock are optional; data is stored in SecureStore (native) or AsyncStorage (web).
- Firebase API keys in source are normal for client apps; security is enforced by Firebase Auth and Firestore rules.

## License

© 2025 Hesabay Money. All rights reserved.
