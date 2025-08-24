/**
 * Frontend Decryption Utilities for AES-Encrypted Live-Search API Responses
 * This file handles decryption of AES-encrypted tokens from the backend
 */

// Configuration - should match your backend
const TOKEN_EXPIRY_MINUTES = 10;

// Encryption secret (this should be in your .env.local)
const ENCRYPTION_SECRET = process.env.NEXT_PUBLIC_ENCRYPTION_SECRET;

/**
 * Convert hex string to Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Decrypt AES-encrypted response data
 */
export async function decryptAESResponse(token: string): Promise<any> {
  if (!ENCRYPTION_SECRET) {
    throw new Error('ENCRYPTION_SECRET not configured');
  }

  try {
    // Handle different token formats
    let encryptedData: string, iv: string, authTag: string;
    
    if (token.includes('.')) {
      // Standard format: encryptedData.iv.authTag
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid AES token format');
      }
      [encryptedData, iv, authTag] = parts;
    } else {
      // Alternative format: might be concatenated or different structure
      throw new Error('Unsupported token format - please check backend encryption method');
    }
    
    // Convert hex strings to Uint8Arrays
    const encryptedBytes = hexToBytes(encryptedData);
    const ivBytes = hexToBytes(iv);
    const authTagBytes = hexToBytes(authTag);
    
    // Combine encrypted data with auth tag for AES-GCM
    const encryptedWithTag = new Uint8Array(encryptedBytes.length + authTagBytes.length);
    encryptedWithTag.set(encryptedBytes);
    encryptedWithTag.set(authTagBytes, encryptedBytes.length);
    
    // Derive the key using PBKDF2-SHA256 (same as backend)
    const salt = new TextEncoder().encode('salt'); // Use same salt as backend
    
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(ENCRYPTION_SECRET),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );
    
    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
    
    // Decrypt the data
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes },
      derivedKey,
      encryptedWithTag
    );
    
    // Parse the decrypted JSON
    const decryptedText = new TextDecoder().decode(decrypted);
    return JSON.parse(decryptedText);
    
  } catch (error: unknown) {
    console.error('❌ Decryption failed with error:', error);
    
    if (error instanceof Error) {
      console.error('  - Error name:', error.name);
      console.error('  - Error message:', error.message);
      
      if (error.name === 'OperationError') {
        console.error('  - This usually means:');
        console.error('    * Wrong encryption key');
        console.error('    * Wrong IV (initialization vector)');
        console.error('    * Wrong algorithm parameters');
        console.error('    * Corrupted encrypted data');
      }
    } else {
      console.error('  - Unknown error type:', typeof error);
    }
    
    throw new Error('Failed to decrypt response data');
  }
}

/**
 * Check if a response is encrypted
 */
export function isEncryptedResponse(response: any): boolean {
  return response && response.encrypted === true && response.token;
}

/**
 * Extract token metadata from AES-encrypted response
 */
export function getAESTokenMetadata(response: any): any {
  if (!isEncryptedResponse(response)) {
    return null;
  }
  
  try {
    const token = response.token;
    
    if (token.includes('.')) {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }
      
      const [encryptedData, iv, authTag] = parts;
      
      return {
        format: 'standard',
        encryptedDataLength: encryptedData.length,
        ivLength: iv.length,
        authTagLength: authTag.length,
        totalLength: response.token.length,
        expiresAt: response.expiresAt,
        isExpired: Date.now() > response.expiresAt
      };
    } else {
      // Alternative format
      return {
        format: 'alternative',
        totalLength: token.length,
        isHex: /^[0-9a-fA-F]+$/.test(token),
        expiresAt: response.expiresAt,
        isExpired: Date.now() > response.expiresAt
      };
    }
  } catch {
    return null;
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(response: any): boolean {
  if (!isEncryptedResponse(response)) {
    return false;
  }
  
  return Date.now() > response.expiresAt;
}

/**
 * Check if token will expire soon (within 1 minute)
 */
export function isTokenExpiringSoon(response: any): boolean {
  if (!isEncryptedResponse(response)) {
    return false;
  }
  
  const oneMinute = 60 * 1000;
  return (response.expiresAt - Date.now()) < oneMinute;
}

/**
 * Process a live-search API response
 * @param response - The raw API response
 * @returns The decrypted data or the original response if not encrypted
 */
export async function processAESLiveSearchResponse(response: any): Promise<any> {
  if (isEncryptedResponse(response)) {
    try {
      // Decrypt the data
      const decryptedData = await decryptAESResponse(response.token);
      
      return {
        ...decryptedData,
        _encryptionInfo: {
          wasEncrypted: true,
          decryptedOnFrontend: true,
          expiresAt: response.expiresAt
        }
      };
    } catch (error) {
      console.error('Decryption failed:', error);
      // Return encrypted response with error info
      return {
        encrypted: true,
        token: response.token,
        expiresAt: response.expiresAt,
        error: 'Failed to decrypt response',
        decryptionFailed: true,
        decryptionError: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  // If not encrypted, return as-is (for backward compatibility)
  return response;
}

/**
 * Validate AES token format
 */
export function validateAESTokenFormat(token: string): boolean {
  try {
    if (token.includes('.')) {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return false;
      }
      
      const [encryptedData, iv, authTag] = parts;
      
      // Check if all parts are valid hex strings
      const hexRegex = /^[0-9a-fA-F]+$/;
      return hexRegex.test(encryptedData) && hexRegex.test(iv) && hexRegex.test(authTag);
    } else {
      // Alternative format - just check if it's hex
      return /^[0-9a-fA-F]+$/.test(token);
    }
  } catch {
    return false;
  }
}

/**
 * Get encryption information for debugging
 */
export function getAESEncryptionInfo(response: any): any {
  if (!isEncryptedResponse(response)) {
    return null;
  }
  
  const metadata = getAESTokenMetadata(response);
  const isValidFormat = validateAESTokenFormat(response.token);
  
  return {
    algorithm: 'AES-256-GCM',
    keyDerivation: 'PBKDF2-SHA256',
    tokenFormat: isValidFormat ? 'Valid' : 'Invalid',
    metadata,
    securityLevel: 'Military-grade encryption',
    canBeDecoded: ENCRYPTION_SECRET ? 'Yes (with secret key)' : 'No (secret not configured)',
    tokenAnalysis: {
      length: response.token.length,
      containsDots: response.token.includes('.'),
      isHex: /^[0-9a-fA-F]+$/.test(response.token),
      sample: response.token.substring(0, 50) + '...'
    }
  };
}
