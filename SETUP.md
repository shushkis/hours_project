# Hours Tracker PWA - Setup Guide

## 🚀 Quick Start

### Option 1: Local Development
1. **Download/Clone** this project to your computer
2. **Open** `index.html` in a modern web browser
3. **Start using** the app immediately (works offline!)

### Option 2: Web Server (Recommended)
For full PWA features, serve the files from a web server:

```bash
# Using Python (most systems have this)
python3 -m http.server 8080

# Or using Node.js
npx serve .

# Or using PHP
php -S localhost:8080
```

Then visit `http://localhost:8080` in your browser.

## 📱 Install as App

### On Mobile (iOS/Android)
1. Open the app in your mobile browser
2. Look for "Add to Home Screen" or "Install App" option
3. Tap it to install the PWA on your home screen

### On Desktop (Chrome/Edge)
1. Open the app in Chrome or Edge
2. Look for the install button (⊕) in the address bar
3. Click it to install as a desktop app

## 🔧 Google Sheets Integration Setup

To enable automatic sync with Google Sheets:

### Step 1: Google Cloud Console Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the **Google Sheets API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click "Enable"

### Step 2: Create OAuth 2.0 Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client ID"
3. Configure OAuth consent screen if prompted:
   - User Type: External
   - App name: "Hours Tracker"
   - User support email: Your email
   - Add your email to test users
4. Create OAuth 2.0 Client ID:
   - Application type: **Web application**
   - Name: "Hours Tracker PWA"
   - Authorized JavaScript origins: 
     - `http://localhost:8080` (for local development)
     - Your production domain (e.g., `https://yourdomain.com`)
   - No authorized redirect URIs needed

### Step 3: Get API Key
1. Still in "Credentials", click "Create Credentials" > "API Key"
2. Copy the API key
3. (Optional) Restrict the key:
   - Click on the API key to edit
   - Under "API restrictions", select "Restrict key"
   - Choose "Google Sheets API"

### Step 4: Update Configuration
1. Open `google-sheets.js` in a text editor
2. Replace the placeholder values in the CONFIG object:

```javascript
const CONFIG = {
    CLIENT_ID: 'your-actual-client-id.googleusercontent.com',
    API_KEY: 'your-actual-api-key',
    DISCOVERY_DOC: 'https://sheets.googleapis.com/$discovery/rest?version=v4',
    SCOPES: 'https://www.googleapis.com/auth/spreadsheets'
};
```

### Step 5: Test the Integration
1. Refresh the app in your browser
2. Go to Settings tab
3. Click "Connect Google Sheets"
4. Follow the authorization prompts
5. Once connected, your data will automatically sync!

## 🌐 Deployment Options

### Option 1: GitHub Pages (Free)
1. Upload your project to a GitHub repository
2. Go to repository Settings > Pages
3. Select source branch (usually `main`)
4. Your app will be available at `https://yourusername.github.io/repository-name`

### Option 2: Netlify (Free)
1. Sign up at [Netlify](https://netlify.com)
2. Drag and drop your project folder
3. Your app will be deployed instantly with a custom URL

### Option 3: Vercel (Free)
1. Sign up at [Vercel](https://vercel.com)
2. Import your project from GitHub or upload directly
3. Deploy with zero configuration

### Option 4: Firebase Hosting (Free tier)
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

## 📂 Project Structure

```
hours_project/
├── index.html          # Main app interface
├── style.css          # Responsive styling  
├── app.js             # Core application logic
├── google-sheets.js   # Google Sheets integration
├── sw.js              # Service Worker (PWA features)
├── manifest.json      # PWA manifest
├── README.md          # Project documentation
└── SETUP.md           # This setup guide
```

## ✨ Features

### Core Features
- ✅ **Fast Entry**: Quick form to log daily hours
- ✅ **Multiple Workplaces**: Track different jobs with different rates
- ✅ **Monthly Reports**: Automatic calculation of totals and earnings
- ✅ **Offline Support**: Works without internet connection
- ✅ **Mobile Optimized**: Responsive design for all devices

### PWA Features
- ✅ **Installable**: Add to home screen on mobile/desktop
- ✅ **Offline First**: Cached for offline use
- ✅ **Fast Loading**: Instant startup after first visit
- ✅ **Background Sync**: Syncs when connection returns

### Google Integration
- ✅ **Auto Sync**: Automatic backup to Google Sheets
- ✅ **Real-time**: Updates as you add entries
- ✅ **Organized**: Separate sheets for entries, workplaces, and summaries
- ✅ **Formatted**: Professional-looking spreadsheets

## 🔒 Privacy & Security

- **Local First**: All data stored locally by default
- **Your Control**: Google Sheets integration is optional
- **No Tracking**: No analytics or tracking code
- **Open Source**: All code is visible and auditable

## 🆘 Troubleshooting

### App Won't Install as PWA
- Make sure you're serving over HTTPS (or localhost)
- Check that `manifest.json` is accessible
- Try a different browser (Chrome/Edge work best)

### Google Sheets Won't Connect
- Verify your Client ID and API Key are correct
- Check that JavaScript origins match your domain exactly
- Make sure Google Sheets API is enabled in your project
- Try in an incognito/private browsing window

### Data Not Syncing
- Check your internet connection
- Look for error messages in browser console (F12)
- Try disconnecting and reconnecting Google Sheets
- Verify the spreadsheet wasn't deleted from your Google Drive

### App Not Working Offline
- Make sure you loaded the app online first
- Check that Service Worker registered successfully (look in DevTools > Application > Service Workers)
- Try refreshing the page once

## 🔄 Updating the App

To update to a newer version:
1. Replace the old files with new ones
2. Update the cache version in `sw.js` if needed
3. Hard refresh (Ctrl+F5) or clear browser cache
4. The Service Worker will update automatically

## 🆔 Data Export/Import

### Export Your Data
1. Go to Settings tab
2. Click "Export Data"
3. Save the JSON file as backup

### Import Data (Manual)
Currently, import your JSON backup by:
1. Opening browser DevTools (F12)
2. Go to Application > Local Storage
3. Manually restore the data keys

## 📞 Support

If you need help:
1. Check this setup guide first
2. Look for error messages in browser console
3. Try the troubleshooting steps above
4. Search for similar issues online

## 🔮 Future Enhancements

Possible future features:
- Data import functionality
- Multiple currency support
- Time tracking with start/stop
- Photo attachments for entries
- Team/sharing features
- Advanced reporting and charts

---

**Enjoy tracking your hours! 🎯**
