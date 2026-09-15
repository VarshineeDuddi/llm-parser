from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import documents, query, users

app = FastAPI(title="Document Parser")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents.router)
app.include_router(query.router)
app.include_router(users.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
