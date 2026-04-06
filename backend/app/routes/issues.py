from fastapi import APIRouter

router = APIRouter()

# Placeholder for future implementation
@router.get("/")
async def get_all_issues():
    return {"message": "Issues endpoint"}
