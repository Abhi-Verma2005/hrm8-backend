const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma/schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

const lines = content.split('\n');
const updatedLines = lines.map(line => {
  // Match lines that have 'updated_at' but not 'pipeline_updated_at'
  if (line.includes('updated_at') && !line.includes('pipeline_updated_at')) {
    // Basic structure: field_name DateTime ... attributes
    const match = line.match(/^(\s+updated_at\s+DateTime)(\?|)(\s+.*|)$/);
    if (match) {
      let [_, prefix, optional, attributes] = match;
      
      // If it's optional, maybe we shouldn't force @default(now()) @updatedAt? 
      // But usually updated_at is mandatory. Let's see if there are optional ones.
      // grep showed 'pipeline_updated_at DateTime?' which we skip.
      
      if (optional === '?') return line; // Skip optional ones if any

      // Remove existing @default(now()) and @updatedAt to avoid duplicates
      let cleanAttributes = attributes
        .replace(/@default\(now\(\)\)/g, '')
        .replace(/@updatedAt/g, '')
        .trim();

      // Construct new attributes
      let newAttributes = `@default(now()) @updatedAt`;
      if (cleanAttributes) {
        newAttributes += ` ${cleanAttributes}`;
      }

      // Reconstruct line with proper spacing
      // Find the original spacing between DateTime and attributes if possible, or just use 2 spaces
      return `${prefix} ${newAttributes}`.trimEnd();
    }
  }
  return line;
});

fs.writeFileSync(schemaPath, updatedLines.join('\n'));
console.log('Successfully updated updated_at fields in schema.prisma');
