# Hesabay Money

A beautiful and functional Android financial management app built with React Native and Expo.

## Features

- ✨ Beautiful splash screen with animations
- 🔐 Secure login system (default password: 123)
- 📊 Modern dashboard with 5 main sections
- 👥 Customer management
- 💰 Transaction tracking
- 🧮 Financial calculations
- ⚙️ Settings management
- ℹ️ About page

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Run on Android:
```bash
npm run android
```

Or scan the QR code with Expo Go app on your Android device.

## Building for Android

### Prerequisites

**IMPORTANT**: Before building, you need to create asset files in the `assets/` folder:
- `icon.png` (1024x1024px)
- `splash.png` (1242x2436px recommended)
- `adaptive-icon.png` (1024x1024px)
- `favicon.png` (48x48px)

See `QUICK_FIX.md` for detailed instructions on creating these assets.

### Build Steps

1. **Install EAS CLI** (if not already installed):
```bash
npm install -g eas-cli
```

2. **Login to Expo**:
```bash
eas login
```

3. **Build for Android**:
```bash
eas build --platform android
```

4. **Download APK**: After build completes, download from the provided URL or Expo dashboard.

### Troubleshooting

If build fails:
- Check `QUICK_FIX.md` for asset creation instructions
- Verify all assets are PNG format and correct sizes
- Run `npx expo-doctor` to check for issues
- Check build logs at the URL provided in error message

## Default Login

- Password: `123`

## Project Structure

```
├── App.js                 # Main app component with navigation
├── src/
│   └── screens/
│       ├── SplashScreen.js
│       ├── LoginScreen.js
│       ├── DashboardScreen.js
│       ├── CustomersScreen.js
│       ├── TransactionScreen.js
│       ├── CalculationScreen.js
│       ├── SettingsScreen.js
│       └── AboutScreen.js
├── package.json
└── app.json
```

## Technologies Used

- React Native
- Expo
- React Navigation
- Expo Linear Gradient
- Expo Vector Icons

## License

© 2025 Hesabay Money - All rights reserved

