/**
 * Token Debug Utility
 * This helps analyze the token format from your backend
 */

/**
 * Analyze a token to understand its structure
 */
export function analyzeToken(token: string) {
  const analysis = {
    length: token.length,
    containsDots: token.includes('.'),
    isHex: /^[0-9a-fA-F]+$/.test(token),
    dotCount: (token.match(/\./g) || []).length,
    parts: token.includes('.') ? token.split('.') : [token],
    sample: token.substring(0, 50) + '...',
    endSample: token.substring(token.length - 50)
  };

  console.log('Token Analysis:', analysis);
  
  if (token.includes('.')) {
    const parts = token.split('.');
    console.log('Token Parts:');
    parts.forEach((part, index) => {
      console.log(`  Part ${index}: length=${part.length}, isHex=${/^[0-9a-fA-F]+$/.test(part)}`);
    });
  } else {
    console.log('Token is a single string without dots');
  }

  return analysis;
}

/**
 * Check if this might be a different encryption format
 */
export function guessEncryptionFormat(token: string) {
  const analysis = analyzeToken(token);
  
  if (analysis.containsDots && analysis.parts.length === 3) {
    return 'Standard AES-GCM (encryptedData.iv.authTag)';
  } else if (analysis.containsDots && analysis.parts.length === 2) {
    return 'AES-CBC (encryptedData.iv)';
  } else if (analysis.isHex && !analysis.containsDots) {
    return 'Single encrypted blob (might be concatenated)';
  } else if (token.includes('=')) {
    return 'Base64 encoded';
  } else {
    return 'Unknown format';
  }
}

/**
 * Try to extract potential components from the token
 */
export function extractTokenComponents(token: string) {
  if (token.includes('.')) {
    const parts = token.split('.');
    return {
      format: 'dotted',
      parts: parts.map((part, index) => ({
        index,
        length: part.length,
        isHex: /^[0-9a-fA-F]+$/.test(part),
        sample: part.substring(0, 20) + '...'
      }))
    };
  } else {
    // Try to split into equal parts
    const totalLength = token.length;
    const possibleSplits = [2, 3, 4].filter(divisor => totalLength % divisor === 0);
    
    return {
      format: 'single',
      totalLength,
      possibleSplits,
      suggestions: possibleSplits.map(split => {
        const partLength = totalLength / split;
        return {
          split,
          partLength,
          parts: Array.from({ length: split }, (_, i) => {
            const start = i * partLength;
            const end = start + partLength;
            const part = token.substring(start, end);
            return {
              index: i,
              length: part.length,
              isHex: /^[0-9a-fA-F]+$/.test(part),
              sample: part.substring(0, 20) + '...'
            };
          })
        };
      })
    };
  }
}
