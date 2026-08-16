import sys

with open('src/routes/_authenticated/reports.tsx', 'r') as f:
    lines = f.readlines()

# Extract the totals useMemo block
start_idx = -1
end_idx = -1
for i, line in enumerate(lines):
    if 'const totals = useMemo(() => {' in line:
        start_idx = i
    if start_idx != -1 and '}, [rows, lkubRows, tab]);' in line:
        end_idx = i
        break

if start_idx != -1 and end_idx != -1:
    totals_block = lines[start_idx:end_idx+1]
    # Remove the block from its current position
    lines = lines[:start_idx] + lines[end_idx+1:]
    
    # Find where lkubRows is defined
    insert_idx = -1
    for i, line in enumerate(lines):
        if 'const lkubRows: LkubRow[] = useMemo(() => {' in line:
            # Find the end of lkubRows useMemo
            for j in range(i, len(lines)):
                if '}, [tab, lkubData]);' in lines[j]:
                    insert_idx = j + 1
                    break
            break
    
    if insert_idx != -1:
        # Insert totals block after lkubRows
        for i, line in enumerate(totals_block):
            lines.insert(insert_idx + i, line)
        
        with open('src/routes/_authenticated/reports.tsx', 'w') as f:
            f.writelines(lines)
        print("Successfully moved totals useMemo after lkubRows declaration")
    else:
        print("Could not find insertion point for lkubRows")
else:
    print("Could not find totals useMemo block")
