/**
 * HTML Sanitization Utility
 * Prevents XSS attacks by removing script tags and dangerous attributes
 * Production-grade sanitization for user-generated content
 */

const DANGEROUS_TAGS = ['script', 'iframe', 'object', 'embed', 'style', 'link', 'meta', 'base'];
const DANGEROUS_ATTRS = [
    'onload',
    'onerror',
    'onclick',
    'onmouseover',
    'onmouseout',
    'onchange',
    'onsubmit',
    'onfocus',
    'onblur',
    'onkeydown',
    'onkeyup',
    'ondblclick',
    'oncontextmenu',
];

/**
 * Sanitize a string to prevent XSS attacks
 * Removes all HTML tags and dangerous characters
 */
export function sanitizeText(input) {
    if (typeof input !== 'string') {
        return '';
    }

    return input
        .replace(/[<>]/g, (match) => {
            return match === '<' ? '&lt;' : '&gt;';
        })
        .trim();
}

/**
 * Sanitize HTML content
 * Removes script tags, dangerous attributes, and event handlers
 */
export function sanitizeHTML(input) {
    if (typeof input !== 'string') {
        return '';
    }

    let result = input;

    // Remove script tags and their content
    DANGEROUS_TAGS.forEach((tag) => {
        const regex = new RegExp(`<${tag}[^>]*>.*?</${tag}>|<${tag}[^>]*/>`, 'gi');
        result = result.replace(regex, '');
    });

    // Remove dangerous attributes
    DANGEROUS_ATTRS.forEach((attr) => {
        const regex = new RegExp(`\\s${attr}\\s*=\\s*[\"']?[^\"'\\s>]*[\"']?`, 'gi');
        result = result.replace(regex, '');
    });

    // Remove javascript: protocol
    result = result.replace(/javascript:/gi, '');

    // Remove data: protocol (can contain scripts)
    result = result.replace(/data:text\/html/gi, '');

    return result.trim();
}

/**
 * Escape user input for safe insertion into DOM
 * Should be used instead of innerHTML when possible
 */
export function escapeHtml(input) {
    if (typeof input !== 'string') {
        return '';
    }

    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
    };

    return input.replace(/[&<>\"']/g, (match) => map[match]);
}

/**
 * Validate and sanitize username
 */
export function sanitizeUsername(input) {
    if (typeof input !== 'string') {
        return '';
    }

    // Allow only alphanumeric, spaces, and underscores
    // Max 32 characters
    return input
        .replace(/[^a-zA-Z0-9_\s]/g, '')
        .substring(0, 32)
        .trim();
}

/**
 * Validate and sanitize room code
 * Should be alphanumeric only, uppercase
 */
export function sanitizeRoomCode(input) {
    if (typeof input !== 'string') {
        return '';
    }

    return input.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8).toUpperCase();
}

/**
 * Safe DOM element text insertion
 * Use this instead of innerHTML when setting user content
 */
export function setTextContent(element, text) {
    if (!element) {
        return;
    }

    if (element.textContent !== undefined) {
        element.textContent = text;
    } else if (element.innerText !== undefined) {
        element.innerText = text;
    }
}

/**
 * Safe DOM element HTML insertion (with sanitization)
 * Always sanitize untrusted content before using this
 */
export function setHTMLContent(element, html, sanitize = true) {
    if (!element) {
        return;
    }

    const cleanHTML = sanitize ? sanitizeHTML(html) : html;
    element.innerHTML = cleanHTML;
}
