/**
 * Market Data Handler
 * Handles real-time market data fetching and display across the BetPro Exchange platform
 */

// Define the MarketDataHandler in the global scope
window.MarketDataHandler = class MarketDataHandler {
    constructor(options = {}) {
        // Default configuration
        this.config = {
            containerId: 'Bookmarkets',
            endpoint: '/api/markets/popular',
            refreshInterval: 30000, // 30 seconds
            onDataReceived: null,
            showTimestamp: true,
            ...options
        };
        
        this.lastUpdate = null;
        this.isLoading = false;
        this.marketData = [];
        this.container = document.getElementById(this.config.containerId);
        
        // Initialize
        if (this.container) {
            this.init();
        } else {
            console.error(`Container with ID "${this.config.containerId}" not found`);
        }
    }
    
    init() {
        // Initial data load
        this.fetchMarketData();
        
        // Set up interval for real-time updates
        if (this.config.refreshInterval > 0) {
            this.refreshInterval = setInterval(() => {
                this.fetchMarketData();
            }, this.config.refreshInterval);
        }
        
        // Add loading indicator to container
        this.container.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>';
    }
    
    fetchMarketData() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        
        // Add a timestamp parameter to prevent caching
        const timestamp = new Date().getTime();
        const url = `${this.config.endpoint}?_=${timestamp}`;
        
        console.log(`Fetching market data from: ${url}`);
        
        // Fetch data from API endpoint
        fetch(url, {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                this.isLoading = false;
                this.lastUpdate = new Date();
                
                // Process the data
                if (data && data.status === 'success' && data.data) {
                    console.log(`Received ${data.data.length} markets from API`);
                    this.marketData = data.data;
                    this.renderMarketData();
                    
                    // Call the callback if provided
                    if (typeof this.config.onDataReceived === 'function') {
                        this.config.onDataReceived(this.marketData);
                    }
                } else {
                    console.error('Invalid data format received:', data);
                    throw new Error('Invalid data format received from API');
                }
            })
            .catch(error => {
                this.isLoading = false;
                console.error('Error fetching market data:', error);
                
                // Show error in container
                this.container.innerHTML = `
                    <div class="alert alert-danger">
                        Failed to load market data: ${error.message}. 
                        <button class="btn btn-sm btn-outline-danger ms-2" onclick="marketDataHandler.fetchMarketData()">
                            Retry
                        </button>
                    </div>
                `;
            });
    }
    
    renderMarketData() {
        if (!this.container) return;
        
        // Check if we have data
        if (!this.marketData || this.marketData.length === 0) {
            this.container.innerHTML = `
                <div class="alert alert-warning">
                    No market data available. 
                    <button class="btn btn-sm btn-outline-warning ms-2" onclick="marketDataHandler.fetchMarketData()">
                        Refresh
                    </button>
                </div>
            `;
            return;
        }
        
        // Group markets by sport
        const marketsBySport = {};
        this.marketData.forEach(market => {
            const sportName = market.sport || 'Other';
            if (!marketsBySport[sportName]) {
                marketsBySport[sportName] = [];
            }
            marketsBySport[sportName].push(market);
        });
        
        // Check if we're using mock data
        const isMockData = this.marketData.some(market => market.source === 'mock') || 
                          window.location.href.includes('mock=true');
        
        // Create title element
        let html = `
            <div class="mb-4">
                <h3 class="text-center">Sport Highlights</h3>
                ${isMockData ? '<div class="alert alert-info">Using mock data for demonstration</div>' : ''}
                <hr>
            </div>
        `;
        
        // Build the table for each sport
        Object.keys(marketsBySport).forEach(sport => {
            html += `
                <div class="mb-4">
                    <h4>${sport}</h4>
                    <table class="table table-striped table-hover">
                        <thead>
                            <tr>
                                <th>Market</th>
                                <th class="text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            // Add rows for each market in this sport
            marketsBySport[sport].forEach(market => {
                // Format the total matched amount with commas
                const formattedAmount = market.total_matched ? market.total_matched.toLocaleString() : '0';
                
                html += `
                    <tr>
                        <td>
                            <a href="/Markets/#!${market.id}" class="market-link">
                                ${market.name}
                            </a>
                        </td>
                        <td class="text-right">${formattedAmount}</td>
                    </tr>
                `;
            });
            
            html += `
                        </tbody>
                    </table>
                </div>
            `;
        });
        
        // Add timestamp if enabled
        if (this.config.showTimestamp && this.lastUpdate) {
            const formattedTime = this.lastUpdate.toLocaleTimeString();
            html += `
                <div class="text-muted small text-right">
                    <i class="fas fa-sync-alt me-1"></i> Updated: ${formattedTime}
                    <button class="btn btn-sm btn-outline-primary ms-2" onclick="marketDataHandler.fetchMarketData()">
                        Refresh Now
                    </button>
                </div>
            `;
        }
        
        // Update the container
        this.container.innerHTML = html;
        
        // Convert all times to client timezone if the function exists
        if (typeof convertAllToClientTime === 'function') {
            convertAllToClientTime();
        }
    }
    
    // Stop the automatic refresh
    stop() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }
    
    // Manually refresh the data
    refresh() {
        this.fetchMarketData();
    }
};

// Global instance that can be used across the site
let marketDataHandler;

// Initialize market data on document ready if jQuery is available
if (typeof jQuery !== 'undefined') {
    jQuery(document).ready(() => {
        // Check if the container exists on this page
        if (document.getElementById('Bookmarkets')) {
            marketDataHandler = new MarketDataHandler();
        }
    });
}
