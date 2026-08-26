"""The "talk to a person" directory. Every number was pulled from the
official source page listed alongside it (see sources.json) — never edit
these by memory; re-verify against the page."""

OFFICES = {
    "fort_bend_vso": {
        "org": "Fort Bend County Veterans Service Office",
        "phone": "281-341-4550",
        "hours": "Rosenberg office — call for hours",
        "source": "https://www.fortbendcountytx.gov/government/departments/commissioners-court/county-judge/veteran-service-office/contact-us",
    },
    "tvc": {
        "org": "Texas Veterans Commission",
        "phone": "800-252-8387",
        "hours": "Mon–Fri business hours",
        "source": "https://tvc.texas.gov/claims/",
    },
    "katy_clinic": {
        "org": "Katy VA Clinic",
        "phone": "281-578-4600",
        "hours": "Mon–Fri 8:00 a.m.–4:30 p.m.",
        "source": "https://www.va.gov/houston-health-care/locations/katy-va-clinic/",
    },
    "debakey": {
        "org": "Michael E. DeBakey VA Medical Center",
        "phone": "713-791-1414",
        "hours": "Open 24/7",
        "source": "https://www.va.gov/houston-health-care/locations/michael-e-debakey-department-of-veterans-affairs-medical-center/",
    },
}

_TOPIC_RULES: list[tuple[tuple[str, ...], str]] = [
    (("hazlewood", "property tax", "tuition", "employment preference", "texas"), "tvc"),
    (
        ("health care", "clinic", "enroll", "priority group", "appointment", "medical"),
        "katy_clinic",
    ),
    (("hospital", "emergency", "debakey"), "debakey"),
    # claims, disability, and everything else → the county office that helps file
]


def pick_office(question: str, source_urls: list[str]) -> dict:
    """Route by question keywords first, then by which sources answered."""
    q = question.lower()
    for keywords, key in _TOPIC_RULES:
        if any(k in q for k in keywords):
            return OFFICES[key]
    joined = " ".join(source_urls)
    if "tvc.texas.gov" in joined:
        return OFFICES["tvc"]
    if "houston-health-care" in joined:
        return OFFICES["katy_clinic"]
    return OFFICES["fort_bend_vso"]
