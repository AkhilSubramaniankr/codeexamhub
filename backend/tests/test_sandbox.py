import asyncio
import pytest
import sys
import os
import uuid

# Add backend directory to path so we can import sandbox
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.sandbox import execute_test_cases
from models import TestCase

# Create a mock TestCase model for testing
class MockTestCase:
    def __init__(self, id, input_str, expected_output, is_hidden=False):
        self.id = id
        self.input = input_str
        self.expected_output = expected_output
        self.is_hidden = is_hidden

@pytest.mark.asyncio
async def test_sandbox_correct_code():
    # Code that solves Two Sum
    code = """
def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        diff = target - num
        if diff in seen:
            return [seen[diff], i]
        seen[num] = i
    return []
"""
    test_cases = [
        MockTestCase(id=uuid.uuid4(), input_str="[[2, 7, 11, 15], 9]", expected_output="[0, 1]"),
        MockTestCase(id=uuid.uuid4(), input_str="[[3, 2, 4], 6]", expected_output="[1, 2]")
    ]
    
    results = await execute_test_cases(code, "two_sum", test_cases)
    
    assert len(results) == 2
    assert results[0].passed is True
    assert results[0].actual_output == "[0, 1]"
    assert results[1].passed is True
    assert results[1].actual_output == "[1, 2]"

@pytest.mark.asyncio
async def test_sandbox_incorrect_code():
    code = """
def two_sum(nums, target):
    return [0, 0] # Always incorrect
"""
    test_cases = [
        MockTestCase(id=uuid.uuid4(), input_str="[[2, 7, 11, 15], 9]", expected_output="[0, 1]")
    ]
    
    results = await execute_test_cases(code, "two_sum", test_cases)
    
    assert len(results) == 1
    assert results[0].passed is False
    assert results[0].actual_output == "[0, 0]"

@pytest.mark.asyncio
async def test_sandbox_syntax_error():
    code = """
def two_sum(nums, target):
    return [0, 0
"""  # Missing bracket
    test_cases = [
        MockTestCase(id=uuid.uuid4(), input_str="[[2, 7, 11, 15], 9]", expected_output="[0, 1]")
    ]
    
    results = await execute_test_cases(code, "two_sum", test_cases)
    
    assert len(results) == 1
    assert results[0].passed is False
    assert "SyntaxError" in results[0].error

@pytest.mark.asyncio
async def test_sandbox_infinite_loop_timeout():
    code = """
def two_sum(nums, target):
    while True:
        pass
"""  # Infinite loop
    test_cases = [
        MockTestCase(id=uuid.uuid4(), input_str="[[2, 7, 11, 15], 9]", expected_output="[0, 1]")
    ]
    
    results = await execute_test_cases(code, "two_sum", test_cases)
    
    assert len(results) == 1
    assert results[0].passed is False
    assert "TIMEOUT" in results[0].error

