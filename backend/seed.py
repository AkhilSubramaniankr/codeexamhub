import asyncio
import uuid
from datetime import datetime, timedelta
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from database import engine, Base, AsyncSessionLocal
from models import User, Exam, Question, TestCase, ExamAssignment, exam_question_association

async def seed_data():
    print("Starting database seeding...")
    
    # 1. Create tables in PostgreSQL
    async with engine.begin() as conn:
        print("Creating tables if they don't exist...")
        await conn.run_sync(Base.metadata.create_all)
        print("Tables created successfully!")

    # 2. Seed data
    async with AsyncSessionLocal() as session:
        # Check if users already exist
        result = await session.execute(select(User).filter(User.email == "student@example.com"))
        student = result.scalars().first()
        
        if not student:
            print("Creating test users...")
            student = User(
                id=uuid.uuid4(),
                email="student@example.com",
                name="Jane Student",
                role="student"
            )
            admin = User(
                id=uuid.uuid4(),
                email="admin@example.com",
                name="Alex Admin",
                role="admin"
            )
            session.add_all([student, admin])
            await session.commit()
            print("Test users created!")
        else:
            print("Test users already exist.")

        # Check if exam already exists
        result = await session.execute(select(Exam).filter(Exam.title == "Python Programming Basics Exam"))
        exam = result.scalars().first()
        
        if not exam:
            print("Creating sample exam...")
            exam = Exam(
                id=uuid.uuid4(),
                title="Python Programming Basics Exam",
                description="This exam assesses your understanding of basic Python algorithms and data structures. You are required to implement the functions according to the problem descriptions.",
                duration_minutes=60,
                is_active=True,
                start_time=datetime.utcnow() - timedelta(hours=1),
                end_time=datetime.utcnow() + timedelta(days=7)
            )
            session.add(exam)
            await session.commit()
            print("Sample exam created!")
        else:
            print("Sample exam already exists.")

        # Create questions
        result = await session.execute(select(Question).filter(Question.title == "Two Sum"))
        q1 = result.scalars().first()
        
        if not q1:
            print("Creating Question 1: Two Sum...")
            q1 = Question(
                id=uuid.uuid4(),
                title="Two Sum",
                description="Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have *exactly one solution*, and you may not use the same element twice.\n\nYou can return the answer in any order.\n\n### Examples\n\n**Example 1:**\n* Input: `nums = [2,7,11,15]`, `target = 9`\n* Output: `[0,1]`\n* Explanation: Because `nums[0] + nums[1] == 9`, we return `[0, 1]`.\n\n**Example 2:**\n* Input: `nums = [3,2,4]`, `target = 6`\n* Output: `[1,2]`",
                constraints="* `2 <= nums.length <= 10^3`\n* `-10^9 <= nums[i] <= 10^9`\n* `-10^9 <= target <= 10^9`\n* Only one valid answer exists.",
                entry_point="two_sum",
                difficulty="easy",
                points=50
            )
            session.add(q1)
            await session.commit()
            
            # Add test cases
            print("Adding test cases for Two Sum...")
            tcs = [
                # Visible Test Cases
                TestCase(question_id=q1.id, input="[[2, 7, 11, 15], 9]", expected_output="[0, 1]", is_hidden=False),
                TestCase(question_id=q1.id, input="[[3, 2, 4], 6]", expected_output="[1, 2]", is_hidden=False),
                TestCase(question_id=q1.id, input="[[3, 3], 6]", expected_output="[0, 1]", is_hidden=False),
                # Hidden Test Cases
                TestCase(question_id=q1.id, input="[[5, 25, 75, 100], 125]", expected_output="[1, 3]", is_hidden=True),
                TestCase(question_id=q1.id, input="[[1, 3, 4, 2], 6]", expected_output="[2, 3]", is_hidden=True),
                TestCase(question_id=q1.id, input="[[-1, -2, -3, -4, -5], -8]", expected_output="[2, 4]", is_hidden=True),
                TestCase(question_id=q1.id, input="[[0, 4, 3, 0], 0]", expected_output="[0, 3]", is_hidden=True),
            ]
            session.add_all(tcs)
            await session.commit()
            print("Two Sum test cases added!")
        else:
            print("Question 1 already exists.")

        result = await session.execute(select(Question).filter(Question.title == "Valid Parentheses"))
        q2 = result.scalars().first()
        
        if not q2:
            print("Creating Question 2: Valid Parentheses...")
            q2 = Question(
                id=uuid.uuid4(),
                title="Valid Parentheses",
                description="Given a string `s` containing just the characters `'('`, `')'`, `'{'`, `'}'`, `'['` and `']'`, determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.\n\n### Examples\n\n**Example 1:**\n* Input: `s = \"()\"`\n* Output: `true`\n\n**Example 2:**\n* Input: `s = \"()[]{}\"`\n* Output: `true`\n\n**Example 3:**\n* Input: `s = \"(]\"`\n* Output: `false`",
                constraints="* `1 <= s.length <= 10^4`\n* `s` consists of parentheses only `'()[]{}'`",
                entry_point="is_valid",
                difficulty="medium",
                points=50
            )
            session.add(q2)
            await session.commit()
            
            # Add test cases
            print("Adding test cases for Valid Parentheses...")
            tcs = [
                # Visible Test Cases
                TestCase(question_id=q2.id, input='["()"]', expected_output="true", is_hidden=False),
                TestCase(question_id=q2.id, input='["()[]{}"]', expected_output="true", is_hidden=False),
                TestCase(question_id=q2.id, input='["(]"]', expected_output="false", is_hidden=False),
                # Hidden Test Cases
                TestCase(question_id=q2.id, input='["([)]"]', expected_output="false", is_hidden=True),
                TestCase(question_id=q2.id, input='["{[]}"]', expected_output="true", is_hidden=True),
                TestCase(question_id=q2.id, input='[""]', expected_output="true", is_hidden=True),
                TestCase(question_id=q2.id, input='["["]', expected_output="false", is_hidden=True),
                TestCase(question_id=q2.id, input='["]"]', expected_output="false", is_hidden=True),
            ]
            session.add_all(tcs)
            await session.commit()
            print("Valid Parentheses test cases added!")
        else:
            print("Question 2 already exists.")

        # Link questions to exam if not already done
        # Re-fetch exam, q1, q2 to ensure valid sessions
        result = await session.execute(select(Exam).filter(Exam.title == "Python Programming Basics Exam"))
        exam = result.scalars().first()
        result = await session.execute(select(Question).filter(Question.title == "Two Sum"))
        q1 = result.scalars().first()
        result = await session.execute(select(Question).filter(Question.title == "Valid Parentheses"))
        q2 = result.scalars().first()

        # Check association
        result = await session.execute(
            select(exam_question_association).filter(
                exam_question_association.c.exam_id == exam.id
            )
        )
        existing_associations = result.all()
        
        if not existing_associations:
            print("Linking questions to exam...")
            # We can insert using Table object
            await session.execute(
                exam_question_association.insert().values(
                    [
                        {"exam_id": exam.id, "question_id": q1.id, "order": 1},
                        {"exam_id": exam.id, "question_id": q2.id, "order": 2}
                    ]
                )
            )
            await session.commit()
            print("Questions linked to exam!")
        else:
            print("Questions already linked to exam.")

        # Create exam assignment for the student
        result = await session.execute(select(User).filter(User.email == "student@example.com"))
        student = result.scalars().first()
        
        result = await session.execute(
            select(ExamAssignment).filter(
                ExamAssignment.exam_id == exam.id,
                ExamAssignment.user_id == student.id
            )
        )
        assignment = result.scalars().first()
        
        if not assignment:
            print("Assigning exam to student...")
            assignment = ExamAssignment(
                id=uuid.uuid4(),
                exam_id=exam.id,
                user_id=student.id,
                status="assigned",
                score=None,
                started_at=None,
                submitted_at=None
            )
            session.add(assignment)
            await session.commit()
            print("Exam assigned to student successfully!")
        else:
            print("Exam already assigned to student.")
            
    print("Database seeding completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed_data())
