// sanitize.js - Funções para prevenir XSS

function escapeHTML(str) {
    if (typeof str !== 'string') return str;
    
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

function sanitizeNumber(value) {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
}

function sanitizeDate(dateStr) {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date.toISOString();
}

if (typeof window !== 'undefined') {
    window.SanitizeUtils = {
        escapeHTML,
        sanitizeInput,
        sanitizeNumber,
        sanitizeDate
    };
}
