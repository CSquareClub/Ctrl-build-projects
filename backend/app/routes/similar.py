from fastapi import APIRouter

from app.config import settings as config
from app.services.embedding_service import get_embedding_service
from app.services.vector_service import VectorService

router = APIRouter()
embedding_service = get_embedding_service()
vector_service = VectorService(config.FAISS_INDEX_PATH, embedding_service=embedding_service)

# Placeholder for future implementation
@router.get("/")
async def get_similar_issues():
    return {"message": "Similar issues endpoint"}
