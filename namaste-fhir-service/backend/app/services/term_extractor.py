import re
import unicodedata

DOSHA_FALLBACKS = {
    "vata type fever": "fever",
    "pitta type fever": "fever",
    "kapha type fever": "fever",
    "vata disorder": "metabolic disorder",
    "pitta disorder": "metabolic disorder",
    "kapha disorder": "metabolic disorder",
}

def strip_diacritics(text: str) -> str:
    """Remove diacritics from text - handles both IAST and Unicode diacritics"""
    # Normalize to NFD (decomposed form) then remove combining characters
    nfd = unicodedata.normalize('NFD', text)
    return ''.join(c for c in nfd if unicodedata.category(c) != 'Mn')

def is_iast(term: str) -> bool:
    """Check if term is IAST transliteration (uppercase mixed in Sanskrit pattern)"""
    return bool(re.search(r'[bcdfghjklmnpqrstvwxyz][A-Z]|[aeiou][A-Z]', term))

def clean_for_tm2_search(original_term: str, english_term: str) -> str:
    """Extract best search term for TM2 WHO API using Sanskrit"""
    if not original_term or original_term.strip() in ["nan", "-", ""]:
        return extract_search_term(english_term)

    # If IAST format - use English
    if is_iast(original_term):
        return extract_search_term(english_term)

    # Strip diacritics from original
    cleaned = strip_diacritics(original_term.strip())
    if cleaned and len(cleaned) > 2:
        return cleaned

    return extract_search_term(english_term)

def extract_search_term(term_english: str) -> str:
    """Extract best English search term - strip diacritics too"""
    # Strip diacritics first
    term_english = strip_diacritics(term_english)

    match = re.search(r'\(([^)]+)\)', term_english)
    if match:
        extracted = match.group(1).strip()
    else:
        extracted = term_english.strip()

    lower = extracted.lower()
    for dosha_term, fallback in DOSHA_FALLBACKS.items():
        if dosha_term in lower:
            return fallback

    return extracted
