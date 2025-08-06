#!/bin/bash

# Post-build release script for @langchain/langgraph-api
# This script clones the current repo to a temp folder, completely resets the release branch,
# and pushes only the dist folder, package.json, and lock files

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}🔄 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Get current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
TEMP_DIR="$PROJECT_DIR/temp-release"

# Get current version from package.json
get_version() {
    if [ -f "$PROJECT_DIR/package.json" ]; then
        VERSION=$(node -p "require('$PROJECT_DIR/package.json').version")
        echo "$VERSION"
    else
        print_error "package.json not found"
        exit 1
    fi
}

# Check if dist folder exists
check_dist() {
    if [ ! -d "$PROJECT_DIR/dist" ]; then
        print_error "dist folder does not exist. Please run the build first."
        exit 1
    fi
    print_success "dist folder found"
}

# Check if lock files exist
check_lock_files() {
    if [ ! -f "$PROJECT_DIR/yarn.lock" ] && [ ! -f "$PROJECT_DIR/package-lock.json" ]; then
        print_warning "No lock files found (yarn.lock or package-lock.json)"
    else
        if [ -f "$PROJECT_DIR/yarn.lock" ]; then
            print_success "yarn.lock found"
        fi
        if [ -f "$PROJECT_DIR/package-lock.json" ]; then
            print_success "package-lock.json found"
        fi
    fi
}

# Clean up temp directory
cleanup() {
    if [ -d "$TEMP_DIR" ]; then
        print_status "Cleaning up temp directory..."
        rm -rf "$TEMP_DIR"
        print_success "Temp directory cleaned up"
    fi
}

# Main function
main() {
    print_status "Starting post-build release process..."
    
    # Get current version
    VERSION=$(get_version)
    print_status "Current version: $VERSION"
    
    # Check prerequisites
    check_dist
    check_lock_files
    
    # Set up trap to clean up on exit
    trap cleanup EXIT
    
    # Get git remote URL
    REMOTE_URL=$(git config --get remote.origin.url)
    if [ -z "$REMOTE_URL" ]; then
        print_error "No git remote origin found"
        exit 1
    fi
    print_status "Remote URL: $REMOTE_URL"
    
    # Create temp directory
    print_status "Creating temp directory..."
    mkdir -p "$TEMP_DIR"
    
    # Clone repository to temp directory
    print_status "Cloning repository to temp directory..."
    git clone "$REMOTE_URL" "$TEMP_DIR"
    cd "$TEMP_DIR"
    
    # Check if release branch exists
    BRANCH_NAME="release/v$VERSION"
    if git show-ref --verify --quiet refs/remotes/origin/$BRANCH_NAME; then
        print_status "Release branch exists, completely resetting it..."
        git checkout -b $BRANCH_NAME origin/$BRANCH_NAME
        # Reset to completely empty state
        git rm -rf . || true
        git commit -m "Reset release branch for clean state" || true
    else
        print_status "Creating new release branch: $BRANCH_NAME"
        git checkout -b $BRANCH_NAME
    fi
    
    # Remove any existing files and folders except .git
    print_status "Cleaning up existing files and folders..."
    find . -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} + 2>/dev/null || true
    
    # Copy dist folder and package files
    print_status "Copying essential files..."
    cp -r "$PROJECT_DIR/dist" .
    cp "$PROJECT_DIR/package.json" .
    
    # Copy yarn.lock if it exists
    if [ -f "$PROJECT_DIR/yarn.lock" ]; then
        cp "$PROJECT_DIR/yarn.lock" .
        print_success "yarn.lock copied"
    fi
    
    # Copy package-lock.json if it exists
    if [ -f "$PROJECT_DIR/package-lock.json" ]; then
        cp "$PROJECT_DIR/package-lock.json" .
        print_success "package-lock.json copied"
    fi
    
    # Add files to git
    print_status "Adding files to git..."
    git add -f dist/ package.json
    if [ -f "yarn.lock" ]; then
        git add yarn.lock
    fi
    if [ -f "package-lock.json" ]; then
        git add package-lock.json
    fi
    
    # Check if there are changes to commit
    if git diff --cached --quiet; then
        print_warning "No changes to commit"
    else
        # Commit changes
        print_status "Committing changes..."
        git commit -m "Release v$VERSION - Add dist folder and package files"
        
        # Push to remote with force if needed
        print_status "Pushing to remote..."
        if git push origin $BRANCH_NAME 2>&1 | grep -q "rejected"; then
            print_warning "Push was rejected, force pushing..."
            git push --force-with-lease origin $BRANCH_NAME
        else
            git push origin $BRANCH_NAME
        fi
        
        print_success "Successfully created and pushed release branch: $BRANCH_NAME"
        print_status "Included files:"
        print_status "   - dist/ (built files)"
        print_status "   - package.json"
        if [ -f "yarn.lock" ]; then
            print_status "   - yarn.lock"
        fi
        if [ -f "package-lock.json" ]; then
            print_status "   - package-lock.json"
        fi
    fi
    
    print_success "Post-build release process completed successfully!"
    print_status "Release branch: $BRANCH_NAME"
    print_status "Version: v$VERSION"
}

# Run main function
main "$@" 