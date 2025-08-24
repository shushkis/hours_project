# Hours Tracker PWA

A Progressive Web App for tracking work hours across multiple workplaces with Google Sheets integration.

## Features

- 📱 Mobile-optimized interface
- 🔄 Real-time sync with Google Sheets
- 📊 Monthly reporting and summaries
- 💾 Offline functionality
- 🏠 Installable as a home screen app

## Project Structure

```
hours_project/
├── index.html          # Main app interface
├── style.css          # Responsive styling
├── app.js             # Core application logic
├── google-sheets.js   # Google Sheets API integration
├── sw.js              # Service worker for PWA features
├── manifest.json      # PWA manifest
└── README.md          # This file
```

## Data Structure

### Google Sheets Format
The app creates/uses a Google Sheet with the following columns:
- Date (YYYY-MM-DD)
- Workplace
- Hours Worked
- Hourly Rate (optional)
- Notes (optional)
- Timestamp

### Local Storage Schema
```javascript
{
  workplaces: [
    { name: "Company A", hourlyRate: 25 },
    { name: "Company B", hourlyRate: 30 }
  ],
  entries: [
    {
      id: "uuid",
      date: "2025-08-23",
      workplace: "Company A",
      hours: 8,
      notes: "Regular work day",
      synced: true
    }
  ]
}
```

## Setup Instructions

1. Enable Google Sheets API in Google Cloud Console
2. Create OAuth 2.0 credentials
3. Update `google-sheets.js` with your credentials
4. Open `index.html` in a web browser
5. Install as PWA on mobile device

## Usage

1. **Add Workplaces**: Configure your workplaces and hourly rates
2. **Log Hours**: Quick entry form for daily hours
3. **View Summary**: Monthly totals for each workplace
4. **Sync**: Automatic sync with Google Sheets
