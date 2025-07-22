// Pet mat specific ranges and settings
const petRanges = {
    thickness: {
        min: 0,
        max: 2.0,  // 20mm max for pet mats
        step: 0.1,
        default: {
            min: 0,
            max: 1.5
        },
        ranges: [
            { min: 0, max: 0.6, label: '0-6mm' },
            { min: 0.6, max: 0.9, label: '6-9mm' },
            { min: 0.9, max: 1.2, label: '9-12mm' },
            { min: 1.2, max: 1.5, label: '12-15mm' },
            { min: 1.5, max: 2.0, label: '15mm+' }
        ]
    },
    // Standard length for pet mats (50cm)
    standardLength: 50,
    // Width options for pet mats
    widthOptions: [110, 125, 135, 140, 150]
};

// Function to update thickness sliders based on product type
function updateThicknessRanges(productType) {
    const thicknessMinSlider = document.getElementById('thicknessMin');
    const thicknessMaxSlider = document.getElementById('thicknessMax');
    
    if (!thicknessMinSlider || !thicknessMaxSlider) return;
    
    if (productType === 'pet') {
        // Pet mat specific ranges
        thicknessMinSlider.max = petRanges.thickness.max;
        thicknessMaxSlider.max = petRanges.thickness.max;
        thicknessMinSlider.step = petRanges.thickness.step;
        thicknessMaxSlider.step = petRanges.thickness.step;
        
        // Set default values
        thicknessMinSlider.value = petRanges.thickness.default.min;
        thicknessMaxSlider.value = petRanges.thickness.default.max;
        
        // Update display
        document.getElementById('thicknessMinValue').textContent = petRanges.thickness.default.min;
        document.getElementById('thicknessMaxValue').textContent = petRanges.thickness.default.max;
    } else {
        // Regular mat ranges
        thicknessMinSlider.max = 10;
        thicknessMaxSlider.max = 10;
        thicknessMinSlider.step = 0.1;
        thicknessMaxSlider.step = 0.1;
        
        // Set default values
        thicknessMinSlider.value = 0;
        thicknessMaxSlider.value = 10;
        
        // Update display
        document.getElementById('thicknessMinValue').textContent = 0;
        document.getElementById('thicknessMaxValue').textContent = 10;
    }
}

// Get thickness range label for pet mats
function getPetThicknessLabel(thickness) {
    for (const range of petRanges.thickness.ranges) {
        if (thickness >= range.min && thickness < range.max) {
            return range.label;
        }
    }
    return thickness.toFixed(1) + 'cm';
}

// Calculate price per unit for pet mats (50cm standard)
function calculatePetPricePerUnit(price, width, length, thickness) {
    // Convert to standard 50cm length units
    const standardUnits = (width * length) / (110 * 50); // Based on 110x50cm standard
    return price / standardUnits;
}

// Get pet mat product groups
function getPetProductGroups(data) {
    const groups = {};
    
    data.forEach(item => {
        // Group by thickness ranges
        const thicknessGroup = getPetThicknessLabel(item.Thickness_cm);
        if (!groups[thicknessGroup]) {
            groups[thicknessGroup] = [];
        }
        groups[thicknessGroup].push(item);
    });
    
    return groups;
}