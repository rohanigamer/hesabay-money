# Test Hesabay Money with Expo Go on Mobile

## 1. Install Expo Go on your phone

- **Android**: [Google Play – Expo Go](https://play.google.com/store/apps/details?id=host.exp.exponent)
- **iOS**: [App Store – Expo Go](https://apps.apple.com/app/expo-go/id982107779)

## 2. Start the project on your computer

In the project folder, run:

```bash
npx expo start
```

Or:

```bash
npm start
```

A terminal UI will open with a **QR code**.

## 3. Connect your phone

### Android

1. Open the **Expo Go** app.
2. Tap **“Scan QR code”**.
3. Scan the QR code from the terminal (or from the browser tab that opened).
4. The app will load on your phone.

### iOS

1. Open the **Camera** app (or Expo Go).
2. Point it at the QR code in the terminal.
3. Tap the banner that appears to open in **Expo Go**.
4. The app will load.

## 4. Same Wi‑Fi

Your phone and computer must be on the **same Wi‑Fi network**. If they are not, use tunnel mode:

```bash
npx expo start --tunnel
```

(Requires installing `@expo/ngrok` if prompted.)

## Quick reference

| Command              | Description                    |
|----------------------|--------------------------------|
| `npm start`          | Start dev server (QR in terminal) |
| `npx expo start`      | Same as above                  |
| `npx expo start --tunnel` | Use when phone and PC are on different networks |
| `npx expo start --web` | Open in browser (web only)   |

## Troubleshooting

- **“Unable to connect”**: Use `npx expo start --tunnel` or check firewall (allow Node/Metro).
- **QR not opening**: Type the URL shown in the terminal into Expo Go manually (e.g. `exp://192.168.x.x:8081`).
- **Slow load**: First bundle can take a minute; wait for “Bundled successfully”.
