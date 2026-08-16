import sys

file_path = 'src/routes/_authenticated/reports.tsx'
with open(file_path, 'r') as f:
    lines = f.readlines()

# Find the lines to move
start_idx = -1
end_idx = -1
for i, line in enumerate(lines):
    if 'const [idToCode, setIdToCode] = useState<Map<string, string>>(new Map());' in line:
        start_idx = i
        break

if start_idx != -1:
    # Find the end of the useEffect
    for i in range(start_idx, len(lines)):
        if '}, [tab, midRates]);' in lines[i]:
            end_idx = i
            break
            
if start_idx != -1 and end_idx != -1:
    content_to_move = lines[start_idx : end_idx + 1]
    # Remove it from current position
    del lines[start_idx : end_idx + 1]
    
    # Find insertion point: after openingBalances state
    insert_idx = -1
    for i, line in enumerate(lines):
        if 'const [openingBalances, setOpeningBalances] = useState<any[]>([]);' in line:
            insert_idx = i + 1
            break
            
    if insert_idx != -1:
        lines[insert_idx:insert_idx] = content_to_move
        
    with open(file_path, 'w') as f:
        f.writelines(lines)
    print("Successfully moved code blocks")
else:
    print(f"Failed to find blocks: start_idx={start_idx}, end_idx={end_idx}")

