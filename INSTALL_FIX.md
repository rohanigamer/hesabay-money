# Fixing Package Installation

## Issue
Some package versions don't exist for Expo SDK 49.

## Solution

Since PowerShell execution policy is blocking npm/npx commands, please run this command manually in your terminal:

### Option 1: Use Expo Install (Recommended)
```bash
npx expo install expo-local-authentication expo-secure-store expo-file-system expo-sharing expo-document-picker expo-localization
```

This will automatically install the correct versions compatible with Expo SDK 49.

### Option 2: Manual Install
If the above doesn't work, try installing without version constraints:

```bash
npm install expo-local-authentication expo-secure-store expo-file-system expo-sharing expo-document-picker expo-localization i18n-js
```

### Option 3: Fix PowerShell Execution Policy
If you want to enable npm/npx commands:

1. Open PowerShell as Administrator
2. Run: `Set-ExecutionPolicy RemoteSigned`
3. Then try the install commands again

### Option 4: Use Command Prompt Instead
Open Command Prompt (cmd) instead of PowerShell and run:
```bash
npm install
```

## After Installation

Once packages are installed, you can:
1. Test the app: `npm start`
2. Build the app: `eas build --platform android --profile preview`

The package.json has been updated with compatible versions for Expo SDK 49.

