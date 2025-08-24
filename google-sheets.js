// Google Sheets API Integration for Hours Tracker

// Configuration - You'll need to replace these with your actual Google API credentials
const CONFIG = {
    // Get these from Google Cloud Console
    CLIENT_ID: 'your-client-id.googleusercontent.com',
    API_KEY: 'your-api-key',
    DISCOVERY_DOC: 'https://sheets.googleapis.com/$discovery/rest?version=v4',
    SCOPES: 'https://www.googleapis.com/auth/spreadsheets'
};

class GoogleSheetsAPI {
    constructor() {
        this.isInitialized = false;
        this.isAuthorized = false;
        this.spreadsheetId = null;
    }

    // Initialize the Google API
    async initialize() {
        return new Promise((resolve, reject) => {
            if (this.isInitialized) {
                resolve();
                return;
            }

            // Check if credentials are configured
            if (CONFIG.CLIENT_ID === 'your-client-id.googleusercontent.com') {
                reject(new Error('Google API credentials not configured. Please update CONFIG in google-sheets.js'));
                return;
            }

            gapi.load('client:auth2', async () => {
                try {
                    await gapi.client.init({
                        apiKey: CONFIG.API_KEY,
                        clientId: CONFIG.CLIENT_ID,
                        discoveryDocs: [CONFIG.DISCOVERY_DOC],
                        scope: CONFIG.SCOPES
                    });

                    this.isInitialized = true;
                    
                    // Check if user is already signed in
                    const authInstance = gapi.auth2.getAuthInstance();
                    this.isAuthorized = authInstance.isSignedIn.get();
                    
                    if (!this.isAuthorized) {
                        // Prompt user to sign in
                        await authInstance.signIn();
                        this.isAuthorized = authInstance.isSignedIn.get();
                    }

                    resolve();
                } catch (error) {
                    console.error('Error initializing Google API:', error);
                    reject(error);
                }
            });
        });
    }

    // Check if user is signed in
    isSignedIn() {
        if (!this.isInitialized) return false;
        return gapi.auth2.getAuthInstance().isSignedIn.get();
    }

    // Sign out user
    async signOut() {
        if (this.isInitialized) {
            await gapi.auth2.getAuthInstance().signOut();
            this.isAuthorized = false;
        }
    }

    // Create or find the Hours Tracker spreadsheet
    async setupSpreadsheet() {
        try {
            // First, try to find existing Hours Tracker spreadsheet
            const existingSpreadsheet = await this.findSpreadsheet('Hours Tracker');
            
            if (existingSpreadsheet) {
                this.spreadsheetId = existingSpreadsheet.id;
                console.log('Found existing Hours Tracker spreadsheet:', this.spreadsheetId);
                return this.spreadsheetId;
            }

            // Create new spreadsheet if not found
            const response = await gapi.client.sheets.spreadsheets.create({
                properties: {
                    title: 'Hours Tracker'
                },
                sheets: [
                    {
                        properties: {
                            title: 'Time Entries',
                            gridProperties: {
                                frozenRowCount: 1
                            }
                        }
                    },
                    {
                        properties: {
                            title: 'Workplaces'
                        }
                    },
                    {
                        properties: {
                            title: 'Monthly Summary'
                        }
                    }
                ]
            });

            this.spreadsheetId = response.result.spreadsheetId;
            console.log('Created new Hours Tracker spreadsheet:', this.spreadsheetId);

            // Set up headers
            await this.setupHeaders();
            
            return this.spreadsheetId;
        } catch (error) {
            console.error('Error setting up spreadsheet:', error);
            throw error;
        }
    }

    // Find spreadsheet by title
    async findSpreadsheet(title) {
        try {
            // Note: This requires Google Drive API to be enabled
            // For simplicity, we'll skip this and always create new spreadsheet
            return null;
        } catch (error) {
            console.log('Could not search for existing spreadsheet:', error);
            return null;
        }
    }

    // Set up headers for the spreadsheet
    async setupHeaders() {
        try {
            // Time Entries headers
            await gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: this.spreadsheetId,
                range: 'Time Entries!A1:F1',
                valueInputOption: 'RAW',
                resource: {
                    values: [['Date', 'Workplace', 'Hours', 'Notes', 'Timestamp', 'Earnings']]
                }
            });

            // Workplaces headers
            await gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: this.spreadsheetId,
                range: 'Workplaces!A1:C1',
                valueInputOption: 'RAW',
                resource: {
                    values: [['Workplace', 'Hourly Rate', 'Total Hours']]
                }
            });

            // Format headers
            await gapi.client.sheets.spreadsheets.batchUpdate({
                spreadsheetId: this.spreadsheetId,
                resource: {
                    requests: [
                        {
                            repeatCell: {
                                range: {
                                    sheetId: 0,
                                    startRowIndex: 0,
                                    endRowIndex: 1
                                },
                                cell: {
                                    userEnteredFormat: {
                                        backgroundColor: { red: 0.26, green: 0.52, blue: 0.96 },
                                        textFormat: {
                                            foregroundColor: { red: 1.0, green: 1.0, blue: 1.0 },
                                            bold: true
                                        }
                                    }
                                },
                                fields: 'userEnteredFormat(backgroundColor,textFormat)'
                            }
                        }
                    ]
                }
            });

            console.log('Headers set up successfully');
        } catch (error) {
            console.error('Error setting up headers:', error);
            throw error;
        }
    }

    // Sync data to Google Sheets
    async syncData(entries, workplaces) {
        if (!this.spreadsheetId || !this.isAuthorized) {
            throw new Error('Not connected to Google Sheets');
        }

        try {
            // Clear existing data (except headers)
            await this.clearSheetData('Time Entries', 'A2:F');
            await this.clearSheetData('Workplaces', 'A2:C');

            // Sync time entries
            if (entries.length > 0) {
                const entryData = entries.map(entry => {
                    const workplace = workplaces.find(w => w.name === entry.workplace);
                    const earnings = workplace ? (entry.hours * workplace.hourlyRate).toFixed(2) : '0.00';
                    
                    return [
                        entry.date,
                        entry.workplace,
                        entry.hours,
                        entry.notes,
                        new Date(entry.timestamp).toLocaleString(),
                        `$${earnings}`
                    ];
                });

                await gapi.client.sheets.spreadsheets.values.update({
                    spreadsheetId: this.spreadsheetId,
                    range: `Time Entries!A2:F${entryData.length + 1}`,
                    valueInputOption: 'RAW',
                    resource: {
                        values: entryData
                    }
                });
            }

            // Sync workplaces with total hours
            if (workplaces.length > 0) {
                const workplaceData = workplaces.map(workplace => {
                    const totalHours = entries
                        .filter(e => e.workplace === workplace.name)
                        .reduce((sum, e) => sum + e.hours, 0);
                    
                    return [
                        workplace.name,
                        `$${workplace.hourlyRate.toFixed(2)}`,
                        `${totalHours}h`
                    ];
                });

                await gapi.client.sheets.spreadsheets.values.update({
                    spreadsheetId: this.spreadsheetId,
                    range: `Workplaces!A2:C${workplaceData.length + 1}`,
                    valueInputOption: 'RAW',
                    resource: {
                        values: workplaceData
                    }
                });
            }

            // Generate monthly summary
            await this.generateMonthlySummary(entries, workplaces);

            console.log('Data synced successfully');
        } catch (error) {
            console.error('Error syncing data:', error);
            throw error;
        }
    }

    // Generate monthly summary
    async generateMonthlySummary(entries, workplaces) {
        try {
            // Clear existing summary
            await this.clearSheetData('Monthly Summary', 'A:E');

            // Group entries by month and workplace
            const monthlyData = {};
            
            entries.forEach(entry => {
                const monthKey = entry.date.substring(0, 7); // YYYY-MM
                if (!monthlyData[monthKey]) {
                    monthlyData[monthKey] = {};
                }
                
                if (!monthlyData[monthKey][entry.workplace]) {
                    monthlyData[monthKey][entry.workplace] = {
                        hours: 0,
                        earnings: 0
                    };
                }
                
                const workplace = workplaces.find(w => w.name === entry.workplace);
                const hourlyRate = workplace ? workplace.hourlyRate : 0;
                
                monthlyData[monthKey][entry.workplace].hours += entry.hours;
                monthlyData[monthKey][entry.workplace].earnings += entry.hours * hourlyRate;
            });

            // Convert to spreadsheet format
            const summaryData = [['Month', 'Workplace', 'Hours', 'Earnings', 'Total']];
            
            Object.entries(monthlyData)
                .sort(([a], [b]) => b.localeCompare(a)) // Sort by month descending
                .forEach(([month, workplaces]) => {
                    let monthTotal = 0;
                    let monthTotalEarnings = 0;
                    
                    Object.entries(workplaces).forEach(([workplace, data]) => {
                        summaryData.push([
                            month,
                            workplace,
                            `${data.hours}h`,
                            `$${data.earnings.toFixed(2)}`,
                            ''
                        ]);
                        
                        monthTotal += data.hours;
                        monthTotalEarnings += data.earnings;
                    });
                    
                    // Add month total
                    summaryData.push([
                        '',
                        `${month} Total`,
                        `${monthTotal}h`,
                        `$${monthTotalEarnings.toFixed(2)}`,
                        '✓'
                    ]);
                    
                    // Add empty row for separation
                    summaryData.push(['', '', '', '', '']);
                });

            if (summaryData.length > 1) {
                await gapi.client.sheets.spreadsheets.values.update({
                    spreadsheetId: this.spreadsheetId,
                    range: `Monthly Summary!A1:E${summaryData.length}`,
                    valueInputOption: 'RAW',
                    resource: {
                        values: summaryData
                    }
                });

                // Format the summary sheet
                await this.formatMonthlySummary(summaryData.length);
            }
        } catch (error) {
            console.error('Error generating monthly summary:', error);
        }
    }

    // Format the monthly summary sheet
    async formatMonthlySummary(dataLength) {
        try {
            await gapi.client.sheets.spreadsheets.batchUpdate({
                spreadsheetId: this.spreadsheetId,
                resource: {
                    requests: [
                        // Format header row
                        {
                            repeatCell: {
                                range: {
                                    sheetId: 2, // Monthly Summary sheet
                                    startRowIndex: 0,
                                    endRowIndex: 1
                                },
                                cell: {
                                    userEnteredFormat: {
                                        backgroundColor: { red: 0.26, green: 0.52, blue: 0.96 },
                                        textFormat: {
                                            foregroundColor: { red: 1.0, green: 1.0, blue: 1.0 },
                                            bold: true
                                        }
                                    }
                                },
                                fields: 'userEnteredFormat(backgroundColor,textFormat)'
                            }
                        }
                    ]
                }
            });
        } catch (error) {
            console.error('Error formatting monthly summary:', error);
        }
    }

    // Clear sheet data
    async clearSheetData(sheetName, range) {
        try {
            await gapi.client.sheets.spreadsheets.values.clear({
                spreadsheetId: this.spreadsheetId,
                range: `${sheetName}!${range}`
            });
        } catch (error) {
            console.log(`Could not clear ${sheetName} data:`, error);
        }
    }

    // Get spreadsheet URL
    getSpreadsheetUrl() {
        if (this.spreadsheetId) {
            return `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}`;
        }
        return null;
    }
}

// Create global instance
window.GoogleSheetsAPI = new GoogleSheetsAPI();

// Development mode placeholder
if (CONFIG.CLIENT_ID === 'your-client-id.googleusercontent.com') {
    console.warn(`
    🔧 GOOGLE SHEETS SETUP REQUIRED 🔧
    
    To enable Google Sheets sync:
    
    1. Go to Google Cloud Console (console.cloud.google.com)
    2. Create a new project or select existing one
    3. Enable the Google Sheets API
    4. Create OAuth 2.0 credentials:
       - Application type: Web application
       - Authorized JavaScript origins: your domain (e.g., http://localhost:8080)
    5. Copy your Client ID and API Key
    6. Update the CONFIG object in google-sheets.js
    
    For now, the app will work with local storage only.
    `);

    // Provide mock implementation for development
    window.GoogleSheetsAPI = {
        initialize: () => Promise.reject(new Error('Google Sheets not configured')),
        isSignedIn: () => false,
        setupSpreadsheet: () => Promise.reject(new Error('Google Sheets not configured')),
        syncData: () => Promise.reject(new Error('Google Sheets not configured'))
    };
}
