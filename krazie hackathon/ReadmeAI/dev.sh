#!/usr/bin/env bash

# ReadmeAI Development Environment Manager

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo ""
    echo -e "${BLUE}======================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}======================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

check_requirements() {
    print_header "Checking Requirements"
    
    # Check Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js installed: $NODE_VERSION"
    else
        print_error "Node.js not found. Install from https://nodejs.org"
        return 1
    fi
    
    # Check Python
    if command -v python3 &> /dev/null; then
        PYTHON_VERSION=$(python3 --version)
        print_success "Python 3 installed: $PYTHON_VERSION"
    else
        print_error "Python 3 not found. Install from https://python.org"
        return 1
    fi
    
    # Check npm
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        print_success "npm installed: $NPM_VERSION"
    else
        print_error "npm not found"
        return 1
    fi
}

setup_frontend() {
    print_header "Setting Up Frontend"
    
    if [ ! -d "frontend" ]; then
        print_error "frontend directory not found"
        return 1
    fi
    
    cd frontend
    
    if [ -d "node_modules" ]; then
        print_info "node_modules already exists"
    else
        print_info "Installing dependencies..."
        npm install
    fi
    
    print_success "Frontend setup complete"
    cd ..
}

setup_backend() {
    print_header "Setting Up Backend"
    
    if [ ! -d "backend" ]; then
        print_error "backend directory not found"
        return 1
    fi
    
    cd backend
    
    # Create virtual environment
    if [ ! -d "venv" ]; then
        print_info "Creating virtual environment..."
        python3 -m venv venv
    fi
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Install dependencies
    if [ -f "requirements.txt" ]; then
        print_info "Installing Python packages..."
        pip install -q -r requirements.txt
    fi
    
    # Copy env file
    if [ ! -f ".env" ]; then
        cp .env.example .env
        print_info "Created .env file"
    fi
    
    deactivate 2>/dev/null || true
    
    print_success "Backend setup complete"
    cd ..
}

start_backend() {
    print_header "Starting Backend"
    
    cd backend
    source venv/bin/activate
    
    if [ -f "app.py" ]; then
        print_info "Backend running on http://localhost:5000"
        print_info "Press Ctrl+C to stop"
        python app.py
    else
        print_error "app.py not found"
        cd ..
        return 1
    fi
}

start_frontend() {
    print_header "Starting Frontend"
    
    cd frontend
    
    if [ -d "node_modules" ]; then
        print_info "Frontend running on http://localhost:3000"
        print_info "Press Ctrl+C to stop"
        npm run dev
    else
        print_error "Dependencies not installed. Run: npm install"
        cd ..
        return 1
    fi
}

install_deps() {
    print_header "Installing Dependencies"
    
    setup_frontend
    setup_backend
    
    print_success "All dependencies installed"
    echo ""
    echo "Next: Run 'source dev.sh' then 'run' to start servers"
}

run_all() {
    print_header "Starting All Services"
    print_info "Backend and Frontend will run in separate processes"
    echo ""
    
    # Start backend in background
    (start_backend) &
    BACKEND_PID=$!
    sleep 2
    
    # Start frontend
    start_frontend
}

show_help() {
    cat << EOF
${BLUE}ReadmeAI Development Manager${NC}

Usage: ./dev.sh [COMMAND]

Commands:
  setup        Install all dependencies
  start        Start all services
  backend      Start only backend
  frontend     Start only frontend
  check        Check system requirements
  help         Show this help message

Examples:
  ./dev.sh setup       # First time setup
  ./dev.sh start       # Start all services
  ./dev.sh check       # Verify requirements

For more info, see README.md
EOF
}

# Main
case "${1:-help}" in
    setup)
        check_requirements && install_deps
        ;;
    start|run)
        run_all
        ;;
    backend)
        start_backend
        ;;
    frontend)
        start_frontend
        ;;
    check)
        check_requirements
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
