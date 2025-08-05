#!/bin/bash

# Root dir (defaults to current if not provided)
ROOT_DIR="${1:-.}"

echo "🔍 Scanning for .mts files in $ROOT_DIR (excluding node_modules)..."

find "$ROOT_DIR" -type f -name "*.mts" ! -path "*/node_modules/*" | while read -r file; do
  ts_file="${file%.mts}.ts"
  
  # Rename the file
  mv "$file" "$ts_file"
  echo "✅ Renamed: $file → $ts_file"

  # Optional: Update imports inside the file
  sed -i '' -E 's/from\s+(".*)\.mts(")/from \1.ts\2/g' "$ts_file"
  sed -i '' -E 's/import\s+(".*)\.mts(")/import \1.ts\2/g' "$ts_file"
  sed -i '' -E 's/require\((["'"'"'].*)\.mts(["'"'"'])\)/require(\1.ts\2)/g' "$ts_file"
done

echo "🎉 All .mts files converted to .ts."
