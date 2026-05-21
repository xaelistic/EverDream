#!/usr/bin/env python3
"""Fix the broken Gemini URL in the analyze-dream edge function."""

filepath = 'supabase/functions/analyze-dream/index.ts'

with open(filepath, 'r') as f:
    lines = f.readlines()

# Line 208 (0-indexed: 207) - the broken template literal
# Current: '  const geminiUrl = `https://...?key=***\n'
# Target:  '  const geminiUrl = `https://...?key=${apiKey}`;\n'

url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key='
replacement = '  const geminiUrl = `' + url + '${apiKey}`;\n'

lines[207] = replacement

with open(filepath, 'w') as f:
    f.writelines(lines)

# Verify
with open(filepath, 'r') as f:
    updated = f.readlines()

print('Line 208:', repr(updated[207]))
print('Line 209:', repr(updated[208]))
print('Line 210:', repr(updated[209]))
