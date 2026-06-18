from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, exams, run
from config import settings

app = FastAPI(
    title="CodeExamHub API",
    description="Online Coding Exam Portal API",
    version="1.0.0"
)

# Setup CORS
origins = [
    settings.FRONTEND_URL,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router)
app.include_router(exams.router)
app.include_router(run.router)

@app.get("/")
async def root():
    return {
        "message": "Welcome to CodeExamHub API",
        "status": "healthy",
        "docs_url": "/docs"
    }
