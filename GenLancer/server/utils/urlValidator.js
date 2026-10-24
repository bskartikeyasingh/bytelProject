/**
 * GenLancer URL & Media Security Validator
 * 
 * Enforces strict security validation for portfolio and project URLs:
 * 1. Blocks dangerous protocols (javascript:, data:, vbscript:, file:, blob:)
 * 2. Strictly permits only standard http:// and https:// URLs
 * 3. Enforces valid domain/hostname structure (prevents malformed URIs)
 * 4. Verifies media asset formats and trusted CDNs
 */

export function validateUrl(url, { allowEmpty = false, requireMedia = false } = {}) {
  if (url === null || url === undefined || url === '') {
    if (allowEmpty) {
      return { valid: true, sanitized: '' };
    }
    return { valid: false, error: 'URL is required and cannot be empty.' };
  }

  if (typeof url !== 'string') {
    return { valid: false, error: 'URL must be a string value.' };
  }

  const trimmed = url.trim();
  if (trimmed === '') {
    if (allowEmpty) return { valid: true, sanitized: '' };
    return { valid: false, error: 'URL cannot be blank or whitespace only.' };
  }

  const lower = trimmed.toLowerCase();

  // 1. Strictly block malicious / dangerous schemes
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:', 'blob:', 'about:'];
  for (const proto of dangerousProtocols) {
    if (lower.startsWith(proto)) {
      return { 
        valid: false, 
        error: `Disallowed URL protocol '${proto}'. Only secure http:// and https:// links are permitted.` 
      };
    }
  }

  // 2. Parse using standard URL object
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch (err) {
    return { 
      valid: false, 
      error: 'Malformed URL format. Please include a complete protocol (e.g. https://example.com/asset.mp4).' 
    };
  }

  // 3. Strict protocol check
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { 
      valid: false, 
      error: `Protocol '${parsed.protocol}' is not supported. Use https:// or http://.` 
    };
  }

  // 4. Hostname check
  const hostname = parsed.hostname.toLowerCase();
  if (!hostname || hostname.length < 3) {
    return { valid: false, error: 'Invalid domain hostname in URL.' };
  }

  // Reject local file path disguised or invalid IP structures
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Permit localhost for local dev/testing
  } else {
    // Domain should have at least one dot or valid TLD
    if (!hostname.includes('.')) {
      return { valid: false, error: 'Domain name must contain a valid top-level domain.' };
    }
  }

  // 5. Media format validation if requireMedia is true
  if (requireMedia) {
    const validMediaExtensions = [
      '.mp4', '.webm', '.mov', '.m4v', 
      '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'
    ];
    const pathname = parsed.pathname.toLowerCase();
    const hasMediaExt = validMediaExtensions.some(ext => pathname.endsWith(ext));

    const trustedMediaHosts = [
      'assets.mixkit.co',
      'images.unsplash.com',
      'vimeo.com',
      'player.vimeo.com',
      'youtube.com',
      'youtu.be',
      'cloudinary.com',
      'storage.googleapis.com',
      'supabase.co',
      'cdn.jsdelivr.net',
      'res.cloudinary.com',
      's3.amazonaws.com'
    ];
    const isTrustedMediaHost = trustedMediaHosts.some(host => hostname.endsWith(host));

    if (!hasMediaExt && !isTrustedMediaHost) {
      return {
        valid: false,
        error: 'Media URL must link to a valid video or image file (.mp4, .webm, .mov, .png, .jpg, .webp) or a recognized media CDN.'
      };
    }
  }

  return { valid: true, sanitized: parsed.href };
}
