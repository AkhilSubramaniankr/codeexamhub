import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Question, TestCase
from schemas import RunCodeRequest, RunCodeResponse
from auth_utils import get_current_user
from services.sandbox import execute_test_cases

router = APIRouter(prefix="/api/run", tags=["run"])

@router.post("", response_model=RunCodeResponse)
async def run_code(
    req: RunCodeRequest,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # 1. Fetch question details
    result = await db.execute(select(Question).filter(Question.id == req.question_id))
    question = result.scalars().first()
    
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found."
        )
        
    # 2. Fetch visible test cases
    tc_result = await db.execute(
        select(TestCase).filter(
            TestCase.question_id == question.id,
            TestCase.is_hidden == False
        )
    )
    visible_test_cases = tc_result.scalars().all()
    
    if not visible_test_cases:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No visible test cases available for this question."
        )
        
    # 3. Execute
    results = await execute_test_cases(req.code, question.entry_point, visible_test_cases)
    
    # Calculate summary
    passed_count = sum(1 for r in results if r.passed)
    total_count = len(results)
    summary = f"{passed_count}/{total_count} test cases passed."
    
    return RunCodeResponse(results=results, summary=summary)
