def process_puzzle_option2(option2_str):
    """
    Process puzzle mat option2 patterns and normalize 50x50 4pcs to 100x100 1pc
    Returns: (width, length, thickness) or (None, None, None) if not a puzzle pattern
    """
    # Pattern 1: "(25mm) 100x100 1장" or "(25mm) 50x50 4장" (따사룸)
    pattern1 = r'\((\d+)mm\)\s*(\d+)x(\d+)\s*(\d+)장'
    match1 = re.search(pattern1, option2_str)
    if match1:
        thickness_mm = float(match1.group(1))
        width = int(match1.group(2))
        length = int(match1.group(3))
        pieces = int(match1.group(4))
        
        # Convert mm to cm
        thickness = str(thickness_mm / 10)
        
        # Normalize 50x50 4pieces to 100x100
        if width == 50 and length == 50 and pieces == 4:
            return ('100', '100', thickness)
        else:
            return (str(width), str(length), thickness)
    
    # Pattern 2: "100x100x3cm (1장)" or "50x50x3cm (4장)" (티지오매트)
    pattern2 = r'(\d+)x(\d+)x(\d+(?:\.\d+)?)cm\s*\((\d+)장\)'
    match2 = re.search(pattern2, option2_str)
    if match2:
        width = int(match2.group(1))
        length = int(match2.group(2))
        thickness = match2.group(3)
        pieces = int(match2.group(4))
        
        # Normalize 50x50 4pieces to 100x100
        if width == 50 and length == 50 and pieces == 4:
            return ('100', '100', thickness)
        else:
            return (str(width), str(length), thickness)
    
    return (None, None, None)


# Test the function
import re

test_cases = [
    "(25mm) 100x100 1장",  # 따사룸 100x100
    "(25mm) 50x50 4장",    # 따사룸 50x50 -> should become 100x100
    "100x100x3cm (1장)",   # 티지오매트 100x100
    "50x50x3cm (4장)",     # 티지오매트 50x50 -> should become 100x100
    "110x50",              # Not a puzzle pattern
]

for test in test_cases:
    result = process_puzzle_option2(test)
    print(f"{test} -> {result}")