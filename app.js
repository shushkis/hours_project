// Hours Tracker PWA - Main Application Logic

class HoursTracker {
    constructor() {
        this.workplaces = this.loadData('workplaces') || [];
        this.entries = this.loadData('entries') || [];
        this.googleAuth = null;
        this.spreadsheetId = this.loadData('spreadsheetId') || null;
        
        this.initializeApp();
    }

    // Initialize the application
    initializeApp() {
        this.setupEventListeners();
        this.setupTabs();
        this.setDefaultDate();
        this.updateUI();
        this.registerServiceWorker();
    }

    // Setup event listeners
    setupEventListeners() {
        // Hours form submission
        document.getElementById('hoursForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.logHours();
        });

        // Workplace form submission
        document.getElementById('workplaceForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addWorkplace();
        });

        // Google Sheets connection
        document.getElementById('connectGoogle').addEventListener('click', () => {
            this.connectGoogleSheets();
        });

        // Manual sync
        document.getElementById('syncNow').addEventListener('click', () => {
            this.syncToGoogleSheets();
        });

        // Summary refresh
        document.getElementById('refreshSummary').addEventListener('click', () => {
            this.updateMonthlySummary();
        });

        // Data export
        document.getElementById('exportData').addEventListener('click', () => {
            this.exportData();
        });

        // Clear data
        document.getElementById('clearData').addEventListener('click', () => {
            this.clearAllData();
        });

        // Month selector change
        document.getElementById('summaryMonth').addEventListener('change', () => {
            this.updateMonthlySummary();
        });
    }

    // Setup tab navigation
    setupTabs() {
        const tabs = document.querySelectorAll('.nav-tab');
        const tabContents = document.querySelectorAll('.tab-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.getAttribute('data-tab');
                
                // Remove active class from all tabs and contents
                tabs.forEach(t => t.classList.remove('active'));
                tabContents.forEach(tc => tc.classList.remove('active'));
                
                // Add active class to clicked tab and corresponding content
                tab.classList.add('active');
                document.getElementById(`${targetTab}Tab`).classList.add('active');
                
                // Update specific tab content when activated
                if (targetTab === 'summary') {
                    this.updateMonthlySummary();
                }
            });
        });
    }

    // Set default date to today
    setDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('date').value = today;
        
        // Set default month for summary
        const currentMonth = new Date().toISOString().slice(0, 7);
        document.getElementById('summaryMonth').value = currentMonth;
    }

    // Generate UUID for entries
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Load data from localStorage
    loadData(key) {
        try {
            const data = localStorage.getItem(`hoursTracker_${key}`);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error loading data:', error);
            return null;
        }
    }

    // Save data to localStorage
    saveData(key, data) {
        try {
            localStorage.setItem(`hoursTracker_${key}`, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error saving data:', error);
            this.showNotification('Storage error. Please try again.', 'error');
            return false;
        }
    }

    // Log hours entry
    async logHours() {
        const form = document.getElementById('hoursForm');
        const formData = new FormData(form);
        
        const entry = {
            id: this.generateId(),
            date: formData.get('date'),
            workplace: formData.get('workplace'),
            hours: parseFloat(formData.get('hours')),
            notes: formData.get('notes') || '',
            timestamp: new Date().toISOString(),
            synced: false
        };

        // Validation
        if (!entry.workplace) {
            this.showNotification('Please select a workplace', 'error');
            return;
        }

        if (entry.hours <= 0 || entry.hours > 24) {
            this.showNotification('Hours must be between 0 and 24', 'error');
            return;
        }

        // Check for duplicate entries
        const existingEntry = this.entries.find(e => 
            e.date === entry.date && e.workplace === entry.workplace
        );
        
        if (existingEntry) {
            if (!confirm('An entry for this date and workplace already exists. Do you want to replace it?')) {
                return;
            }
            // Remove existing entry
            this.entries = this.entries.filter(e => e.id !== existingEntry.id);
        }

        // Add entry
        this.entries.unshift(entry);
        this.saveData('entries', this.entries);
        
        // Reset form
        form.reset();
        this.setDefaultDate();
        
        // Update UI
        this.updateRecentEntries();
        this.showNotification('Hours logged successfully!', 'success');
        
        // Auto-sync if connected
        if (this.googleAuth && this.spreadsheetId) {
            this.syncToGoogleSheets();
        }
    }

    // Add workplace
    addWorkplace() {
        const form = document.getElementById('workplaceForm');
        const formData = new FormData(form);
        
        const workplace = {
            id: this.generateId(),
            name: formData.get('workplaceName').trim(),
            hourlyRate: parseFloat(formData.get('hourlyRate')) || 0
        };

        // Validation
        if (!workplace.name) {
            this.showNotification('Please enter a workplace name', 'error');
            return;
        }

        if (this.workplaces.find(w => w.name.toLowerCase() === workplace.name.toLowerCase())) {
            this.showNotification('Workplace already exists', 'error');
            return;
        }

        // Add workplace
        this.workplaces.push(workplace);
        this.saveData('workplaces', this.workplaces);
        
        // Reset form
        form.reset();
        
        // Update UI
        this.updateWorkplacesList();
        this.updateWorkplaceDropdown();
        this.showNotification('Workplace added successfully!', 'success');
    }

    // Remove workplace
    removeWorkplace(workplaceId) {
        if (!confirm('Are you sure you want to remove this workplace? This cannot be undone.')) {
            return;
        }

        this.workplaces = this.workplaces.filter(w => w.id !== workplaceId);
        this.saveData('workplaces', this.workplaces);
        
        this.updateWorkplacesList();
        this.updateWorkplaceDropdown();
        this.showNotification('Workplace removed', 'success');
    }

    // Remove entry
    removeEntry(entryId) {
        if (!confirm('Are you sure you want to remove this entry?')) {
            return;
        }

        this.entries = this.entries.filter(e => e.id !== entryId);
        this.saveData('entries', this.entries);
        
        this.updateRecentEntries();
        this.showNotification('Entry removed', 'success');
    }

    // Update UI components
    updateUI() {
        this.updateWorkplaceDropdown();
        this.updateWorkplacesList();
        this.updateRecentEntries();
        this.updateMonthlySummary();
        this.updateSyncStatus();
    }

    // Update workplace dropdown
    updateWorkplaceDropdown() {
        const select = document.getElementById('workplace');
        select.innerHTML = '<option value="">Select workplace...</option>';
        
        this.workplaces.forEach(workplace => {
            const option = document.createElement('option');
            option.value = workplace.name;
            option.textContent = workplace.name;
            select.appendChild(option);
        });
    }

    // Update workplaces list
    updateWorkplacesList() {
        const container = document.getElementById('workplacesList');
        
        if (this.workplaces.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🏢</div>
                    <p>No workplaces added yet.<br>Add your first workplace above.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.workplaces.map(workplace => `
            <div class="workplace-item">
                <div class="workplace-info">
                    <div class="workplace-name">${this.escapeHtml(workplace.name)}</div>
                    <div class="workplace-rate">$${workplace.hourlyRate.toFixed(2)}/hour</div>
                </div>
                <div class="workplace-actions">
                    <button class="btn btn-danger btn-small" onclick="hoursTracker.removeWorkplace('${workplace.id}')">
                        <span class="btn-icon">🗑️</span>
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Update recent entries
    updateRecentEntries() {
        const container = document.getElementById('recentEntries');
        const recentEntries = this.entries.slice(0, 10);
        
        if (recentEntries.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📝</div>
                    <p>No entries yet.<br>Log your first hours above.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = recentEntries.map(entry => {
            const workplace = this.workplaces.find(w => w.name === entry.workplace);
            const earnings = workplace ? (entry.hours * workplace.hourlyRate).toFixed(2) : '0.00';
            
            return `
                <div class="entry-item">
                    <div class="entry-info">
                        <div class="entry-date">${this.formatDate(entry.date)}</div>
                        <div class="entry-workplace">${this.escapeHtml(entry.workplace)}</div>
                        <div class="entry-hours">${entry.hours}h • $${earnings}</div>
                    </div>
                    <div class="entry-actions">
                        <button class="btn btn-danger btn-small" onclick="hoursTracker.removeEntry('${entry.id}')">
                            <span class="btn-icon">🗑️</span>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Update monthly summary
    updateMonthlySummary() {
        const container = document.getElementById('monthlySummary');
        const selectedMonth = document.getElementById('summaryMonth').value;
        
        if (!selectedMonth) {
            container.innerHTML = '<p>Please select a month</p>';
            return;
        }

        const monthEntries = this.entries.filter(entry => 
            entry.date.startsWith(selectedMonth)
        );

        if (monthEntries.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📊</div>
                    <p>No entries for ${this.formatMonth(selectedMonth)}</p>
                </div>
            `;
            return;
        }

        // Group by workplace
        const summary = {};
        let totalHours = 0;
        let totalEarnings = 0;

        monthEntries.forEach(entry => {
            if (!summary[entry.workplace]) {
                const workplace = this.workplaces.find(w => w.name === entry.workplace);
                summary[entry.workplace] = {
                    hours: 0,
                    hourlyRate: workplace ? workplace.hourlyRate : 0,
                    earnings: 0
                };
            }
            
            summary[entry.workplace].hours += entry.hours;
            summary[entry.workplace].earnings += entry.hours * summary[entry.workplace].hourlyRate;
            totalHours += entry.hours;
            totalEarnings += entry.hours * summary[entry.workplace].hourlyRate;
        });

        const summaryItems = Object.entries(summary).map(([workplace, data]) => `
            <div class="summary-item">
                <div class="summary-workplace">${this.escapeHtml(workplace)}</div>
                <div class="summary-details">
                    <div class="summary-hours">${data.hours}h</div>
                    <div class="summary-earnings">$${data.earnings.toFixed(2)}</div>
                </div>
            </div>
        `).join('');

        container.innerHTML = `
            ${summaryItems}
            <div class="summary-total">
                <div class="summary-item">
                    <div class="summary-workplace">Total</div>
                    <div class="summary-details">
                        <div class="summary-hours">${totalHours}h</div>
                        <div class="summary-earnings">$${totalEarnings.toFixed(2)}</div>
                    </div>
                </div>
            </div>
        `;
    }

    // Update sync status
    updateSyncStatus() {
        const statusElement = document.getElementById('syncStatus');
        const googleStatusElement = document.getElementById('googleStatus');
        const connectBtn = document.getElementById('connectGoogle');
        const syncBtn = document.getElementById('syncNow');

        if (this.googleAuth && this.spreadsheetId) {
            statusElement.querySelector('.sync-text').textContent = 'Connected';
            googleStatusElement.textContent = 'Connected to Google Sheets';
            googleStatusElement.className = 'status-text success';
            connectBtn.style.display = 'none';
            syncBtn.style.display = 'inline-flex';
        } else {
            statusElement.querySelector('.sync-text').textContent = 'Not synced';
            googleStatusElement.textContent = 'Not connected';
            googleStatusElement.className = 'status-text';
            connectBtn.style.display = 'inline-flex';
            syncBtn.style.display = 'none';
        }
    }

    // Export data as JSON
    exportData() {
        const data = {
            workplaces: this.workplaces,
            entries: this.entries,
            exportDate: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `hours-tracker-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        this.showNotification('Data exported successfully!', 'success');
    }

    // Clear all data
    clearAllData() {
        if (!confirm('Are you sure you want to clear all data? This cannot be undone.')) {
            return;
        }

        if (!confirm('This will delete all workplaces and entries. Are you absolutely sure?')) {
            return;
        }

        this.workplaces = [];
        this.entries = [];
        this.spreadsheetId = null;
        
        localStorage.removeItem('hoursTracker_workplaces');
        localStorage.removeItem('hoursTracker_entries');
        localStorage.removeItem('hoursTracker_spreadsheetId');
        
        this.updateUI();
        this.showNotification('All data cleared', 'success');
    }

    // Register service worker for PWA
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                await navigator.serviceWorker.register('./sw.js');
                console.log('Service Worker registered successfully');
            } catch (error) {
                console.log('Service Worker registration failed:', error);
            }
        }
    }

    // Utility functions
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    formatDate(dateString) {
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
        });
    }

    formatMonth(monthString) {
        const [year, month] = monthString.split('-');
        const date = new Date(year, month - 1);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long' 
        });
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#34a853' : type === 'error' ? '#ea4335' : '#4285f4'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 1001;
            font-weight: 500;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 300px;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);
        
        // Animate out and remove
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    // Google Sheets integration methods (will be implemented in google-sheets.js)
    async connectGoogleSheets() {
        if (window.GoogleSheetsAPI) {
            try {
                await window.GoogleSheetsAPI.initialize();
                this.googleAuth = window.GoogleSheetsAPI.isSignedIn();
                if (this.googleAuth) {
                    await this.setupSpreadsheet();
                }
                this.updateSyncStatus();
            } catch (error) {
                this.showNotification('Failed to connect to Google Sheets', 'error');
                console.error('Google Sheets connection error:', error);
            }
        } else {
            this.showNotification('Google Sheets API not loaded', 'error');
        }
    }

    async setupSpreadsheet() {
        // Implementation will be in google-sheets.js
        if (window.GoogleSheetsAPI && window.GoogleSheetsAPI.setupSpreadsheet) {
            this.spreadsheetId = await window.GoogleSheetsAPI.setupSpreadsheet();
            this.saveData('spreadsheetId', this.spreadsheetId);
        }
    }

    async syncToGoogleSheets() {
        // Implementation will be in google-sheets.js
        if (window.GoogleSheetsAPI && this.spreadsheetId) {
            this.showSyncingStatus(true);
            try {
                await window.GoogleSheetsAPI.syncData(this.entries, this.workplaces);
                this.showNotification('Data synced to Google Sheets', 'success');
            } catch (error) {
                this.showNotification('Sync failed', 'error');
                console.error('Sync error:', error);
            }
            this.showSyncingStatus(false);
        }
    }

    showSyncingStatus(syncing) {
        const statusElement = document.getElementById('syncStatus');
        const loadingOverlay = document.getElementById('loadingOverlay');
        
        if (syncing) {
            statusElement.classList.add('syncing');
            statusElement.querySelector('.sync-text').textContent = 'Syncing...';
            loadingOverlay.style.display = 'flex';
        } else {
            statusElement.classList.remove('syncing');
            statusElement.querySelector('.sync-text').textContent = 'Connected';
            loadingOverlay.style.display = 'none';
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.hoursTracker = new HoursTracker();
});
