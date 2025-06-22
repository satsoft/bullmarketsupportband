/**
 * Format small prices with subscript scientific notation
 * e.g., 0.00000123 becomes "0.0₆123"
 */
export function formatSmallPrice(price: number): string {
  if (price >= 1) {
    // For prices >= $1, use regular formatting
    if (price >= 1000) {
      return price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    } else {
      return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  }
  
  if (price >= 0.01) {
    // For prices >= $0.01, show 4 decimal places
    return price.toFixed(4);
  }
  
  // For very small prices, use subscript notation
  const priceStr = price.toString();
  
  // Check if it's in scientific notation already
  if (priceStr.includes('e')) {
    const [mantissa, exponent] = priceStr.split('e');
    const exp = parseInt(exponent);
    if (exp < 0) {
      const zeros = Math.abs(exp) - 1;
      const digits = mantissa.replace('.', '');
      return `0.0₍${zeros}₎${digits}`;
    }
  }
  
  // Handle regular decimal notation
  const parts = priceStr.split('.');
  if (parts.length === 2) {
    const decimalPart = parts[1];
    
    // Count leading zeros after decimal
    let zeros = 0;
    for (let i = 0; i < decimalPart.length; i++) {
      if (decimalPart[i] === '0') {
        zeros++;
      } else {
        break;
      }
    }
    
    if (zeros >= 4) {
      // Get the significant digits (first 3-4 non-zero digits)
      const significantDigits = decimalPart.substring(zeros, zeros + 3);
      return `0.0₍${zeros}₎${significantDigits}`;
    }
  }
  
  // Fallback to regular formatting
  return price.toFixed(6);
}

/**
 * Generate subscript numbers for the zero count
 */
function subscriptNumber(num: number): string {
  const subscriptMap: { [key: string]: string } = {
    '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
    '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉'
  };
  
  return num.toString().split('').map(digit => subscriptMap[digit] || digit).join('');
}

/**
 * Format number to specified significant digits, removing trailing zeros
 */
function toSignificantDigits(num: number, digits: number): string {
  // Use toPrecision to get the right number of significant digits
  const precisionStr = num.toPrecision(digits);
  
  // Convert to number to remove trailing zeros, then back to string
  const numResult = Number(precisionStr);
  let result = numResult.toString();
  
  // Manual removal of trailing zeros if they still exist
  if (result.includes('.')) {
    result = result.replace(/\.?0+$/, '');
  }
  
  return result;
}

// Update the function to use proper subscripts
export function formatSmallPriceWithSubscript(price: number): string {
  if (price >= 1) {
    // For prices >= $1, use regular formatting
    if (price >= 1000) {
      return price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    } else {
      return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  }
  
  if (price >= 0.10) {
    // For prices $0.10 - $0.99, show 2 significant digits
    return toSignificantDigits(price, 2);
  }
  
  if (price >= 0.01) {
    // For prices $0.01 - $0.099, show 3 significant digits
    const result = toSignificantDigits(price, 3);
    // Debug log for PENGU-like prices
    if (price > 0.008 && price < 0.009) {
      console.log(`Price formatting debug: input=${price}, toPrecision(3)=${price.toPrecision(3)}, parseFloat=${parseFloat(price.toPrecision(3))}, final=${result}`);
    }
    return result;
  }
  
  // For very small prices, use subscript notation
  const priceStr = price.toString();
  
  // Check if it's in scientific notation already
  if (priceStr.includes('e')) {
    const [mantissa, exponent] = priceStr.split('e');
    const exp = parseInt(exponent);
    if (exp < 0) {
      const zeros = Math.abs(exp) - 1;
      const digits = mantissa.replace('.', '').substring(0, 3); // Limit to 3 digits
      return `0.0${subscriptNumber(zeros)}${digits}`;
    }
  }
  
  // Handle regular decimal notation
  const parts = priceStr.split('.');
  if (parts.length === 2) {
    const decimalPart = parts[1];
    
    // Count leading zeros after decimal
    let zeros = 0;
    for (let i = 0; i < decimalPart.length; i++) {
      if (decimalPart[i] === '0') {
        zeros++;
      } else {
        break;
      }
    }
    
    if (zeros >= 4) {
      // Get exactly 3 significant digits after the zeros
      const nonZeroDigits = decimalPart.substring(zeros);
      const significantDigits = nonZeroDigits.substring(0, 3);
      return `0.0${subscriptNumber(zeros)}${significantDigits}`;
    }
  }
  
  // Fallback to regular formatting
  return price.toFixed(6);
}