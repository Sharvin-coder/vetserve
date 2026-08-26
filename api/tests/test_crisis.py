"""Crisis keyword gate — must catch the listed intents without the model."""

from app.rag.crisis import keyword_crisis

MUST_CATCH = [
    "I don't want to be here anymore",
    "i've been thinking about suicide",
    "how do I stop wanting to hurt myself",
    "I can't go on",
    "sometimes I think everyone would be better off without me",
    "I want to end it all",
    "thinking of killing myself",
    "self-harm has been on my mind",
]

MUST_PASS = [
    "Am I eligible for the Hazlewood Act?",
    "How do I file a disability claim?",
    "My knee hurts when I walk, can the VA help?",
    "What happens if my claim is denied?",
    "I can't find my discharge papers",
]


def test_crisis_phrases_caught():
    for phrase in MUST_CATCH:
        assert keyword_crisis(phrase), f"missed crisis phrase: {phrase}"


def test_benign_questions_pass():
    for phrase in MUST_PASS:
        assert not keyword_crisis(phrase), f"false crisis trigger: {phrase}"
