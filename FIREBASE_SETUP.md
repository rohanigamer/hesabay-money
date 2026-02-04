# 🔥 Firebase Setup Guide for Hesabay Money

## Step 1: Get Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project **"hesabay-money"**
3. Click the gear icon (⚙️) → **Project Settings**
4. Scroll down to **"Your apps"** section
5. Click **"Add app"** → Select **Web** (</>) icon
6. Register your app with nickname: "Hesabay Money Web"
7. Copy the Firebase configuration object

## Step 2: Update Firebase Config

Open `src/config/firebase.js` and replace the placeholder values:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "hesabay-money.firebaseapp.com",
  projectId: "hesabay-money",
  storageBucket: "hesabay-money.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID_HERE",
  appId: "YOUR_APP_ID_HERE"
};
```

## Step 3: Enable Authentication

1. In Firebase Console, go to **Authentication**
2. Click **"Get started"**
3. Go to **"Sign-in method"** tab
4. Enable **"Email/Password"**
   - Click on "Email/Password"
   - Toggle "Enable"
   - Click "Save"

## Step 4: Create Firestore Database

1. In Firebase Console, go to **Firestore Database**
2. Click **"Create database"**
3. Select **"Start in production mode"**
4. Choose your region (closest to your users)
5. Click **"Enable"**

## Step 5: Set Firestore Security Rules

1. In Firestore Database, go to **"Rules"** tab
2. Replace the rules with the contents of **`firestore.rules`** in the project root, or paste:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

3. Click **"Publish"**

To deploy rules from the CLI (optional): `firebase deploy --only firestore` (requires Firebase CLI and `firebase use` your project).

## Step 6: Test the Setup

1. Run your app: `npm start`
2. Go to Settings
3. Click "Sign Up"
4. Create a test account
5. Check Firebase Console:
   - Authentication → Users (you should see your test user)
   - Firestore Database → users/{userId} (data will appear after first transaction)

## How It Works

### Offline/Online Sync

- **Offline**: All data is saved locally using AsyncStorage
- **Online**: Data syncs automatically to Firebase
- **Sync**: When back online, local changes sync to Firebase
- **Real-time**: Changes from other devices sync automatically

### Data Structure

```
Firestore Database:
└── users/
    └── {userId}/
        ├── customers/
        │   └── {customerId}
        │       ├── id
        │       ├── name
        │       ├── number
        │       ├── balance
        │       └── createdAt
        └── transactions/
            └── {transactionId}
                ├── id
                ├── amount
                ├── type
                ├── description
                ├── customerId
                ├── customerName
                └── createdAt
```

### Features

✅ **User Authentication**: Email/Password signup and login
✅ **Offline First**: Works without internet
✅ **Auto Sync**: Syncs when online
✅ **Real-time Updates**: Changes sync across devices
✅ **User Isolation**: Each user has their own database
✅ **Secure**: Firebase security rules protect user data

## Troubleshooting

### Issue: "Firebase not configured"
**Solution**: Make sure you've replaced the placeholder values in `src/config/firebase.js`

### Issue: "Permission denied"
**Solution**: Check Firestore security rules are set correctly

### Issue: "Network request failed"
**Solution**: Check your internet connection and Firebase project is active

### Issue: "Auth domain not whitelisted"
**Solution**: In Firebase Console → Authentication → Settings → Authorized domains, add your domain

## Next Steps

1. ✅ Complete Firebase setup above
2. ✅ Test signup/login
3. ✅ Add some test data
4. ✅ Test offline mode (turn off internet)
5. ✅ Test sync (turn internet back on)
6. 🚀 Build production APK with Firebase enabled!

## Support

If you encounter any issues:
1. Check Firebase Console for errors
2. Check browser/app console for error messages
3. Verify all Firebase services are enabled
4. Ensure security rules are published

---

**Important**: Never commit your Firebase config with real API keys to public repositories!

