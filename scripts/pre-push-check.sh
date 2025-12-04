#!/usr/bin/env bash
# Pre-push validation script

set -e

echo "🔍 Royalinera Pre-Push Checklist"
echo "================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track issues
ISSUES=0

# 1. Check Discord username
echo "1️⃣  Checking Discord username in README..."
if grep -q "PhiBao#\[Your Discord Tag Here\]" README.md; then
    echo -e "${YELLOW}⚠️  Warning: Update your Discord tag in README.md${NC}"
    ISSUES=$((ISSUES + 1))
else
    echo -e "${GREEN}✅ Discord username set${NC}"
fi
echo ""

# 2. Check for untracked important files
echo "2️⃣  Checking for untracked files..."
UNTRACKED=$(git ls-files --others --exclude-standard | grep -v "target\|node_modules\|\.linera\|web-client-old\|linera-protocol" || true)
if [ -n "$UNTRACKED" ]; then
    echo -e "${YELLOW}⚠️  Untracked files found:${NC}"
    echo "$UNTRACKED" | head -10
    echo ""
else
    echo -e "${GREEN}✅ All important files tracked${NC}"
fi
echo ""

# 3. Check for backup/temp files
echo "3️⃣  Checking for backup/temp files..."
BACKUP_FILES=$(find . -name "*.bak" -o -name "*.old" -o -name "*.tmp" -o -name "*~" 2>/dev/null | grep -v "target\|node_modules\|\.git" || true)
if [ -n "$BACKUP_FILES" ]; then
    echo -e "${RED}❌ Backup files found (should be in .gitignore):${NC}"
    echo "$BACKUP_FILES"
    ISSUES=$((ISSUES + 1))
else
    echo -e "${GREEN}✅ No backup files${NC}"
fi
echo ""

# 4. Check contract compiles
echo "4️⃣  Checking if Rust contract compiles..."
if cargo build --release --target wasm32-unknown-unknown --quiet 2>&1 | grep -q "error"; then
    echo -e "${RED}❌ Compilation errors${NC}"
    ISSUES=$((ISSUES + 1))
else
    echo -e "${GREEN}✅ Contract compiles${NC}"
fi
echo ""

# 5. Check documentation files exist
echo "5️⃣  Checking required documentation files..."
REQUIRED_DOCS=("README.md" "CHANGELOG.md")
for doc in "${REQUIRED_DOCS[@]}"; do
    if [ -f "$doc" ]; then
        echo -e "${GREEN}✅ $doc exists${NC}"
    else
        echo -e "${RED}❌ Missing $doc (REQUIRED for Linera submission)${NC}"
        ISSUES=$((ISSUES + 1))
    fi
done
echo ""

# 6. Check git status
echo "6️⃣  Git status..."
git status --short
echo ""

# 7. Check for large files
echo "7️⃣  Checking for large files (>10MB)..."
LARGE_FILES=$(find . -type f -size +10M 2>/dev/null | grep -v "target\|node_modules\|\.git\|linera-protocol" || true)
if [ -n "$LARGE_FILES" ]; then
    echo -e "${YELLOW}⚠️  Large files found:${NC}"
    echo "$LARGE_FILES"
    du -sh $LARGE_FILES
else
    echo -e "${GREEN}✅ No large files${NC}"
fi
echo ""

# 8. Summary
echo "================================="
echo "📊 Summary"
echo "================================="
if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! Ready to push.${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Update Discord tag in README.md if needed"
    echo "  2. git add ."
    echo "  3. git commit -m 'Add Wave 1 submission - complete ticketing dApp'"
    echo "  4. git push origin main"
else
    echo -e "${RED}⚠️  Found $ISSUES issue(s). Please fix before pushing.${NC}"
    exit 1
fi
