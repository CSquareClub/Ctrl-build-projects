from dataclasses import dataclass
from typing import Protocol, runtime_checkable


@dataclass(frozen=True)
class EmbeddingProviderInfo:
    provider_name: str
    model_name: str
    vector_dim: int
    normalized: bool
    truncation: str


@runtime_checkable
class EmbeddingProvider(Protocol):
    def provider_name(self) -> str: ...

    def model_name(self) -> str: ...

    def vector_dim(self) -> int: ...

    def info(self) -> EmbeddingProviderInfo: ...

    def embed_one(self, text: str) -> list[float]: ...

    def embed_many(self, texts: list[str]) -> list[list[float]]: ...
