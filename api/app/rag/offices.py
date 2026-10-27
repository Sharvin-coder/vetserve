"""The "talk to a person" directory (GA-10 / Athens-area pilot). Every number
was pulled from the official source page listed alongside it — never edit
these by memory; re-verify against the page."""

OFFICES = {
    "gdvs": {
        "org": "Georgia Department of Veterans Service",
        "phone": "404-656-2300",
        "hours": "State benefits and claims help, free",
        "source": "https://veterans.georgia.gov/",
    },
    "athens_clinic": {
        "org": "Athens VA Clinic",
        "phone": "706-733-0188",
        "hours": "VA health care, Athens",
        "source": "https://www.va.gov/augusta-health-care/locations/athens-va-clinic/",
    },
    "va_hotline": {
        "org": "VA Benefits Hotline",
        "phone": "800-827-1000",
        "hours": "Mon-Fri 8:00 a.m.-9:00 p.m. ET",
        "source": "https://www.va.gov/contact-us/",
    },
}

_TOPIC_RULES: list[tuple[tuple[str, ...], str]] = [
    (("property tax", "tuition", "state", "georgia", "employment preference"), "gdvs"),
    (
        ("health care", "clinic", "enroll", "priority group", "appointment", "medical"),
        "athens_clinic",
    ),
    # claims, disability, and everything else → the federal benefits hotline
]


def pick_office(question: str, source_urls: list[str]) -> dict:
    """Route by question keywords first, then by which sources answered."""
    q = question.lower()
    for keywords, key in _TOPIC_RULES:
        if any(k in q for k in keywords):
            return OFFICES[key]
    joined = " ".join(source_urls)
    if "health-care" in joined or "houston-health-care" in joined:
        return OFFICES["athens_clinic"]
    return OFFICES["va_hotline"]
