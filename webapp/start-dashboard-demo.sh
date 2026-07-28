#!/bin/bash

# OrcaCloud - Dashboard Demo Script
# This script starts the frontend development server so you can test the dashboard

echo " Starting OrcaCloud Dashboard Demo"
echo "=============================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo " Error: Please run this script from the frontend directory"
    echo "   Navigate to: cd /home/atonixdev/orcacloud/frontend"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo " Installing dependencies..."
    npm install
fi

echo " Starting development server..."
echo ""
echo " Dashboard Features:"
echo "   • Professional left sidebar navigation"
echo "   • User profile section with avatar"
echo "   • Statistics cards with live data"
echo "   • Project management widgets"
echo "   • Task management system"
echo "   • Quick action buttons"
echo "   • Responsive design (mobile/desktop)"
echo ""
echo " Available Routes:"
echo "   • /dashboard - Main dashboard interface"
echo "   • /dashboard/analytics - Analytics view"
echo "   • /dashboard/tasks - Task management"
echo "   • /dashboard/my-projects - User projects"
echo "   • /dashboard/settings - User settings"
echo ""
echo " To test the dashboard:"
echo "   1. Open http://localhost:3000"
echo "   2. Click 'Sign In' (uses mock authentication)"
echo "   3. Navigate to Dashboard from user menu"
echo "   4. Or go directly to http://localhost:3000/dashboard"
echo ""
echo "  Press Ctrl+C to stop the server"
echo ""

# Start the development server
npm start