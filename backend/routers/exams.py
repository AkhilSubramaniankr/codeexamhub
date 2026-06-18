import uuid
from datetime import datetime, timezone, timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db, get_mongo_db
from models import User, Exam, Question, TestCase, ExamAssignment, exam_question_association
from schemas import ExamListResponse, ExamDetailResponse, SaveSnapshotRequest, ExamResultResponse, QuestionResultResponse, TestCaseResultResponse
from auth_utils import get_current_user
from services.sandbox import execute_test_cases

router = APIRouter(prefix="/api/exams", tags=["exams"])

@router.get("", response_model=List[ExamListResponse])
async def list_assigned_exams(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Query assignments for the user joined with Exam
    query = (
        select(ExamAssignment)
        .options(selectinload(ExamAssignment.exam))
        .filter(ExamAssignment.user_id == current_user.id)
    )
    result = await db.execute(query)
    assignments = result.scalars().all()
    
    response = []
    for a in assignments:
        # Check if exam duration expired while user was away
        if a.status == "started" and a.started_at:
            elapsed = (datetime.utcnow() - a.started_at).total_seconds()
            if elapsed > (a.exam.duration_minutes * 60):
                a.status = "expired"
                a.submitted_at = a.started_at + timedelta(minutes=a.exam.duration_minutes)
                await db.commit()
                
        response.append(
            ExamListResponse(
                id=a.exam.id,
                title=a.exam.title,
                description=a.exam.description,
                duration_minutes=a.exam.duration_minutes,
                status=a.status,
                score=a.score,
                started_at=a.started_at,
                submitted_at=a.submitted_at
            )
        )
    return response

@router.post("/{id}/start")
async def start_exam(
    id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Find assignment
    query = select(ExamAssignment).filter(
        ExamAssignment.exam_id == id,
        ExamAssignment.user_id == current_user.id
    )
    result = await db.execute(query)
    assignment = result.scalars().first()
    
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No assignment found for this exam."
        )
        
    if assignment.status == "assigned":
        assignment.status = "started"
        assignment.started_at = datetime.utcnow()
        await db.commit()
    elif assignment.status in ["submitted", "expired"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Exam has already been submitted or has expired."
        )
        
    return {"message": "Exam started successfully", "started_at": assignment.started_at}

@router.get("/{id}", response_model=ExamDetailResponse)
async def get_exam_details(
    id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    mongo_db = Depends(get_mongo_db)
):
    # Get assignment and check status
    query = select(ExamAssignment).options(selectinload(ExamAssignment.exam)).filter(
        ExamAssignment.exam_id == id,
        ExamAssignment.user_id == current_user.id
    )
    result = await db.execute(query)
    assignment = result.scalars().first()
    
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No assignment found for this exam."
        )
        
    # Check if timer expired
    now = datetime.utcnow()
    duration_seconds = assignment.exam.duration_minutes * 60
    
    if assignment.status == "started" and assignment.started_at:
        elapsed_seconds = (now - assignment.started_at).total_seconds()
        if elapsed_seconds >= duration_seconds:
            assignment.status = "expired"
            assignment.submitted_at = assignment.started_at + timedelta(minutes=assignment.exam.duration_minutes)
            await db.commit()
            
    if assignment.status != "started":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Cannot view exam in status '{assignment.status}'."
        )
        
    # Calculate remaining time
    elapsed_seconds = (now - assignment.started_at).total_seconds()
    time_remaining_seconds = int(max(0, duration_seconds - elapsed_seconds))
    
    # Load questions and their test cases
    q_query = (
        select(Question)
        .join(exam_question_association)
        .filter(exam_question_association.c.exam_id == id)
        .order_by(exam_question_association.c.order)
    )
    q_result = await db.execute(q_query)
    questions = q_result.scalars().all()
    
    # Populate visible test cases and saved snapshots for each question
    questions_response = []
    snapshots_collection = mongo_db["snapshots"]
    
    for q in questions:
        tc_query = select(TestCase).filter(
            TestCase.question_id == q.id,
            TestCase.is_hidden == False
        )
        tc_result = await db.execute(tc_query)
        visible_tcs = tc_result.scalars().all()
        
        q.test_cases = visible_tcs
        
        # Load snapshot if exists
        snapshot = await snapshots_collection.find_one({
            "assignment_id": str(assignment.id),
            "question_id": str(q.id)
        })
        q.saved_code = snapshot.get("code") if snapshot else None
        
        questions_response.append(q)
        
    return ExamDetailResponse(
        id=assignment.exam.id,
        title=assignment.exam.title,
        description=assignment.exam.description,
        duration_minutes=assignment.exam.duration_minutes,
        status=assignment.status,
        started_at=assignment.started_at,
        time_remaining_seconds=time_remaining_seconds,
        questions=questions_response
    )

@router.post("/{id}/snapshot")
async def save_code_snapshot(
    id: uuid.UUID,
    req: SaveSnapshotRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    mongo_db = Depends(get_mongo_db)
):
    # Verify assignment is active
    query = select(ExamAssignment).filter(
        ExamAssignment.exam_id == id,
        ExamAssignment.user_id == current_user.id
    )
    result = await db.execute(query)
    assignment = result.scalars().first()
    
    if not assignment or assignment.status != "started":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot save code snapshot. Exam is not in progress."
        )
        
    # Save/Upsert snapshot in MongoDB
    snapshots_collection = mongo_db["snapshots"]
    
    await snapshots_collection.update_one(
        {
            "assignment_id": str(assignment.id),
            "question_id": str(req.question_id)
        },
        {
            "$set": {
                "code": req.code,
                "updated_at": datetime.utcnow()
            }
        },
        upsert=True
    )
    
    # Also log historical snapshots for playback capability (optional, but good practice)
    snapshots_history = mongo_db["snapshots_history"]
    await snapshots_history.insert_one({
        "assignment_id": str(assignment.id),
        "question_id": str(req.question_id),
        "code": req.code,
        "timestamp": datetime.utcnow()
    })
    
    return {"status": "saved"}

@router.post("/{id}/submit", response_model=ExamResultResponse)
async def submit_exam(
    id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    mongo_db = Depends(get_mongo_db)
):
    # 1. Fetch the exam assignment joined with the Exam
    query = (
        select(ExamAssignment)
        .options(selectinload(ExamAssignment.exam))
        .filter(ExamAssignment.exam_id == id, ExamAssignment.user_id == current_user.id)
    )
    result = await db.execute(query)
    assignment = result.scalars().first()
    
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found for this exam."
        )
        
    if assignment.status in ["submitted", "expired"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Exam has already been submitted or has expired."
        )
        
    # 2. Transition assignment to submitted
    now = datetime.utcnow()
    assignment.status = "submitted"
    assignment.submitted_at = now
    
    # 3. Retrieve all questions for this exam
    q_query = (
        select(Question)
        .join(exam_question_association)
        .filter(exam_question_association.c.exam_id == id)
        .order_by(exam_question_association.c.order)
    )
    q_result = await db.execute(q_query)
    questions = q_result.scalars().all()
    
    # 4. Process each question
    snapshots_collection = mongo_db["snapshots"]
    submissions_collection = mongo_db["submissions"]
    
    questions_results = []
    total_score = 0
    max_score = 0
    
    for q in questions:
        # Get latest snapshot code for this question
        snapshot = await snapshots_collection.find_one({
            "assignment_id": str(assignment.id),
            "question_id": str(q.id)
        })
        student_code = snapshot.get("code", "") if snapshot else ""
        
        # Load all test cases (both visible and hidden)
        tc_query = select(TestCase).filter(TestCase.question_id == q.id)
        tc_result = await db.execute(tc_query)
        test_cases = tc_result.scalars().all()
        
        # Run tests
        results = []
        if test_cases and student_code.strip():
            results = await execute_test_cases(student_code, q.entry_point, test_cases)
        else:
            # If no code submitted or no test cases, create failed mock results
            for tc in test_cases:
                results.append(
                    TestCaseResultResponse(
                        test_case_id=tc.id,
                        input=tc.input,
                        expected_output=tc.expected_output,
                        actual_output=None,
                        stdout=None,
                        error="No code submitted." if not student_code.strip() else "No test cases found.",
                        passed=False,
                        is_hidden=tc.is_hidden,
                        time_taken_seconds=0.0
                    )
                )
                
        # Calculate scores
        passed_count = sum(1 for r in results if r.passed)
        total_test_cases = len(test_cases)
        
        if total_test_cases > 0:
            points_earned = int(q.points * (passed_count / total_test_cases))
        else:
            points_earned = 0
            
        total_score += points_earned
        max_score += q.points
        
        # Save submission details in MongoDB
        await submissions_collection.update_one(
            {
                "assignment_id": str(assignment.id),
                "question_id": str(q.id)
            },
            {
                "$set": {
                    "code": student_code,
                    "points_earned": points_earned,
                    "max_points": q.points,
                    "passed_count": passed_count,
                    "total_test_cases": total_test_cases,
                    "test_cases_results": [r.dict() for r in results],
                    "submitted_at": now
                }
            },
            upsert=True
        )
        
        questions_results.append(
            QuestionResultResponse(
                question_id=q.id,
                title=q.title,
                points_earned=points_earned,
                max_points=q.points,
                test_cases=results
            )
        )
        
    # 5. Save the final overall score to postgres
    assignment.score = total_score
    await db.commit()
    
    return ExamResultResponse(
        exam_id=assignment.exam.id,
        assignment_id=assignment.id,
        status=assignment.status,
        total_score=total_score,
        max_score=max_score,
        submitted_at=assignment.submitted_at,
        questions=questions_results
    )

@router.get("/{id}/results", response_model=ExamResultResponse)
async def get_exam_results(
    id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    mongo_db = Depends(get_mongo_db)
):
    # 1. Fetch the exam assignment joined with Exam
    query = (
        select(ExamAssignment)
        .options(selectinload(ExamAssignment.exam))
        .filter(ExamAssignment.exam_id == id, ExamAssignment.user_id == current_user.id)
    )
    result = await db.execute(query)
    assignment = result.scalars().first()
    
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found for this exam."
        )
        
    # User can only view results of submitted/expired exams
    if assignment.status not in ["submitted", "expired"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Results are not available. The exam has not been submitted yet."
        )
        
    # 2. Retrieve questions
    q_query = (
        select(Question)
        .join(exam_question_association)
        .filter(exam_question_association.c.exam_id == id)
        .order_by(exam_question_association.c.order)
    )
    q_result = await db.execute(q_query)
    questions = q_result.scalars().all()
    
    submissions_collection = mongo_db["submissions"]
    questions_results = []
    max_score = 0
    
    for q in questions:
        max_score += q.points
        
        # Load submission details from MongoDB
        submission = await submissions_collection.find_one({
            "assignment_id": str(assignment.id),
            "question_id": str(q.id)
        })
        
        test_cases_results = []
        points_earned = 0
        
        if submission:
            points_earned = submission.get("points_earned", 0)
            raw_tcs = submission.get("test_cases_results", [])
            for r in raw_tcs:
                # Security detail: omit stdout/actual output/errors for hidden test cases
                is_hidden = r.get("is_hidden", False)
                test_cases_results.append(
                    TestCaseResultResponse(
                        test_case_id=uuid.UUID(r["test_case_id"]) if r.get("test_case_id") else None,
                        input=r["input"] if not is_hidden else "Hidden input",
                        expected_output=r["expected_output"] if not is_hidden else "Hidden output",
                        actual_output=r["actual_output"] if not is_hidden else None,
                        stdout=r.get("stdout") if not is_hidden else None,
                        error=r.get("error") if not is_hidden else ("Incorrect solution" if not r["passed"] else None),
                        passed=r["passed"],
                        is_hidden=is_hidden,
                        time_taken_seconds=r.get("time_taken_seconds", 0.0)
                    )
                )
                
        questions_results.append(
            QuestionResultResponse(
                question_id=q.id,
                title=q.title,
                points_earned=points_earned,
                max_points=q.points,
                test_cases=test_cases_results
            )
        )
        
    return ExamResultResponse(
        exam_id=assignment.exam.id,
        assignment_id=assignment.id,
        status=assignment.status,
        total_score=assignment.score if assignment.score is not None else 0,
        max_score=max_score,
        submitted_at=assignment.submitted_at,
        questions=questions_results
    )

