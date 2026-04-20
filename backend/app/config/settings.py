from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = BACKEND_ROOT / "data"
FAISS_INDEX_PATH = str(DATA_DIR / "faiss_index.index")
