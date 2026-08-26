"""Citation-validator unit tests. Embeddings are faked so these run with no
services: sentences and chunks share a vector space keyed by topic id."""

import asyncio

import numpy as np
import pytest

from app.rag import validate as v
from app.rag.retrieve import Retrieved


def make_chunk(n: int, content: str) -> Retrieved:
    return Retrieved(
        id=n, content=content, source_url=f"https://example.gov/{n}",
        title=f"Doc {n}", page=None, section_path="", citation_n=n,
    )


TOPICS = {
    "hazlewood": np.array([1.0, 0.0, 0.0]),
    "propertytax": np.array([0.0, 1.0, 0.0]),
    "unrelated": np.array([0.0, 0.0, 1.0]),
}


def fake_vector(text: str) -> list[float]:
    t = text.lower()
    if "hazlewood" in t:
        base = TOPICS["hazlewood"]
    elif "property tax" in t:
        base = TOPICS["propertytax"]
    else:
        base = TOPICS["unrelated"]
    return base.tolist()


@pytest.fixture(autouse=True)
def fake_embeddings(monkeypatch):
    async def fake_embed_texts(texts):
        return [fake_vector(t) for t in texts]

    monkeypatch.setattr(v, "embed_texts", fake_embed_texts)


CHUNKS = [
    make_chunk(1, "The Hazlewood Act provides 150 credit hours of tuition exemption."),
    make_chunk(2, "The Texas property tax exemption scales with disability rating."),
]


def run(answer):
    return asyncio.run(v.validate_answer(answer, CHUNKS))


def test_valid_markers_kept():
    out = run(
        "The Hazlewood Act covers tuition. [1] The property tax break scales with rating. [2]"
    )
    assert out.used_citations == [1, 2]
    assert out.dropped == []
    assert "[1]" in out.answer and "[2]" in out.answer


def test_invalid_marker_drops_sentence():
    out = run("Veterans get free parking statewide. [7]")
    assert out.answer == ""
    assert len(out.dropped) == 1
    assert "match no retrieved source" in out.dropped[0]["reason"]


def test_uncited_fact_attached_when_close():
    out = run("The Hazlewood Act gives veterans a tuition exemption.")
    assert out.used_citations == [1]
    assert out.answer.endswith("[1]")
    assert out.dropped == []


def test_uncited_fact_deleted_when_far():
    out = run("Veterans also receive a free fishing license every year.")
    assert out.answer == ""
    assert len(out.dropped) == 1
    assert "cosine" in out.dropped[0]["reason"]


def test_mixed_answer():
    out = run(
        "The Hazlewood Act covers 150 credit hours. [1] "
        "Veterans also receive a free fishing license every year. "
        "The property tax exemption depends on your rating. [2]"
    )
    assert out.used_citations == [1, 2]
    assert len(out.dropped) == 1
    assert "fishing" in out.dropped[0]["sentence"]


def test_abbreviations_do_not_split_sentences():
    out = run(
        "Veterans rated at least 10% by the U.S. Department of Veterans Affairs "
        "get a Hazlewood property tax exemption. [1]"
    )
    # one sentence, one citation — "U.S." must not become its own fragment
    assert out.used_citations == [1]
    assert out.dropped == []
    assert out.answer.count("[1]") == 1
    assert "U.S. Department" in out.answer


def test_non_assertive_sentence_survives_uncited():
    out = run(
        "The Hazlewood Act covers tuition at public schools. [1] "
        "Please call the office below for help."
    )
    assert "Please call" in out.answer
    assert out.dropped == []
