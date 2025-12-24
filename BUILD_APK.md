# How to Build APK File

## Quick Method (Recommended)

Build using the preview profile (configured for APK):

```bash
eas build --platform android --profile preview
```

This will create an APK file that you can directly install on your Android device.

## Alternative: Use Production Profile

The production profile is also configured for APK:

```bash
eas build --platform android --profile production
```

Or simply:

```bash
eas build --platform android
```

(Production is the default profile)

## After Build Completes

1. Download the APK from the provided link
2. Transfer it to your Android device
3. Enable "Install from Unknown Sources" in your device settings
4. Tap the APK file to install

## Difference Between AAB and APK

- **AAB (Android App Bundle)**: For Google Play Store distribution (smaller size, optimized)
- **APK (Android Package)**: For direct installation on devices (what you need now)

## Note

I've updated your `eas.json` file so future production builds will also generate APK files. If you want to publish to Play Store later, you can change `buildType` back to `"app-bundle"` or remove it (defaults to AAB for production).

