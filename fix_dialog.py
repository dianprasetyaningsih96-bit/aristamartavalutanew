import sys

file_path = 'src/routes/_authenticated/reports.tsx'
with open(file_path, 'r') as f:
    lines = f.readlines()

# Find the end of the component
comp_end = -1
for i in range(len(lines) - 1, 0, -1):
    if '  );' in lines[i] and '}' in lines[i+1]:
        comp_end = i
        break

if comp_end != -1:
    # Find the dialog lines that were incorrectly appended
    dialog_start = -1
    for i in range(comp_end, len(lines)):
        if '<Dialog open={openingModalOpen}' in lines[i]:
            dialog_start = i
            break
            
    if dialog_start != -1:
        dialog_content = lines[dialog_start:]
        # Remove from the end
        del lines[dialog_start:]
        # Insert before the closing ); of the return statement
        lines.insert(comp_end, '\n' + ''.join(dialog_content))
        
        with open(file_path, 'w') as f:
            f.writelines(lines)
        print("Successfully moved dialog")
    else:
        print("Failed to find dialog start")
else:
    print("Failed to find component end")

