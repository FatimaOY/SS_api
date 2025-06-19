# PowerShell script to start the API server
Write-Host "Starting SS API Server..." -ForegroundColor Green

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file from template..." -ForegroundColor Yellow
    Copy-Item "-PC-chad.env" ".env"
}

# Start the server
Write-Host "Starting server on port 3000..." -ForegroundColor Green
node app.js 