from typing import Optional

import numpy as np
from sentence_transformers import SentenceTransformer


class EmbeddingService:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model_name = model_name
        self.model: Optional[SentenceTransformer] = None

    def get_model(self) -> SentenceTransformer:
        if self.model is None:
            self.model = SentenceTransformer(self.model_name)
        return self.model

    def generate_embedding(self, text: str) -> np.ndarray:
        """Generate an embedding for a given text string."""
        model = self.get_model()
        return model.encode(text)

    def generate_combined_embedding(self, title: str, description: str) -> np.ndarray:
        """Generate a combined embedding using both title and description."""
        combined_text = f"{title} {description}".strip()
        return self.generate_embedding(combined_text)

    def get_embedding_dimension(self) -> int:
        """Get dimension of current model."""
        return self.model.get_sentence_embedding_dimension() if self.model else 0


_embedding_service = EmbeddingService()


def get_embedding_service() -> EmbeddingService:
    return _embedding_service


def get_model() -> SentenceTransformer:
    return _embedding_service.get_model()


def generate_embedding(text: str) -> np.ndarray:
    return _embedding_service.generate_embedding(text)


def generate_combined_embedding(title: str, description: str) -> np.ndarray:
    return _embedding_service.generate_combined_embedding(title, description)
