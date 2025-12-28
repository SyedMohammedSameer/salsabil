# 🚀 Netlify Deployment Guide

## Environment Variables Setup

This app requires environment variables to be configured in Netlify. **DO NOT** hardcode these values in your code.

### Step 1: Get Your Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** > **General**
4. Scroll down to **Your apps** section
5. Click on your web app (or create one if you haven't)
6. Copy the configuration values

### Step 2: Add Environment Variables to Netlify

1. Go to your Netlify dashboard
2. Select your site
3. Go to **Site settings** > **Environment variables**
4. Click **Add a variable** and add each of these:

```
VITE_FIREBASE_API_KEY=AIzaSyA2MMH56_72oL0gTJ4fhPU9m0xtMI-O67M
VITE_FIREBASE_AUTH_DOMAIN=focusflow-71a55.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=focusflow-71a55
VITE_FIREBASE_STORAGE_BUCKET=focusflow-71a55.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=979654187250
VITE_FIREBASE_APP_ID=1:979654187250:web:b747752305909efa41586b
```

**Important Notes:**
- ✅ These are your actual Firebase values from the console
- ✅ Firebase API keys are safe to expose in client-side code (they're not secret)
- ✅ Security comes from Firestore rules, not from hiding the API key
- ✅ Set these for **both** "All scopes" and "Builds" in Netlify

### Step 3: Add Groq API Key (Optional - for AI features)

If you want AI features to work:

1. Get your Groq API key from [Groq Console](https://console.groq.com/)
2. Add to Netlify environment variables:

```
VITE_GROQ_API_KEY=your-groq-api-key
```

### Step 4: Deploy Firestore Security Rules

**IMPORTANT:** Deploy your Firestore rules before deploying the app:

1. Install Firebase CLI (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Deploy ONLY the Firestore rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

This ensures your security rules are active before users can access the app.

### Step 5: Deploy to Netlify

Once environment variables are set and Firestore rules deployed:

1. Go to **Deploys** tab in Netlify
2. Click **Trigger deploy** > **Deploy site**
3. Or push a new commit to trigger automatic deployment

The build process will automatically generate `firebase-messaging-sw.js` with your environment variables.

---

## 🔒 Security

### Why Firebase API Keys Are Safe in Client Code

Firebase API keys are **not secret keys**. They're designed to be included in your client-side code. Security is enforced through:

1. **Firestore Security Rules** - Control who can read/write data
2. **Firebase Authentication** - Verify user identity
3. **App Check** (optional) - Prevent unauthorized clients

Your `firestore.rules` file already has proper security rules that only allow authenticated users to access their own data.

### What IS Secret

- **Never** expose:
  - Service account private keys
  - Database passwords
  - Admin SDK credentials
  - Backend API keys with write access

---

## 📝 Local Development

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your Firebase values in `.env`

3. Run dev server:
   ```bash
   npm run dev
   ```

The `.env` file is gitignored and won't be committed.

---

## ✅ Verification

After deployment, check:

1. **Build logs** - Should see: `✅ Generated firebase-messaging-sw.js with environment variables`
2. **Service worker** - Check browser DevTools > Application > Service Workers
3. **Firebase connection** - Try logging in and creating data

---

## 🔧 Troubleshooting

### Build fails with "undefined" in service worker
- Make sure all `VITE_FIREBASE_*` variables are set in Netlify
- Check variable names match exactly (they're case-sensitive)
- Ensure you set them for "Builds" scope

### Notifications don't work
- Check browser console for errors
- Verify service worker is registered
- Make sure you've enabled Cloud Messaging API in Firebase Console

### Data not syncing
- Check Firestore security rules are deployed
- Verify user is authenticated
- Check browser console for permission errors

---

## 📚 Additional Resources

- [Netlify Environment Variables](https://docs.netlify.com/environment-variables/overview/)
- [Firebase Web Setup](https://firebase.google.com/docs/web/setup)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
