# Quick Fix for EAS Build Failure

## The Problem
Your build is failing because the required asset files (icon.png, splash.png, etc.) are missing from the `assets/` folder.

## Quickest Solution

### Step 1: Create Simple Placeholder Assets

You need to create these 4 image files in the `assets/` folder:

1. **icon.png** - 1024x1024 pixels
2. **splash.png** - 1242x2436 pixels (or any size, Expo will resize)
3. **adaptive-icon.png** - 1024x1024 pixels (can be same as icon.png)
4. **favicon.png** - 48x48 pixels

### Step 2: Easiest Way to Create Them

**Option A: Use Paint or Any Image Editor**
1. Open any image editor (Paint, GIMP, Photoshop, etc.)
2. Create a new image with the required dimensions
3. Fill with color #1a1a2e (dark blue) or #e94560 (red) for icon
4. Add white text "H" or "HM" for Hesabay Money
5. Save as PNG
6. Copy to `assets/` folder with correct names

**Option B: Use Online Generators**
1. Go to https://www.appicon.co/
2. Upload any square image (or create one)
3. Download all sizes
4. Use the 1024x1024 as `icon.png` and `adaptive-icon.png`
5. For splash, create a 1242x2436 image with your branding

**Option C: Use This Simple Method**
1. Create a 1024x1024px solid color image (#e94560) with white "H"
2. Save as `icon.png` and copy to `adaptive-icon.png`
3. Create a 1242x2436px image with dark background (#1a1a2e) and "Hesabay Money" text
4. Save as `splash.png`
5. Resize icon to 48x48 and save as `favicon.png`

### Step 3: After Creating Assets

1. Make sure all 4 files are in the `assets/` folder:
   ```
   assets/
   ├── icon.png
   ├── splash.png
   ├── adaptive-icon.png
   └── favicon.png
   ```

2. Add them to git:
   ```bash
   git add assets/
   git commit -m "Add app assets"
   ```

3. Try building again:
   ```bash
   eas build --platform android
   ```

## Alternative: Temporarily Remove Asset Requirements

If you want to test the build without assets first, you can temporarily modify `app.json`:

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

But you still need at least `icon.png` for Android builds.

## Recommended Asset Specifications

- **Icon**: 1024x1024px, PNG, transparent or solid background
- **Splash**: 1242x2436px (iPhone size works), PNG, background color #1a1a2e
- **Adaptive Icon**: 1024x1024px, PNG, should work on both light and dark backgrounds
- **Favicon**: 48x48px, PNG (for web version)

## Still Having Issues?

1. Check the build logs at the URL provided in the error
2. Make sure all files are actually PNG format
3. Verify file sizes are reasonable (not 0 bytes)
4. Try: `npx expo-doctor` to check for other issues

