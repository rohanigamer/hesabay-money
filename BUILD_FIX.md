# Fixing EAS Build Issues

## Problem
The build is failing because required asset files are missing. EAS Build requires these assets to be present.

## Solution

### Option 1: Generate Assets Using Online Tools (Recommended)

1. **Create App Icon (icon.png)**
   - Go to https://www.appicon.co/
   - Upload a 1024x1024px image with "H" or your logo
   - Download and save as `assets/icon.png`

2. **Create Splash Screen (splash.png)**
   - Create a 1242x2436px image with:
     - Background: #1a1a2e
     - "Hesabay Money" text in white
   - Save as `assets/splash.png`

3. **Create Adaptive Icon (adaptive-icon.png)**
   - Use the same icon as step 1 (1024x1024px)
   - Save as `assets/adaptive-icon.png`

4. **Create Favicon (favicon.png)**
   - Go to https://www.favicon-generator.org/
   - Upload your icon
   - Download 48x48px version
   - Save as `assets/favicon.png`

### Option 2: Use Expo Asset Generator

```bash
npm install -g expo-asset-generator
```

Then create a simple 1024x1024px image and run:
```bash
expo-asset-generator your-icon.png
```

### Option 3: Quick Fix - Use Default Expo Assets

Temporarily update `app.json` to not require custom assets:

```json
{
  "expo": {
    "icon": "./assets/icon.png",
    "splash": {
      "backgroundColor": "#1a1a2e"
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#1a1a2e"
      }
    }
  }
}
```

But you still need at least `icon.png` for the build to succeed.

### Option 4: Create Simple Placeholder Assets

You can create simple colored PNG files using any image editor:
- **icon.png**: 1024x1024px, solid color #e94560 with white "H"
- **splash.png**: 1242x2436px, gradient background #1a1a2e
- **adaptive-icon.png**: Same as icon.png
- **favicon.png**: 48x48px, simple icon

## After Adding Assets

1. Commit the assets to git:
```bash
git add assets/
git commit -m "Add app assets"
```

2. Try building again:
```bash
eas build --platform android
```

## Additional Troubleshooting

If build still fails after adding assets:

1. **Check dependency versions:**
```bash
npx expo install --check
npx expo install --fix
```

2. **Run Expo Doctor:**
```bash
npx expo-doctor
```

3. **Clear cache and rebuild:**
```bash
rm -rf node_modules
npm install
expo r -c
```

4. **Check build logs:**
Visit the build URL provided in the error message to see detailed logs.

