# 🔥 Firebase Android Setup - Step by Step

## 📥 Download google-services.json

### Step 1: Go to Firebase Console

1. Open: https://console.firebase.google.com/
2. Click on **"hesabay-money"** project

### Step 2: Add Android App (If Not Already Added)

1. Click **gear icon** (⚙️) → **Project settings**
2. Scroll to **"Your apps"** section
3. Look for Android app with package `com.hesabay.money`

**If you don't see it:**
1. Click **"Add app"** button
2. Select **Android** icon (robot)
3. Fill in:
   - **Android package name**: `com.hesabay.money`
   - **App nickname**: Hesabay Money Android
   - **Debug signing certificate SHA-1**: Leave empty for now
4. Click **"Register app"**

### Step 3: Download the File

1. You'll see **"Download google-services.json"** button
2. Click it to download
3. **IMPORTANT**: Save it as `google-services.json` (exact name)
4. Move it to your project folder: `D:\projects backup 2025\projects\Project eazyload\`

**The file should be at:**
```
D:\projects backup 2025\projects\Project eazyload\google-services.json
```

---

## 🔧 What the File Looks Like

It should contain something like:

```json
{
  "project_info": {
    "project_number": "350936013602",
    "project_id": "hesabay-money",
    "storage_bucket": "hesabay-money.firebasestorage.app"
  },
  "client": [
    {
      "client_info": {
        "mobilesdk_app_id": "1:350936013602:android:...",
        "android_client_info": {
          "package_name": "com.hesabay.money"
        }
      },
      ...
    }
  ]
}
```

---

## 📝 After Downloading

### Step 1: Verify File Location

Make sure the file is at:
```
D:\projects backup 2025\projects\Project eazyload\google-services.json
```

### Step 2: Add to Git

```bash
cd "D:\projects backup 2025\projects\Project eazyload"
git add google-services.json
git commit -m "Add google-services.json for Android"
```

### Step 3: Build Again

```bash
eas build --platform android --profile production
```

---

## ⚠️ Important Notes

1. **File Name**: Must be exactly `google-services.json` (lowercase, no spaces)
2. **Location**: Must be in project root (same folder as `package.json`)
3. **Git**: Must be added to git for EAS to upload it
4. **Package Name**: Must match `com.hesabay.money`

---

## 🐛 Troubleshooting

### Error: "google-services.json is missing"
**Solution**: 
- Check file exists at project root
- Check file name is exactly `google-services.json`
- Run `git add google-services.json`

### Error: "Package name mismatch"
**Solution**:
- In Firebase, package must be `com.hesabay.money`
- In app.json, package must be `com.hesabay.money`
- They must match exactly

### Can't Find Android App in Firebase
**Solution**:
- Click "Add app" in Project Settings
- Select Android
- Register with package `com.hesabay.money`

---

## ✅ Checklist

- [ ] Opened Firebase Console
- [ ] Selected hesabay-money project
- [ ] Went to Project Settings
- [ ] Added Android app (if needed)
- [ ] Downloaded google-services.json
- [ ] Saved to project root
- [ ] Added to git
- [ ] Ready to build!

---

## 🚀 After Setup

Once you have the file:

```bash
# Add to git
git add google-services.json
git commit -m "Add Firebase Android config"

# Build
eas build --platform android --profile production
```

Build will succeed! ✅

