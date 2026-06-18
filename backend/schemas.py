import uuid
from datetime import datetime
from typing import List, Optional, Dict
from pydantic import BaseModel, EmailStr

# Auth Schemas
class EmailLoginRequest(BaseModel):
    email: EmailStr

class VerifyTokenRequest(BaseModel):
    token: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    name: Optional[str] = None
    role: str

    class Config:
        from_attributes = True

# TestCase Schemas
class TestCaseResponse(BaseModel):
    id: uuid.UUID
    input: str
    expected_output: str

    class Config:
        from_attributes = True

# Question Schemas
class QuestionResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: str
    constraints: Optional[str] = None
    entry_point: str
    difficulty: str
    points: int
    test_cases: List[TestCaseResponse]
    saved_code: Optional[str] = None

    class Config:
        from_attributes = True

# Exam Schemas
class ExamListResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: Optional[str] = None
    duration_minutes: int
    status: str # assigned, started, submitted, expired
    score: Optional[int] = None
    started_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ExamDetailResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: Optional[str] = None
    duration_minutes: int
    status: str
    started_at: Optional[datetime] = None
    time_remaining_seconds: int
    questions: List[QuestionResponse]

    class Config:
        from_attributes = True

# Code Save Schemas
class SaveSnapshotRequest(BaseModel):
    question_id: uuid.UUID
    code: str

# Code Execution Schemas
class RunCodeRequest(BaseModel):
    question_id: uuid.UUID
    code: str

class TestCaseResultResponse(BaseModel):
    test_case_id: Optional[uuid.UUID] = None
    input: str
    expected_output: str
    actual_output: Optional[str] = None
    stdout: Optional[str] = None
    error: Optional[str] = None
    passed: bool
    is_hidden: bool = False
    time_taken_seconds: float = 0.0

class RunCodeResponse(BaseModel):
    results: List[TestCaseResultResponse]
    summary: str

class QuestionResultResponse(BaseModel):
    question_id: uuid.UUID
    title: str
    points_earned: int
    max_points: int
    test_cases: List[TestCaseResultResponse]

class ExamResultResponse(BaseModel):
    exam_id: uuid.UUID
    assignment_id: uuid.UUID
    status: str
    total_score: int
    max_score: int
    submitted_at: Optional[datetime] = None
    questions: List[QuestionResultResponse]
