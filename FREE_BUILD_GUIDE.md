# Hesabay Money - FREE Build Guide 🚀

Build your Android APK for **FREE** - No Android Studio needed!

---

## 🏆 Option 1: GitHub Actions (100% FREE - Recommended)

### Step 1: Create GitHub Account & Repository

1. Go to [github.com](https://github.com) → Sign up (free)
2. Click **+** → **New repository**
3. Name: `hesabay-money`
4. Select **Public** (required for free builds)
5. Click **Create repository**

### Step 2: Upload Your Code

Open PowerShell in `D:\HesabayMoney` and run:

```powershell
git remote add origin https://github.com/YOUR_USERNAME/hesabay-money.git
git branch -M main
git push -u origin main
```

### Step 3: Build APK (Automatic!)

1. Go to your GitHub repo
2. Click **Actions** tab
3. Click **Build Android APK**
4. Click **Run workflow** → **Run workflow**
5. Wait 15-20 minutes
6. Download APK from **Artifacts** section!

---

## 🎯 Option 2: Codemagic (500 Free Minutes/Month)

### Step 1: Sign Up

1. Go to [codemagic.io](https://codemagic.io)
2. Click **Start building for free**
3. Sign in with your GitHub account

### Step 2: Add Your App

1. Click **Add application**
2. Select your `hesabay-money` repository
3. Select **React Native App**
4. It will detect the `codemagic.yaml` file automatically

### Step 3: Build!

1. Click **Start your first build**
2. Select branch: `main`
3. Click **Start new build**
4. Wait 15-20 minutes
5. Download APK from build artifacts!

---

## 🌐 Option 3: AppCircle (Free Tier)

1. Go to [appcircle.io](https://appcircle.io)
2. Create free account
3. Connect GitHub repo
4. Create React Native build profile
5. Build and download APK

---

## 📱 Option 4: Expo EAS (30 Free Builds/Month)

Already configured! Just run:

```powershell
cd D:\HesabayMoney
eas build --platform android --profile production
```

---

## 🧪 Test on Web First

Before building APK, test on web:

```powershell
cd D:\HesabayMoney
npm run web
```

Open http://localhost:8081 in browser.

---

## 📂 Build Outputs

| Service | APK Location |
|---------|--------------|
| GitHub Actions | Actions → Build → Artifacts |
| Codemagic | Build Dashboard → Artifacts |
| EAS | Expo Dashboard → Builds |

---

## 🔥 Firebase Setup (Already Configured)

Your app uses Firebase:
- **Project ID**: hesabay-money
- **Auth**: Email/Password, Google Sign-In
- **Database**: Firestore (user-specific data)

---

## ⚠️ Troubleshooting

### "Build failed with Firebase error"
```powershell
npm install firebase@10.8.0 --legacy-peer-deps
```

### "Dependency mismatch"
```powershell
npx expo install --fix
```

### "APK crashes on open"
```powershell
npm install
npx expo prebuild --clean
```

---

## ✅ Quick Start Checklist

- [ ] Push code to GitHub
- [ ] Run GitHub Actions build
- [ ] Download APK from Artifacts
- [ ] Install on Android phone
- [ ] Test login/signup
- [ ] Done! 🎉

---

## 📞 Support

- Firebase Console: https://console.firebase.google.com
- Expo Dashboard: https://expo.dev
- GitHub Actions Docs: https://docs.github.com/actions

**Happy Building! 🚀**
