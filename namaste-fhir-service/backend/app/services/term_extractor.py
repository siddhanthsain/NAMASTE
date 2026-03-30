import re

DOSHA_FALLBACKS = {
    "vata type fever": "fever",
    "pitta type fever": "fever",
    "kapha type fever": "fever",
    "vata disorder": "metabolic disorder",
    "pitta disorder": "metabolic disorder",
    "kapha disorder": "metabolic disorder",
    "vata type": "unspecified",
    "pitta type": "unspecified",
    "kapha type": "unspecified",
}

def extract_search_term(term_english: str) -> str:
    # Extract English from brackets: "Madhumeha (Diabetes Mellitus)" -> "Diabetes Mellitus"
    match = re.search(r'\(([^)]+)\)', term_english)
    if match:
        extracted = match.group(1).strip()
    else:
        extracted = term_english.strip()

    # Check dosha fallback
    lower = extracted.lower()
    for dosha_term, fallback in DOSHA_FALLBACKS.items():
        if dosha_term in lower:
            return fallback

    return extracted
