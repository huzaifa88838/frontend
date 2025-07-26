/**
 * Markets API Routes
 * Handles all market-related API endpoints
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const config = require('../config');

// Mock data for popular markets (fallback)
const mockPopularMarkets = [
  {
    id: '1.123456789',
    name: 'Manchester United v Arsenal',
    sport: 'Soccer',
    country: 'United Kingdom',
    competition: 'Premier League',
    marketStartTime: '2025-07-05T15:00:00.000Z',
    total_matched: 2500000.75
  },
  {
    id: '1.123456790',
    name: 'Liverpool v Chelsea',
    sport: 'Soccer',
    country: 'United Kingdom',
    competition: 'Premier League',
    marketStartTime: '2025-07-06T16:30:00.000Z',
    total_matched: 1800000.50
  },
  {
    id: '1.123456791',
    name: 'Real Madrid v Barcelona',
    sport: 'Soccer',
    country: 'Spain',
    competition: 'La Liga',
    marketStartTime: '2025-07-05T19:00:00.000Z',
    total_matched: 3200000.25
  },
  {
    id: '1.123456792',
    name: 'Novak Djokovic v Rafael Nadal',
    sport: 'Tennis',
    country: 'United Kingdom',
    competition: 'Wimbledon',
    marketStartTime: '2025-07-07T13:00:00.000Z',
    total_matched: 1200000.00
  },
  {
    id: '1.123456793',
    name: 'Los Angeles Lakers v Boston Celtics',
    sport: 'Basketball',
    country: 'USA',
    competition: 'NBA',
    marketStartTime: '2025-07-08T00:00:00.000Z',
    total_matched: 950000.50
  }
];

/**
 * @route   GET /api/Markets/popular
 * @desc    Get popular markets across all sports
 * @access  Public
 */
router.get('/popular', async (req, res) => {
  try {
    console.log('Fetching popular markets...');
    
    // Try to get markets from database
    const db = mongoose.connection.db;
    
    // Check if markets collection exists
    const collections = await db.listCollections({ name: 'markets' }).toArray();
    if (collections.length > 0) {
      console.log('Markets collection found, fetching data...');
      
      // Get markets from database
      const markets = await db.collection('markets')
        .find({ is_popular: true })
        .limit(10)
        .toArray();
      
      if (markets && markets.length > 0) {
        console.log(`Found ${markets.length} popular markets in database`);
        
        // Return markets from database
        return res.json({
          status: 'success',
          data: markets.map(market => ({
            ...market,
            _id: undefined // Remove MongoDB ID
          }))
        });
      }
    }
    
    // If no markets in database, use mock data
    console.log('No markets found in database, using mock data');
    
    return res.json({
      status: 'success',
      data: mockPopularMarkets
    });
  } catch (error) {
    console.error('Error fetching popular markets:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to get popular markets',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/Markets/:marketId
 * @desc    Get specific market by ID
 * @access  Public
 */
router.get('/:marketId', async (req, res) => {
  try {
    const marketId = req.params.marketId;
    console.log(`Fetching market with ID: ${marketId}`);
    
    // Try to get market from database
    const db = mongoose.connection.db;
    
    // Check if markets collection exists
    const collections = await db.listCollections({ name: 'markets' }).toArray();
    if (collections.length > 0) {
      console.log('Markets collection found, fetching data...');
      
      // Get market from database
      const market = await db.collection('markets').findOne({ id: marketId });
      
      if (market) {
        console.log(`Found market ${marketId} in database`);
        
        // Remove MongoDB ID
        const { _id, ...marketData } = market;
        
        // Return market from database
        return res.json({
          status: 'success',
          data: marketData
        });
      }
    }
    
    // If market not found in database, check mock data
    const mockMarket = mockPopularMarkets.find(m => m.id === marketId);
    
    if (mockMarket) {
      console.log(`Found mock market for ID ${marketId}`);
      return res.json({
        status: 'success',
        data: {
          ...mockMarket,
          description: `${mockMarket.sport} - ${mockMarket.name}`,
          inPlay: false,
          numberOfRunners: 3,
          numberOfWinners: 1,
          totalMatched: mockMarket.total_matched,
          runners: [
            {
              selectionId: 1,
              runnerName: mockMarket.name.split(' v ')[0],
              handicap: 0,
              sortPriority: 1
            },
            {
              selectionId: 2,
              runnerName: 'Draw',
              handicap: 0,
              sortPriority: 2
            },
            {
              selectionId: 3,
              runnerName: mockMarket.name.split(' v ')[1]?.split(' / ')[0] || 'Away',
              handicap: 0,
              sortPriority: 3
            }
          ]
        }
      });
    }
    
    // Market not found
    return res.status(404).json({
      status: 'error',
      message: `Market with ID ${marketId} not found`
    });
  } catch (error) {
    console.error(`Error fetching market ${req.params.marketId}:`, error);
    return res.status(500).json({
      status: 'error',
      message: `Failed to get market ${req.params.marketId}`,
      error: error.message
    });
  }
});

module.exports = router;
