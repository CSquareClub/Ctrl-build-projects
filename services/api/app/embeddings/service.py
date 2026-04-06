from app.embeddings.contracts import EmbeddingProvider


class UnimplementedEmbeddingProvider(EmbeddingProvider):
    def provider_name(self) -> str:
        return "unimplemented"

    def vector_dim(self) -> int:
        return 0

    def embed_one(self, text: str) -> list[float]:
        raise NotImplementedError("Embeddings are not implemented in this branch.")

    def embed_many(self, texts: list[str]) -> list[list[float]]:
        raise NotImplementedError("Embeddings are not implemented in this branch.")
