// Step 1: Logic to protect data before it leaves your machine
export const encryp_ai = (word) => {
    if (word.length < 8) return "Error: Word must be at least 8 characters.";
    
    // 1. Reverse
    let reversed = word.split('').reverse().join('');
    
    // 2. Shift 8 (Caesar)
    let shifted = reversed.replace(/[a-z]/gi, (char) => {
        const start = char <= 'Z' ? 65 : 97;
        return String.fromCharCode(start + (char.charCodeAt(0) - start + 8) % 26);
    });
    
    // 3. Jumble (Pairing Front and Back)
    let jumbled = "";
    let n = shifted.length;
    for (let i = 0; i < Math.floor(n / 2); i++) {
        jumbled += shifted[i];            // Front
        jumbled += shifted[n - 1 - i];    // Back
    }
    if (n % 2 !== 0) jumbled += shifted[Math.floor(n / 2)];
    
    return jumbled;
};

export const decryp_ai = (code) => {
    let n = code.length;
    let originalOrder = new Array(n);
    let idx = 0;
    
    // 1. Un-jumble
    for (let i = 0; i < Math.floor(n / 2); i++) {
        originalOrder[i] = code[idx];
        originalOrder[n - 1 - i] = code[idx + 1];
        idx += 2;
    }
    if (n % 2 !== 0) originalOrder[Math.floor(n / 2)] = code[idx];
    
    // 2. Un-shift 8
    let unshifted = originalOrder.join('').replace(/[a-z]/gi, (char) => {
        const start = char <= 'Z' ? 65 : 97;
        return String.fromCharCode(start + (char.charCodeAt(0) - start - 8 + 26) % 26);
    });
    
    // 3. Reverse back
    return unshifted.split('').reverse().join('');
};