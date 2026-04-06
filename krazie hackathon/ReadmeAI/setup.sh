#!/bin/bash#!/bin/bash










































































echo "Happy coding! 🎉"echo ""echo "3. Open http://localhost:3000 in your browser"echo ""echo "   npm run dev"echo "   cd frontend"echo "2. Start the Frontend (in another terminal):"echo ""echo "   python app.py"echo "   source venv/bin/activate"echo "   cd backend"echo "1. Start the Backend:"echo ""echo "📖 Next Steps:"echo ""echo "=========================================="echo "✅ Setup Complete!"echo "=========================================="echo ""fi    echo "✅ .env file created (update with your settings)"    cp .env.example .envif [ ! -f ".env" ]; then# Copy environment fileecho "✅ Backend dependencies installed"pip install -r requirements.txt# Install dependenciessource venv/bin/activate# Activate virtual environmentfi    echo "✅ Virtual environment created"    python3 -m venv venvif [ ! -d "venv" ]; then# Create virtual environmentcd ../backendecho "🐍 Setting up Backend..."# Setup Backendecho ""echo "✅ Frontend ready!"npm installcd frontendecho "📦 Setting up Frontend..."# Setup Frontendecho ""echo "✅ Python version: $(python3 --version)"echo "✅ Node.js version: $(node --version)"fi    exit 1    echo "❌ Python 3 is not installed. Please install it first from https://python.org"if ! command -v python3 &> /dev/null; then# Check if Python is installedfi    exit 1    echo "❌ Node.js is not installed. Please install it first from https://nodejs.org"if ! command -v node &> /dev/null; then# Check if Node.js is installedecho ""echo "=========================================="echo "🚀 ReadmeAI - Smart README Generator Setup"# Run this script to set up the entire project# ReadmeAI Setup Script
# ReadmeAI Setup Script
# Run this script to set up both frontend and backend

echo "🚀 ReadmeAI Setup Script"
echo "========================"
echo ""

# Frontend Setup
echo "📦 Setting up Frontend..."
cd frontend
npm install
echo "✅ Frontend dependencies installed"
echo ""

# Backend Setup
echo "🐍 Setting up Backend..."
cd ../backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
echo "✅ Backend dependencies installed"

# Create .env file
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env file"
fi

cd ..

echo ""
echo "🎉 Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Terminal 1 - Start Frontend:"
echo "   cd frontend && npm run dev"
echo ""
echo "2. Terminal 2 - Start Backend:"
echo "   cd backend"
echo "   source venv/bin/activate"
echo "   python app.py"
echo ""
echo "3. Open http://localhost:3000"
echo ""
